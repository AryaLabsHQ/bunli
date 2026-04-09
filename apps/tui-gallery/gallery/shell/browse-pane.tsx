import { formatFixedWidth } from "@bunli/runtime/app";
import { Divider, NavList, ScrollPanel } from "@bunli/tui/interactive";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { Ref } from "react";

import { wrapTextLines } from "../lib/text.js";
import type { GalleryCategory, GalleryFocusRegion, GallerySection } from "../model.js";

export interface BrowsePaneProps {
  focusRegion: GalleryFocusRegion;
  sections: GallerySection[];
  activeSection: GallerySection | null;
  activeCategory: GalleryCategory | null;
  categoryId: string;
  categoryWidth: number;
  bodyRef?: Ref<ScrollBoxRenderable>;
  sectionId: string;
  onSectionChange: (sectionId: string) => void;
  onSectionSelect: (sectionId: string) => void;
  onCategoryChange: (categoryId: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onFocusRegionChange: (region: GalleryFocusRegion) => void;
}

export function BrowsePane({
  focusRegion,
  sections,
  activeSection,
  activeCategory,
  categoryId,
  categoryWidth,
  bodyRef,
  sectionId,
  onSectionChange,
  onSectionSelect,
  onCategoryChange,
  onCategorySelect,
  onFocusRegionChange,
}: BrowsePaneProps) {
  const categories = activeSection?.categories ?? [];
  const detailWidth = Math.max(18, categoryWidth - 8);

  return (
    <box
      height="100%"
      onMouseDown={() => {
        onFocusRegionChange(focusRegion === "sections" ? "sections" : "categories");
      }}
    >
      <ScrollPanel
        title={
          focusRegion === "sections" || focusRegion === "categories" ? "Browse [focus]" : "Browse"
        }
        subtitle="Sections and categories"
        chromeLineWidth={detailWidth}
        tone="default"
        emphasis={focusRegion === "sections" || focusRegion === "categories" ? "outline" : "subtle"}
        focused={focusRegion === "sections" || focusRegion === "categories"}
        height="100%"
        bodyRef={bodyRef}
      >
        <NavList
          id="gallery-browse-sections"
          title={focusRegion === "sections" ? "Sections [focus]" : "Sections"}
          compact
          wrapLabels
          maxLabelLines={2}
          keyboardEnabled={focusRegion === "sections"}
          onFocusRequest={() => onFocusRegionChange("sections")}
          scopeId="gallery:shell:sections"
          value={sectionId}
          maxLineWidth={categoryWidth - 8}
          onChange={onSectionChange}
          onSelect={onSectionSelect}
          items={sections.map((section) => ({
            key: section.id,
            label: section.title,
          }))}
        />
        <NavList
          id="gallery-browse-categories"
          title={focusRegion === "categories" ? "Categories [focus]" : "Categories"}
          compact
          wrapLabels
          maxLabelLines={2}
          keyboardEnabled={focusRegion === "categories"}
          onFocusRequest={() => onFocusRegionChange("categories")}
          scopeId="gallery:shell:categories"
          value={categoryId}
          maxLineWidth={categoryWidth - 8}
          onChange={onCategoryChange}
          onSelect={onCategorySelect}
          items={categories.map((category: GalleryCategory) => ({
            key: category.id,
            label: category.title,
          }))}
        />
        {activeCategory ? (
          <>
            <Divider />
            <text
              content={formatFixedWidth(activeCategory.title, detailWidth, { overflow: "clip" })}
            />
            {wrapTextLines(activeCategory.description, detailWidth).map((line, index) => (
              <text
                key={`category-description-${index}`}
                content={formatFixedWidth(line, detailWidth, { overflow: "clip" })}
              />
            ))}
          </>
        ) : null}
      </ScrollPanel>
    </box>
  );
}
