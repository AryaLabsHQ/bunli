export interface BunliTheme {
  id: string;
  name: string;
  accent: string; // hex for preview swatch
}

export const themes: BunliTheme[] = [
  { id: "vesper", name: "Vesper", accent: "#ffc799" },
  { id: "monokai", name: "Monokai", accent: "#e6db74" },
  { id: "dracula", name: "Dracula", accent: "#bd93f9" },
  { id: "nord", name: "Nord", accent: "#88c0d0" },
  { id: "catppuccin", name: "Catppuccin", accent: "#cba6f7" },
  { id: "tokyonight", name: "Tokyo Night", accent: "#7aa2f7" },
  { id: "gruvbox", name: "Gruvbox", accent: "#fe8019" },
  { id: "solarized", name: "Solarized", accent: "#268bd2" },
  { id: "github", name: "GitHub Dark", accent: "#58a6ff" },
];

export const DEFAULT_THEME_ID = "vesper";

export function getThemeById(id: string): BunliTheme | undefined {
  return themes.find((t) => t.id === id);
}
