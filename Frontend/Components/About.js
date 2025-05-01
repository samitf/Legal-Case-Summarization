import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";

export default function AboutUs() {
  useEffect(() => {
    AOS.init({ duration: 1000 });
  }, []);
  
  return (
    <div className="py-24 sm:py-32" id="contact">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl leading-7">Who are we ?</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">
            About Us
          </p>
        </div>
        
        <div className="mt-16 max-w-xl mx-auto text-justify" data-aos="zoom-in">
          <p className="text-lg leading-7">
            We are Samit Fernandes, Ralph Pereira, and Jaden Franco, studying Computer Engineering at St. Francis Institute of Technology, Mumbai University. This is our Final Term Project, aimed at developing innovative solutions to real-world challenges in the field of computer engineering.
          </p>
          <p className="mt-4 text-lg leading-7">
            Our project focuses on Legal Document Summarization with IPC Section Extraction and BNS Section Mapping. We aim to simplify legal case analysis by automatically summarizing case texts and identifying relevant IPC sections, while also mapping them to their equivalent BNS section for better accessibility in the new legal framework.
          </p>
        </div>
      </div>
    </div>
  );
}
