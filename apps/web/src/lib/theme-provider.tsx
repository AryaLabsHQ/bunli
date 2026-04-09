"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="vesper"
      themes={[
        "vesper",
        "monokai",
        "dracula",
        "nord",
        "catppuccin",
        "tokyonight",
        "gruvbox",
        "solarized",
        "github",
      ]}
      disableTransitionOnChange
      enableSystem={false}
    >
      {children}
    </NextThemesProvider>
  );
}
