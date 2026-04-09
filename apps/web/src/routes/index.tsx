import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { Suspense, lazy, useEffect, useState } from "react";

import { CTASection } from "@/components/landing/cta-section";
import { ExamplesShowcase } from "@/components/landing/examples-showcase";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { Hero } from "@/components/landing/hero";
import { QuickStart } from "@/components/landing/quick-start";

import { docsLayoutOptions } from "../lib/layout";

const LazyWorkbenchPage = lazy(async () => {
  const module = await import("../components/workbench/workbench-page");
  return { default: module.WorkbenchPage };
});

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <HomeLayout {...docsLayoutOptions()}>
      <main className="relative flex flex-1 flex-col">
        {/* Subtle grid texture overlay */}
        <div
          className="grid-texture pointer-events-none fixed inset-0 opacity-[0.03]"
          aria-hidden="true"
        />
        <Hero />
        <FeaturesGrid />
        <QuickStart />
        <ExamplesShowcase />
        <WorkbenchDemo />
        <CTASection />
        <footer className="border-terminal-border border-t py-6">
          <div className="text-terminal-muted mx-auto max-w-5xl px-4 text-center font-mono text-xs sm:px-6 lg:px-8">
            &copy; {new Date().getFullYear()} Bunli, built by{" "}
            <a
              href="https://aryalabs.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-terminal-foreground hover:text-accent transition-colors"
            >
              Arya Labs
            </a>
          </div>
        </footer>
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
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="text-terminal-muted mb-2 font-mono text-sm">
            <span className="text-accent">{">"}</span> interactive playground
          </div>
          <h2 className="text-foreground font-mono text-2xl md:text-3xl">try it live</h2>
          <p className="text-terminal-muted mt-3 max-w-xl font-sans">
            Test Bunli commands directly in your browser. Edit the code, run commands, and see
            results instantly.
          </p>
        </div>

        {mounted ? (
          <Suspense fallback={null}>
            <LazyWorkbenchPage embedded />
          </Suspense>
        ) : null}
      </div>
    </section>
  );
}
