import { formatFixedWidth } from "@bunli/runtime/app";
import { Divider, NavList, ScrollPanel } from "@bunli/tui/interactive";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { Ref } from "react";

import { wrapPathLines, wrapTextLines } from "../lib/text.js";
import type { GalleryEntry, GalleryFocusRegion, GalleryStateOption } from "../model.js";

export interface InfoPaneProps {
  activeEntry: GalleryEntry | null;
  activeState: GalleryStateOption | undefined;
  focusRegion: GalleryFocusRegion;
  infoWidth: number;
  bodyRef?: Ref<ScrollBoxRenderable>;
  stateKey: string;
  stateOptions: GalleryStateOption[];
  onStateChange: (stateKey: string) => void;
  onStateSelect: (stateKey: string) => void;
  onFocusRegionChange: (region: GalleryFocusRegion) => void;
}

export function InfoPane({
  activeEntry,
  activeState,
  focusRegion,
  infoWidth,
  bodyRef,
  stateKey,
  stateOptions,
  onStateChange,
  onStateSelect,
  onFocusRegionChange,
}: InfoPaneProps) {
  const lineWidth = Math.max(18, infoWidth - 8);

  return (
    <box
      height="100%"
      onMouseDown={() => {
        onFocusRegionChange("states");
      }}
    >
      <ScrollPanel
        title={focusRegion === "states" ? "Info / Help [focus]" : "Info / Help"}
        subtitle="States, usage, source references"
        chromeLineWidth={lineWidth}
        tone="default"
        emphasis={focusRegion === "states" ? "outline" : "subtle"}
        focused={focusRegion === "states"}
        height="100%"
        bodyRef={bodyRef}
      >
        <NavList
          id="gallery-info-states"
          title={focusRegion === "states" ? "States [focus]" : "States"}
          keyboardEnabled={focusRegion === "states"}
          onFocusRequest={() => onFocusRegionChange("states")}
          scopeId="gallery:shell:states"
          value={stateKey}
          compact
          maxLineWidth={infoWidth - 8}
          onChange={onStateChange}
          onSelect={onStateSelect}
          items={stateOptions.map((state) => ({
            key: state.key,
            label: state.label,
          }))}
        />
        {wrapTextLines(activeState?.description ?? "", lineWidth).map((line, index) => (
          <text
            key={`state-description-${index}`}
            content={formatFixedWidth(line, lineWidth, { overflow: "clip" })}
          />
        ))}
        <Divider />
        {wrapTextLines(activeEntry?.summary ?? "No summary available.", lineWidth).map(
          (line, index) => (
            <text
              key={`summary-${index}`}
              content={formatFixedWidth(line, lineWidth, { overflow: "clip" })}
            />
          ),
        )}
        <Divider />
        <text content={formatFixedWidth("When to use", lineWidth, { overflow: "clip" })} />
        {(activeEntry?.usage ?? []).flatMap((line, index) =>
          wrapTextLines(line, lineWidth, { firstPrefix: "- ", restPrefix: "  " }).map(
            (wrapped, wrappedIndex) => (
              <text
                key={`usage-${index}-${wrappedIndex}`}
                content={formatFixedWidth(wrapped, lineWidth, { overflow: "clip" })}
              />
            ),
          ),
        )}
        {(activeEntry?.keybindings?.length ?? 0) > 0 ? (
          <>
            <Divider />
            {wrapTextLines(
              `Entry keys: ${(activeEntry?.keybindings ?? []).join(", ")}`,
              lineWidth,
            ).map((line, index) => (
              <text
                key={`keys-${index}`}
                content={formatFixedWidth(line, lineWidth, { overflow: "clip" })}
              />
            ))}
          </>
        ) : null}
        <Divider />
        <text content={formatFixedWidth("Source references", lineWidth, { overflow: "clip" })} />
        {(activeEntry?.sourceRefs ?? []).map((ref) => (
          <box key={ref.path} style={{ flexDirection: "column", gap: 0 }}>
            <text content={formatFixedWidth(`- ${ref.label}`, lineWidth, { overflow: "clip" })} />
            {wrapPathLines(ref.path, lineWidth).map((line, index) => (
              <text
                key={`${ref.path}-${index}`}
                content={formatFixedWidth(line, lineWidth, { overflow: "clip" })}
              />
            ))}
          </box>
        ))}
        {activeState?.description ? (
          <>
            <Divider />
            {wrapTextLines(
              `Active state: ${activeState.label} - ${activeState.description}`,
              lineWidth,
            ).map((line, index) => (
              <text
                key={`active-state-${index}`}
                content={formatFixedWidth(line, lineWidth, { overflow: "clip" })}
              />
            ))}
          </>
        ) : null}
      </ScrollPanel>
    </box>
  );
}
