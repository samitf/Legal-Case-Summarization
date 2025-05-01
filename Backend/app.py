# ----------------- BACKEND (app.py) -----------------

from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import AutoTokenizer, AutoModel, BartForConditionalGeneration
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
import nltk
import tempfile
import fitz
import re
import os
from nltk.tokenize import sent_tokenize
from datetime import datetime
from huggingface_hub import login

# login("YOUR TOKEN")

nltk.download("punkt")
nltk.download("punkt_tab")

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
bert_model = AutoModel.from_pretrained("law-ai/InLegalBERT").to(device)
bert_tokenizer = AutoTokenizer.from_pretrained("law-ai/InLegalBERT")

bart_model = BartForConditionalGeneration.from_pretrained(
    "YOUR_PATH"
)
bart_model = bart_model.to(device)
bart_tokenizer = AutoTokenizer.from_pretrained(
    "YOUR_PATH"
)

with open(
    "bns.json", "r", encoding="utf-8"
) as file:
    ipc_data = json.load(file)

import requests
from concurrent.futures import ThreadPoolExecutor, as_completed


def get_analysis(text_chunk):
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": "Bearer YOUR_AUTH_KEY",
                "Content-Type": "application/json",
            },
            data=json.dumps(
                {
                    "model": "deepseek/deepseek-r1-zero:free",
                    "messages": [
                        {
                            "role": "user",
                            "content": f"""Summarize this legal text in plain English and include the following sections:
- Background
- Evidence
- Judgment
- Precedent Case
- Important Sections
- Case Outcome (in one sentence)
Text:
{text_chunk}""",
                        }
                    ],
                }
            ),
        )

        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            return f"Error {response.status_code}: {response.text}"

    except Exception as e:
        return f"Failed: {e}"


def process_parallel(chunks):
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {
            executor.submit(get_analysis, chunk): chunk for chunk in chunks
        }
        return [f.result() for f in as_completed(futures)]


def chunk_text(text, words_per_chunk=1700):
    words = text.split()
    return [
        " ".join(words[i : i + words_per_chunk])
        for i in range(0, len(words), words_per_chunk)
    ]


def combine_chunks(chunks, group_size=4):
    return [
        " ".join(chunks[i : i + group_size])
        for i in range(0, len(chunks), group_size)
    ]


def analyze_with_deepseek(text):
    chunks = chunk_text(text)
    combined = combine_chunks(chunks)
    results = process_parallel(combined)
    return "\n\n".join(results)


def extract_text_from_pdf(pdf_path):
    try:
        doc = fitz.open(pdf_path)
        return "\n".join(page.get_text("text") for page in doc).strip()
    except Exception as e:
        return f"Error reading PDF: {e}"


def preprocess_text(text):
    text = re.sub(
        r"(?m)^Indian Kanoon\s*-\s*http\S+\n\d+\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = text.lower()
    text = re.sub(r"[^\w\s\.\?\!]", " ", text)
    text = re.sub(r"(?m)^.*?vs.*?$", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_sentences(sentences):
    return [s for s in sentences if len(s.split()) >= 8]


def get_embeddings_batch(sentences):
    inputs = bert_tokenizer(
        sentences,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
    ).to(device)
    with torch.no_grad():
        outputs = bert_model(**inputs)
    return outputs.last_hidden_state.mean(dim=1).cpu().numpy()


def clean_summary(summary):
    summary = summary.strip()
    if not summary.endswith("."):
        last_period = summary.rfind(".")
        summary = (
            summary[: last_period + 1] if last_period != -1 else summary + "."
        )
    return summary


def extract_ipc_sections(text):
    """Extract IPC sections mentioned in the document, handling multiple formats."""
    ipc_mentions = {}
    text_lower = (
        text.lower()
    )

    section_pattern = (
        r"(?<!sub-)(?<!sub)(?:sections?|sec\.?|sec)\.?\s*([\d,\s/&andor]+)"
    )
    matches = re.findall(section_pattern, text_lower)

    section_numbers = set()
    for match in matches:
        cleaned_match = re.sub(
            r"[&/]", ",", match
        )
        sections = re.split(
            r"[, ]+| and | or ", cleaned_match
        )

        for sec in sections:
            sec = sec.strip()
            if sec.isdigit(): 
                section_numbers.add(sec)

    for section_number in section_numbers:
        for section in ipc_data:
            if str(section["Section"]) == section_number:
                ipc_mentions[section_number] = {
                    "title": section["section_title"],
                    "bns": section["BNS_Section"],
                    "description": section["section_desc"],
                }

    return ipc_mentions


def extract_case_details(text):
    """Extracts key case details from the first 50 lines."""
    details = {}
    text = "\n".join(text.split("\n")[:50])

    case_no_match = re.search(
        r"(?i)(?:case\s*no\.?|criminal\s*appeal\s*no\.?)\s*[:\s]+([\w\s()./-]+)",
        text,
    )
    if case_no_match:
        case_number = case_no_match.group(1).strip()
        match = re.match(r"(.+?\s+of\s+\d{4})(\s*\(.*)?", case_number)
        if match:
            details["Case Number"] = match.group(1).strip() + (
                match.group(2) if match.group(2) else ""
            )

    date_match = re.search(
        r"(?i)DATE OF JUDGMENT:\s*([\d]{1,2})\s*\n?\s*([\w]+),?\s*\n?\s*(\d{4})",
        text,
    )
    if not date_match:
        date_match = re.search(
            r"(?i)on\s+(\d{1,2})\s+([\w]+),?\s*(\d{4})", text
        )
    if date_match:
        details["Date of Judgment"] = (
            f"{date_match.group(1)} {date_match.group(2)}, {date_match.group(3)}"
        )

    title_match = re.search(
        r"(?m)^(.+?)\s+(?:vs\.?|VERSUS)\s+(.+)$", text, re.IGNORECASE
    )
    if title_match:
        details["Appellant"] = title_match.group(1).strip()
        respondent = title_match.group(2).strip()
        respondent = re.sub(
            r"\s*(?:\.\.\.\s*)?on(\s+\d{1,2}.*)?$",
            "",
            respondent,
            flags=re.IGNORECASE,
        )
        details["Respondent"] = respondent

    bench_match = re.search(
        r"(?i)Bench\s*[:\s]+([\w.,\s]+?)(?=\s+Reportable|\s+PETITIONER|\n|$)",
        text,
    )
    if bench_match:
        details["Bench"] = bench_match.group(1).strip()

    date_patterns = [
        r"(\d{1,2}/\d{1,2}/\d{4})",
        r"(\d{1,2}-\d{1,2}-\d{4})",
        r"(\d{1,2}\.\d{1,2}\.\d{4})",
        r"(\d{1,2}\s+\w+,\s+\d{4})",
    ]
    extracted_dates = [
        date for pattern in date_patterns for date in re.findall(pattern, text)
    ]

    unique_dates = set()
    for date in extracted_dates:
        for fmt in ["%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d %B, %Y"]:
            try:
                unique_dates.add(
                    datetime.strptime(date, fmt).strftime("%d %B, %Y")
                )
                break
            except ValueError:
                continue

    if unique_dates:
        details["Important Dates"] = ", ".join(sorted(unique_dates))

    return details

def extractive_summary(chunk, summary_length):
    embeddings = get_embeddings_batch(chunk)
    sim_matrix = cosine_similarity(embeddings)
    scores = sim_matrix.sum(axis=1)
    top_indices = np.argsort(scores)[-summary_length:][
        ::-1
    ]
    top_sents = [chunk[i] for i in sorted(top_indices)]
    return " ".join(top_sents)

def abstractive_summary(
    extractive_summary, chunk_summary_max, chunk_summary_min
):
    inputs = bart_tokenizer(
        extractive_summary,
        return_tensors="pt",
        truncation=True,
        max_length=1024,
    ).to(device)
    summary_ids = bart_model.generate(
        **inputs,
        max_length=chunk_summary_max,
        min_length=chunk_summary_min,
        num_beams=4,
        length_penalty=2.0,
        no_repeat_ngram_size=3,
        repetition_penalty=1.2,
        early_stopping=True,
    )
    return bart_tokenizer.decode(summary_ids[0], skip_special_tokens=True)

def hybrid_summary(chunk, chunk_summary_max, chunk_summary_min):
    extractive = extractive_summary(
        chunk, summary_length=2
    )
    return abstractive_summary(
        extractive, chunk_summary_max, chunk_summary_min
    )

@app.route("/extract", methods=["POST"])
def extract():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    text = extract_text_from_pdf(file_path)
    if text.startswith("Error"):
        return jsonify({"error": text}), 500

    return jsonify(extract_case_details(text))

@app.route("/summarize", methods=["POST"])
def summarize():
    file = request.files["file"]
    summary_type = request.form.get("summary_type", "abstractive").lower()
    summary_length = request.form.get("summary_length", "concise").lower()

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    text = extract_text_from_pdf(file_path)
    preprocessed_text = preprocess_text(text)
    sentences = sent_tokenize(preprocessed_text)

    if summary_length == "precise":
        chunk_summary_max = 320
        chunk_summary_min = 200
        final_summary_max = 640
        final_summary_min = 400
        extractive_summary_length = 7
    else:
        chunk_summary_max = 160
        chunk_summary_min = 120
        final_summary_max = 320
        final_summary_min = 200
        extractive_summary_length = 5

    if not sentences:
        final_summary = "No valid sentences to summarize."
    else:
        cleaned_sents = clean_sentences(sentences)
        chunk_size = 30
        chunked = [
            cleaned_sents[i : i + chunk_size]
            for i in range(0, len(cleaned_sents), chunk_size)
        ]

        partial_summaries = []

        for chunk in chunked:
            try:
                if summary_type == "extractive":
                    chunk_summary = extractive_summary(
                        chunk, summary_length=extractive_summary_length
                    )
                elif summary_type == "abstractive":
                    chunk_summary = abstractive_summary(
                        " ".join(chunk), chunk_summary_max, chunk_summary_min
                    )
                elif summary_type == "hybrid":
                    chunk_summary = hybrid_summary(
                        chunk, chunk_summary_max, chunk_summary_min
                    )
                else:
                    chunk_summary = ""

                cleaned = clean_summary(chunk_summary)
                partial_summaries.append(cleaned)
            except Exception as e:
                continue

        if not partial_summaries:
            final_summary = "No content could be summarized."
        else:
            combined = " ".join(partial_summaries)
            token_len = len(bart_tokenizer.tokenize(combined))

            if token_len > 800:
                try:
                    compressed_inputs = bart_tokenizer(
                        combined,
                        return_tensors="pt",
                        max_length=1024,
                        truncation=True,
                    ).to(device)
                    compressed_ids = bart_model.generate(
                        **compressed_inputs,
                        max_length=final_summary_max,
                        min_length=final_summary_min,
                        num_beams=6,
                        length_penalty=2.5,
                        no_repeat_ngram_size=4,
                        repetition_penalty=1.5,
                        early_stopping=True,
                    )
                    compressed_summary = bart_tokenizer.decode(
                        compressed_ids[0], skip_special_tokens=True
                    )
                    final_summary = clean_summary(compressed_summary)
                except Exception as e:
                    final_summary = clean_summary(combined)
            else:
                final_summary = clean_summary(combined)

    return jsonify({"summary": final_summary})


@app.route("/sections", methods=["POST"])
def get_sections():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".PDF") as tmp:
            temp_path = tmp.name
            file.save(temp_path)

        raw_text = extract_text_from_pdf(temp_path)
        os.remove(temp_path)

    except Exception as e:
        return (
            jsonify({"error": f"Failed to extract text from PDF: {str(e)}"}),
            500,
        )

    if not raw_text.strip():
        return jsonify({"error": "No extractable text found"}), 400

    preprocessed_text = preprocess_text(raw_text)
    ipc_sections = extract_ipc_sections(preprocessed_text)

    return jsonify(
        {"sections": ipc_sections, "total_found": len(ipc_sections)}
    )

@app.route("/analyze", methods=["POST"])
def analyze():
    file = request.files["file"]
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    raw_text = extract_text_from_pdf(file_path)
    preprocessed = preprocess_text(raw_text)

    analysis = analyze_with_deepseek(preprocessed)

    return jsonify({"summary": analysis})

if __name__ == "__main__":
    app.run(debug=True)
