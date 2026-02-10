import { Hero } from '@/components/landing/hero';
import { FeaturesGrid } from '@/components/landing/features-grid';
import { CodeComparison } from '@/components/landing/code-comparison';
import { QuickStart } from '@/components/landing/quick-start';
import { ExamplesShowcase } from '@/components/landing/examples-showcase';
import { CTASection } from '@/components/landing/cta-section';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <FeaturesGrid />
      <CodeComparison />
      <QuickStart />
      <ExamplesShowcase />
      <CTASection />
    </main>
  );
}

