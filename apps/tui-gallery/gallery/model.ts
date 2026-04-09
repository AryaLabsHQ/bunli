import type { ReactNode } from "react";

export type GalleryTheme = "dark" | "light";
export type GalleryWidthPreset = "narrow" | "standard" | "wide";
export type GallerySectionId = "components" | "recipes";
export type GalleryEntryKind = "example" | "recipe";
export type GalleryFocusRegion = "sections" | "categories" | "entries" | "preview" | "states";

export interface GallerySourceRef {
  label: string;
  path: string;
}

export interface GalleryStateOption {
  key: string;
  label: string;
  description?: string;
}

export interface GalleryRenderContext {
  active: boolean;
  focusToken: number;
  previewWidth: number;
  terminalWidth: number;
  stateKey: string;
}

export interface GalleryEntry {
  id: string;
  kind: GalleryEntryKind;
  title: string;
  summary: string;
  usage: string[];
  keybindings?: string[];
  states: GalleryStateOption[];
  sourceRefs: GallerySourceRef[];
  render: (context: GalleryRenderContext) => ReactNode;
}

export interface GalleryCategory {
  id: string;
  title: string;
  description: string;
  entries: GalleryEntry[];
}

export interface GallerySection {
  id: GallerySectionId;
  title: string;
  categories: GalleryCategory[];
}

export interface GallerySelection {
  sectionId: GallerySectionId;
  categoryId: string;
  entryId: string;
}

export const DEFAULT_GALLERY_SECTION: GallerySectionId = "components";

export function flattenEntries(sections: GallerySection[]): GalleryEntry[] {
  return sections.flatMap((section) => section.categories.flatMap((category) => category.entries));
}

export function findSection(
  sections: GallerySection[],
  sectionId: GallerySectionId,
): GallerySection | null {
  return sections.find((section) => section.id === sectionId) ?? null;
}

export function findCategory(
  sections: GallerySection[],
  categoryId: string,
): GalleryCategory | null {
  for (const section of sections) {
    const category = section.categories.find((entry) => entry.id === categoryId);
    if (category) return category;
  }
  return null;
}

export function findEntryRecord(
  sections: GallerySection[],
  entryId: string,
): { section: GallerySection; category: GalleryCategory; entry: GalleryEntry } | null {
  for (const section of sections) {
    for (const category of section.categories) {
      const entry = category.entries.find((candidate) => candidate.id === entryId);
      if (entry) {
        return { section, category, entry };
      }
    }
  }

  return null;
}

export function firstSelectionForSection(
  sections: GallerySection[],
  sectionId: GallerySectionId,
): GallerySelection {
  const section = findSection(sections, sectionId) ?? sections[0];
  const category = section?.categories[0];
  const entry = category?.entries[0];

  return {
    sectionId: section?.id ?? DEFAULT_GALLERY_SECTION,
    categoryId: category?.id ?? "",
    entryId: entry?.id ?? "",
  };
}

export function resolveInitialSelection(
  sections: GallerySection[],
  args: {
    sectionId?: GallerySectionId;
    entryId?: string;
  },
): GallerySelection {
  if (args.entryId) {
    const match = findEntryRecord(sections, args.entryId);
    if (match) {
      return {
        sectionId: match.section.id,
        categoryId: match.category.id,
        entryId: match.entry.id,
      };
    }
  }

  return firstSelectionForSection(sections, args.sectionId ?? DEFAULT_GALLERY_SECTION);
}

export function firstStateKey(entry: GalleryEntry): string {
  return entry.states[0]?.key ?? "default";
}
