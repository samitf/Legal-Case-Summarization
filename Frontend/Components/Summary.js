import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FaArrowLeft, FaArrowRight, FaExternalLinkAlt, FaDownload } from "react-icons/fa";
import AOS from "aos";
import "aos/dist/aos.css";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function DocumentSummarizer() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileURL, setFileURL] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [extractedDetails, setExtractedDetails] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryProgress, setSummaryProgress] = useState(0);
  const [summaryType, setSummaryType] = useState("extractive");
  const [summaryLength, setSummaryLength] = useState("concise");
  const [extractedSections, setExtractedSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState([]);
  const [activeTab, setActiveTab] = useState("current");
  const [summaryHistory, setSummaryHistory] = useState([]);
  const [analyzedOutput, setAnalyzedOutput] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  

  useEffect(() => {
    AOS.init({ duration: 2000 });
  }, []);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setFileURL(URL.createObjectURL(file));
      setPageNumber(1);
      setExtractedDetails(null);
      setSummary(null);
      setExtractedSections([]);
      await extractDetails(file);
      await extractSections(file);
    }
  };

  const extractDetails = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/extract", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.error) {
        console.error("Error from Flask API:", data.error);
        return;
      }

      const filteredDetails = Object.entries({
        Case_Number: data["Case Number"],
        Date_of_Judgment: data["Date of Judgment"],
        Appellant: data["Appellant"],
        Respondent: data["Respondent"],
        Bench: data["Bench"],
        Important_Dates: data["Important Dates"]
      }).reduce((acc, [key, value]) => {
        if (value && value !== "N/A") acc[key] = value;
        return acc;
      }, {});

      setExtractedDetails(filteredDetails);
    } catch (error) {
      console.error("Error extracting details:", error);
    }
  };

  const extractSections = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const response = await fetch("http://localhost:5000/sections", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      console.log("Sections API Response:", data);  // To confirm that the data is being fetched properly
  
      if (data.error) {
        console.error("Error extracting sections:", data.error);
        return;
      }
  
      const sectionsObj = data.sections || {};
      const sectionsArray = Object.entries(sectionsObj).map(([section_number, sectionData]) => ({
        section_number,
        title: sectionData.title,
        description: sectionData.description,
        bns: sectionData.bns
      }));
  
      setExtractedSections(sectionsArray);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const toggleSection = (index) => {
    setExpandedSections(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  const summarizeDocument = async () => {
    if (!selectedFile) return;
  
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("summary_type", summaryType);
    formData.append("summary_length", summaryLength);
  
    setLoadingSummary(true);
    setSummaryProgress(0);
  
    const progressInterval = setInterval(() => {
      setSummaryProgress((prev) => Math.min(prev + Math.floor(Math.random() * 10 + 5), 95));
    }, 300);
  
    try {
      const response = await fetch("http://localhost:5000/summarize", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      clearInterval(progressInterval);
      setSummaryProgress(100);
  
      if (data.error) {
        console.error("Summarization error:", data.error);
        setSummary({ text: "Failed to generate summary." });
      } else {
        const newSummary = {
          text: data.summary,
          type: summaryType,
          length: summaryLength,
          timestamp: new Date().toLocaleString()
        };
  
        if (summary?.text) {
          setSummaryHistory((prev) => [summary, ...prev]);
        }
  
        setSummary(newSummary);
        setActiveTab("current");
      }
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Summarization failed:", error);
      setSummary({ text: "Failed to generate summary." });
    } finally {
      setLoadingSummary(false);
    }
  };
  
  const analyzeDocument = async () => {
    if (!selectedFile) return;
  
    const formData = new FormData();
    formData.append("file", selectedFile);
  
    setAnalyzing(true);
  
    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      console.log("Analyze API response:", data);
  
      if (data.summary) {
        const parsedSummary = parseSummary(data.summary);
        setAnalyzedOutput(parsedSummary);
      } else {
        console.error("No summary found in response", data);
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
    } finally {
      setAnalyzing(false);
    }
  };
  
  const parseSummary = (summary) => {
    summary = summary.replace(/\\boxed{/, '').replace(/}$/, '');
    summary = summary.replace(/\\n/g, '\n');
  
    const sections = ["Background", "Evidence", "Judgment", "Precedent Case", "Important Sections", "Case Outcome"];
    let parsedSummary = {};
  
    sections.forEach((section, idx) => {
      const nextSection = sections[idx + 1];
  
      const sectionRegex = nextSection
        ? new RegExp(`\\*\\*${section}:\\*\\*\\s*(.*?)\\n\\*\\*${nextSection}:\\*\\*`, "s")
        : new RegExp(`\\*\\*${section}:\\*\\*\\s*(.*)`, "s");
  
      const match = summary.match(sectionRegex);
  
      if (match && match[1]) {
        parsedSummary[section.toLowerCase().replace(/ /g, "_")] = match[1].trim();
      } else {
        parsedSummary[section.toLowerCase().replace(/ /g, "_")] = "No details available";
      }
    });
  
    return parsedSummary;
  };
  
  const toggleESection = (sectionIndex) => {
    setExpandedSections((prev) =>
      prev.includes(sectionIndex)
        ? prev.filter((index) => index !== sectionIndex)
        : [...prev, sectionIndex]
    );
  };
  
  const downloadSummary = () => {
    if (!summary) return;
    const blob = new Blob([summary.text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedFile.name.replace(/\.pdf$/, "")}_summary.txt`;
    link.click();
  };

  const goToPreviousPage = () => pageNumber > 1 && setPageNumber(pageNumber - 1);
  const goToNextPage = () => pageNumber < numPages && setPageNumber(pageNumber + 1);
  const openInNewTab = () => window.open(fileURL, "_blank");

  return (
    <div id="document-summarizer" className="mx-auto max-w-7xl px-6 py-24">
      <h2 className="text-lg leading-7">Analyze your document</h2>
      <p className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Nyaya Analyzer</p>
      <div className="mt-10 flex flex-col items-center gap-4">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="file-input file-input-bordered"
        />
      </div>

      {fileURL && (
        <>
          <div className="mt-10 flex gap-8">
            <button className="btn btn-circle" onClick={openInNewTab}>
              <FaExternalLinkAlt className="w-6 h-6" />
            </button>

            <div className="w-1/2 border rounded-lg p-4 shadow-lg bg-white flex flex-col items-center">
              <Document
                file={fileURL}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                className="flex flex-col items-center"
              >
                <Page pageNumber={pageNumber} width={600} />
              </Document>
              {numPages > 0 && (
                <div className="mt-6 flex justify-center gap-8 items-center">
                  <button className="btn btn-circle" onClick={goToPreviousPage} disabled={pageNumber === 1}>
                    <FaArrowLeft className="w-6 h-6" />
                  </button>
                  <span>Page {pageNumber} of {numPages}</span>
                  <button className="btn btn-circle" onClick={goToNextPage} disabled={pageNumber === numPages}>
                    <FaArrowRight className="w-6 h-6" />
                  </button>
                </div>
              )}
            </div>

            <div className="w-1/2 space-y-6">
              <div className="border rounded-lg p-4 shadow-lg">
                <h3 className="text-xl font-semibold">Extracted Details</h3>
                {extractedDetails && (
                  <ul className="mt-2 space-y-1">
                    {Object.entries(extractedDetails).map(([key, value]) => (
                      <li key={key}><strong>{key.replace(/_/g, " ")}:</strong> {value}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border rounded-lg p-4 shadow-lg">
                <h3 className="text-xl font-semibold mb-4">Summary Options</h3>
                
                {/* Tab for Type of Summary */}
                <div className="flex gap-4 mb-4">
                  <button
                    className={`btn btn-outline ${summaryType === "extractive" ? "btn-active" : ""}`}
                    onClick={() => setSummaryType("extractive")}
                  >
                    Extractive
                  </button>
                  <button
                    className={`btn btn-outline ${summaryType === "abstractive" ? "btn-active" : ""}`}
                    onClick={() => setSummaryType("abstractive")}
                  >
                    Abstractive
                  </button>
                  <button
                    className={`btn btn-outline ${summaryType === "hybrid" ? "btn-active" : ""}`}
                    onClick={() => setSummaryType("hybrid")}
                  >
                    Hybrid
                  </button>
                </div>

                {/* Tab for Length of Summary */}
                <div className="flex gap-4 mb-4">
                  <button
                    className={`btn btn-outline ${summaryLength === "concise" ? "btn-active" : ""}`}
                    onClick={() => setSummaryLength("concise")}
                  >
                    Concise
                  </button>
                  <button
                    className={`btn btn-outline ${summaryLength === "precise" ? "btn-active" : ""}`}
                    onClick={() => setSummaryLength("precise")}
                  >
                    Precise
                  </button>
                </div>

                <button
                  onClick={summarizeDocument}
                  className="btn btn-outline w-full"
                  disabled={loadingSummary}
                >
                  {loadingSummary ? `Summarizing... ${summaryProgress}%` : "Generate Summary"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 border rounded-lg p-6 shadow-lg">
  <div className="flex justify-between items-center mb-2">
    <h3 className="text-xl font-semibold">Summary</h3>
    <div className="flex gap-2">
      <button onClick={downloadSummary} className="btn btn-outline">
        <FaDownload />
      </button>
      <button onClick={() => setActiveTab(activeTab === "history" ? "current" : "history")} className="btn btn-outline">
        History
      </button>
    </div>
  </div>

  {activeTab === "current" ? (
    <p className="text-lg text-justify">{summary ? summary.text : "No summary available"}</p>
  ) : (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {summaryHistory.length > 0 ? (
        summaryHistory.map((item, index) => (
          <div key={index} className="border p-3 rounded">
            <div className="text-sm text-gray-500 mb-1">
              {item.type} - {item.length} ({item.timestamp})
            </div>
            <p className="text-sm text-justify">{item.text}</p>
          </div>
        ))
      ) : (
        <p className="text-lg text-justify">No previous summaries available.</p>
      )}
    </div>
  )}
</div>

<div className="w-full mt-6 flex justify-center">
  <button
    className="btn btn-outline w-full"
    onClick={analyzeDocument}
    disabled={analyzing}
  >
    {analyzing ? "Analyzing..." : "Analyze"}
  </button>
</div>

{analyzing && (
  <div className="w-full flex justify-center mt-4">
    <p className="text-gray-700 text-lg">Analyzing document...</p>
  </div>
)}

{analyzedOutput && (
  <div className="mt-10 border rounded-lg p-6 shadow-lg">
    <h3 className="text-xl font-semibold">Document Analysis:</h3>

    {["Background", "Evidence", "Judgment", "Precedent Case", "Important Sections", "Case Outcome"].map((sectionTitle, index) => {
      const sectionKey = sectionTitle.toLowerCase().replace(" ", "_");

      return (
        <div key={index} className="mt-4">
          <button
            onClick={() => toggleESection(index)}
            className="btn btn-outline w-full flex justify-between items-center px-4 py-2 text-left"
          >
            <span className="font-semibold">{sectionTitle}</span>
            {expandedSections.includes(index) ? (
              <FaChevronUp className="ml-2" />
            ) : (
              <FaChevronDown className="ml-2" />
            )}
          </button>

          {expandedSections.includes(index) && (
            <div
              className="mt-2 text-lg text-gray-700 text-justify leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: (analyzedOutput[sectionKey] || "No details available")
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*(.*?)\*/g, '<em>$1</em>')            
                  .replace(/\n/g, '<br/>'),                     
              }}
            />
          )}
        </div>
      );
    })}
  </div>
)}


          <div className="mt-10 border rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold">Extracted Sections</h3>
            {extractedSections.map((section, index) => (
              <div key={index} className="mt-4">
              <button
                onClick={() => toggleSection(index)}
                className="btn btn-outline flex justify-between w-auto px-2"
              >
                {expandedSections.includes(index) ? (
                  <FaChevronUp />
                ) : (
                  <FaChevronDown />
                )}
                <span>Section {section.section_number}: {section.section_title}</span>
              </button>
              {expandedSections.includes(index) && (
                <div className="mt-2 text-lg">
                  <p><strong>Title:</strong> {section.title}</p>
                  <p><strong>BNS Equivalent:</strong> {section.bns}</p>
                  <p><strong>Description:</strong> {section.description || "No details available"}</p>
                </div>
              )}  
            </div>            
            ))}
          </div>
        </>
      )}
    </div>
  );
}
