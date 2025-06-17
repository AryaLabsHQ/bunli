'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Github, Star } from 'lucide-react';

export function CTASection() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    // Fetch GitHub stars count
    fetch('https://api.github.com/repos/AryaLabsHQ/bunli')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        // Fallback to hardcoded value if API fails
        setStars(2300);
      });
  }, []);
  return (
    <section className="px-6 py-24 sm:py-32 lg:px-8 bg-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Start Building in 30 Seconds
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join developers building fast, type-safe CLIs with Bunli
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/docs/getting-started">
              <Button size="lg" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://github.com/AryaLabsHQ/bunli">
              <Button size="lg" variant="outline" className="gap-2">
                <Github className="h-4 w-4" />
                View on GitHub
              </Button>
            </Link>
          </div>

          {stars && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-current" />
              <span>{(stars / 1000).toFixed(1)}k stars on GitHub</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}