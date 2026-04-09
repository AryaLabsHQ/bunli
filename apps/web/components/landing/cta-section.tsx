"use client";

import { Star } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";

export function CTASection() {
  const [isVisible, setIsVisible] = useState(false);
  const [stars, setStars] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetch("https://api.github.com/repos/AryaLabsHQ/bunli")
      .then((res) => res.json() as Promise<{ stargazers_count?: number }>)
      .then((data) => {
        if (data.stargazers_count) {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        setStars(2300);
      });
  }, []);

  const handleGetStarted = useCallback(() => {
    window.location.href = "/docs/getting-started";
  }, []);

  return (
    <section ref={sectionRef} className="relative py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {/* ASCII border top */}
        <div
          className={`text-terminal-muted mb-12 font-mono text-sm transition-all duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          {"─".repeat(40)}
        </div>

        {/* Terminal prompt */}
        <div
          className={`bg-terminal border-terminal-border inline-block border transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
          style={{ transitionDelay: "100ms" }}
        >
          <div className="px-6 py-4 md:px-8 md:py-5">
            <button
              onClick={handleGetStarted}
              className="group flex items-center gap-2 font-mono text-lg md:text-xl"
            >
              <span className="text-accent">$</span>
              <span className="text-terminal-foreground group-hover:text-accent transition-colors">
                bun create bunli my-cli
              </span>
              <span className="bg-accent cursor-blink h-5 w-2.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Action hint */}
        <div
          className={`text-terminal-muted mt-8 font-mono text-sm transition-all duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          press{" "}
          <kbd className="bg-terminal border-terminal-border text-terminal-foreground inline-flex items-center border px-2 py-0.5 text-xs">
            enter
          </kbd>{" "}
          to get started
        </div>

        {/* GitHub stars */}
        <div
          className={`mt-12 flex items-center justify-center gap-6 transition-all duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "300ms" }}
        >
          <a
            href="https://github.com/AryaLabsHQ/bunli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-muted hover:text-terminal-foreground flex items-center gap-2 font-mono text-sm transition-colors"
          >
            <Star className="h-4 w-4" />
            <span>{stars ?? "..."}</span>
          </a>
          <span className="text-terminal-border">|</span>
          <a
            href="https://github.com/AryaLabsHQ/bunli"
            target="_blank"
            rel="noopener noreferrer"
            className="text-terminal-muted hover:text-terminal-foreground font-mono text-sm transition-colors"
          >
            view on github
          </a>
        </div>

        {/* ASCII border bottom */}
        <div
          className={`text-terminal-muted mt-12 font-mono text-sm transition-all duration-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transitionDelay: "400ms" }}
          aria-hidden="true"
        >
          {"─".repeat(40)}
        </div>
      </div>
    </section>
  );
}
