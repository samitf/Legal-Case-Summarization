import { useEffect } from "react";
import {
  CircleStackIcon,
  WrenchScrewdriverIcon,
  ComputerDesktopIcon,
  BookOpenIcon,
  ScaleIcon,
} from "@heroicons/react/20/solid";
import AOS from "aos";
import "aos/dist/aos.css";

const features = [
  {
    name: "Model:",
    description: "InLegalBERT and Fine-Tuned BART",
    icon: ComputerDesktopIcon,
  },
  {
    name: "Task:",
    description: "Summarizing Complex Legal Cases & Mapping IPC to BNS",
    icon: WrenchScrewdriverIcon,
  },
  {
    name: "Dataset:",
    description: "7.1k Indian Supreme Court case documents",
    icon: CircleStackIcon,
  },
];

export default function About() {
  useEffect(() => {
    AOS.init({ duration: 2000 });
  }, []);
  return (
    <div
      className="relative isolate overflow-hidden  px-6 py-24 sm:py-32 lg:overflow-visible lg:px-0"
      id="about"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-y-10">
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          <div className="lg:pr-4">
            <div className="lg:max-w-lg">
              <h2 className="text-lg leading-7">Discover More</h2>
              <p className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">
              Legal Document Summarization
              </p>
              <p className="mt-6 text-lg leading-8 text-justify" data-aos="fade-right">
              Our legal assistant leverages state-of-the-art models like InLegalBERT and BART to automatically summarize complex Indian legal documents. 
    It identifies and extracts key facts, highlights relevant IPC sections, and maps them to their equivalent BNS sections. 
    This streamlines legal research, enhances comprehension, and makes navigating legal content faster and more intuitive.
              </p>
            </div>
          </div>
        </div>
        <div
          className="-ml-12 -mt-12 p-12 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:overflow-hidden"
          data-aos="fade-left"
        >
          <img
            className="w-[38rem] ring-2 ring-base-300 max-w-none rounded-xl shadow-xl sm:w-[57rem]"
            src="https://i0.wp.com/www.freethink.com/wp-content/uploads/2025/02/legalai.gif?resize=500,271"
            alt="Legal Document Processing"
          />
        </div>
      </div>
      <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-start lg:gap-y-10">
        <div className="lg:col-span-2 lg:col-start-1 lg:mx-auto lg:grid lg:w-full lg:max-w-7xl lg:gap-x-8 lg:px-8">
          <div className="text-base leading-7">
            <div className="grid gap-x-6 sm:grid-cols-2">
              <div
                className="ring-2 ring-base-300 bg-base-200 rounded-2xl mt-10 p-5 shadow-xl"
                data-aos="zoom-in"
              >
                <BookOpenIcon className="h-5 w-5 mx-auto" aria-hidden="true" />
                <h2 className=" text-2xl text-center font-bold tracking-tight">
                  Summarization
                </h2>
                <p className="mt-3 list-item list-inside">
                Choose between summary type: Extractive, Abstractive or Hybrid
                </p>
                <p className="mt-3 list-item list-inside">
                Choose between summary length: precise or concise
                </p>
                <p className="mt-3 list-item list-inside">
                Analyze your document precisely
                </p>
              </div>
              <div
                className="ring-2 ring-base-300 bg-base-200 rounded-2xl mt-10 p-5 shadow-xl"
                data-aos="zoom-in"
              >
                <ScaleIcon className="h-5 w-5 mx-auto" aria-hidden="true" />
                <h2 className=" text-2xl text-center font-bold tracking-tight">
                  IPC to BNS Mapping
                </h2>
                <p className="mt-3 list-item list-inside">
                Detects IPC sections mentioned within legal case texts.
                </p>
                <p className="mt-3 list-item list-inside">
                Accurately maps identified IPC sections to their BNS equivalents.
                </p>
                <p className="mt-3 list-item list-inside">
                Supports legal practitioners with up-to-date legal code references.
                </p>
              </div>
            </div>
            <dl
              className="mt-10 space-y-8 text-base leading-7 lg:max-w-none"
              data-aos="fade-right"
            >
              {features.map((feature) => (
                <div key={feature.name} className="relative pl-9">
                  <dt className="inline font-semibold">
                    <feature.icon
                      className="absolute left-1 top-1 h-5 w-5"
                      aria-hidden="true"
                    />
                    {feature.name}
                  </dt>{" "}
                  <dd className="inline">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}