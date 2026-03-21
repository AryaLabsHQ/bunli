import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useEffect, useState } from "react";
import { CTASection } from "@/components/landing/cta-section";
import { ExamplesShowcase } from "@/components/landing/examples-showcase";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { Hero } from "@/components/landing/hero";
import { QuickStart } from "@/components/landing/quick-start";
import { WorkbenchPage } from "../components/workbench/workbench-page";
import { docsLayoutOptions } from "../lib/layout";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <HomeLayout {...docsLayoutOptions()}>
      <main className="flex flex-1 flex-col relative">
        {/* Subtle grid texture overlay */}
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.03] grid-texture"
          aria-hidden="true"
        />
        <Hero />
        <FeaturesGrid />
        <QuickStart />
        <ExamplesShowcase />
        <WorkbenchDemo />
        <CTASection />
      </main>
    </HomeLayout>
  );
}

function WorkbenchDemo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="font-mono text-terminal-muted text-sm mb-2">
            <span className="text-accent">{">"}</span> interactive playground
          </div>
          <h2 className="font-mono text-2xl md:text-3xl text-foreground">
            try it live
          </h2>
          <p className="font-sans text-terminal-muted mt-3 max-w-xl">
            Test Bunli commands directly in your browser. Edit the code, run
            commands, and see results instantly.
          </p>
        </div>

        {mounted ? <WorkbenchPage embedded /> : null}
      </div>
    </section>
  );
}
