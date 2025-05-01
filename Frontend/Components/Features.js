import { useEffect } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import AOS from "aos";
import "aos/dist/aos.css";

const frontend = [
  {
    name: "Text Preprocessing",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Named Entity Recognition",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "IPC Section Extraction",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Case Facts Extraction",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Document Analysis",
    value: 100,
    icon: CheckCircleIcon,
  },
];
const backend = [
  {
    name: "Process Long Document",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Tokenization",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Generate Embeddings",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Extractive Summary",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Abstractive Summary",
    value: 100,
    icon: CheckCircleIcon,
  },
  {
    name: "Final Summary",
    value: 100,
    icon: CheckCircleIcon,
  },
];

export default function Skills() {
  useEffect(() => {
    AOS.init({ duration: 2000 });
  }, []);
  return (
    <div className="py-24 sm:py-32" id="skills">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl leading-7">Nyaya Analyzer</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">
            Features
          </p>
        </div>
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:gap-y-10">
          <div
            className="mt-10 max-w-2xl sm:mt-10 lg:mt-10 lg:max-w-4xl bg-base-200 ring-2 ring-base-300 rounded-2xl p-5 shadow-xl"
            data-aos="zoom-in"
          >
            <p className="text-2xl text-center font-bold mb-6">Frontend Processing</p>
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-6 lg:max-w-none lg:grid-cols-2 lg:gap-y-6">
              {frontend.map((frontend) => (
                <div key={frontend.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg">
                      <frontend.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    {frontend.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7">
                    <progress
                      className="progress w-3/4"
                      value={frontend.value}
                      max="100"
                    ></progress>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div
            className="mt-10 max-w-2xl sm:mt-10 lg:mt-10 lg:max-w-4xl bg-base-200 ring-2 ring-base-300 rounded-2xl p-5 shadow-xl"
            data-aos="zoom-in"
          >
            <p className="text-2xl text-center font-bold mb-6">Backend Processing</p>
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-6 lg:max-w-none lg:grid-cols-2 lg:gap-y-6">
              {backend.map((backend) => (
                <div key={backend.name} className="relative pl-16">
                  <dt className="text-base font-semibold leading-7">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg">
                      <backend.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    {backend.name}
                  </dt>
                  <dd className="mt-2 text-base leading-7">
                    <progress
                      className="progress w-3/4"
                      value={backend.value}
                      max="100"
                    ></progress>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}