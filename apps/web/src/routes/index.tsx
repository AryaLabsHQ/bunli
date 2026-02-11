import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { useEffect, useState } from "react";
import { CTASection } from "@/components/landing/cta-section";
import { CodeComparison } from "@/components/landing/code-comparison";
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
      <main className="flex flex-1 flex-col">
        <Hero />
        <FeaturesGrid />
        <CodeComparison />
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
    <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Interactive Workbench Demo
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Edit <code>src/index.ts</code> and run it live in a terminal-backed sandbox.
          </p>
        </div>
        {mounted ? <WorkbenchPage embedded /> : null}
      </div>
    </section>
  );
}
