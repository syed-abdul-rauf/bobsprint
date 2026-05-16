"use client";

import { useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";

import Navbar from "@/components/Navbar";
import Hero from "@/components/hero";
import Problem from "@/components/problem";
import Solution from "@/components/solution";
import IbmBob from "@/components/ibm-bob";
import Demo from "@/components/demo";
import Footer from "@/components/footer";

const Starfield = dynamic(() => import("@/components/starfield"), { ssr: false });

export default function Home() {
  const { scrollYProgress } = useScroll();
  // Map page scroll 0→1 to robot rotation driver
  const scroll = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "linear-gradient(180deg,#020617 0%,#0a0e1a 35%,#060c18 70%,#020617 100%)" }}
    >
      <Starfield />
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero scroll={scroll} />
          <Problem />
          <Solution />
          <IbmBob scroll={scroll} />
          <Demo />
        </main>
        <Footer />
      </div>
    </div>
  );
}
