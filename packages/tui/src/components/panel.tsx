import { useTuiTheme } from "@bunli/runtime/app";
import type { ReactNode } from "react";

import {
  resolveVariantStyle,
  type ComponentEmphasis,
  type ComponentSize,
  type ComponentTone,
} from "./variant.js";

export type PanelTone = Extract<
  ComponentTone,
  "default" | "accent" | "success" | "warning" | "danger"
>;

export interface PanelProps {
  title?: string;
  subtitle?: string;
  footer?: ReactNode;
  tone?: PanelTone;
  size?: ComponentSize;
  emphasis?: ComponentEmphasis;
  padded?: boolean;
  children?: ReactNode;
  fg?: string;
  bg?: string;
  borderColor?: string;
}

export function Panel({
  title,
  subtitle,
  footer,
  tone = "default",
  size = "md",
  emphasis = "subtle",
  padded = true,
  children,
  fg,
  bg,
  borderColor,
}: PanelProps) {
  const { tokens } = useTuiTheme();
  const panelStyle = resolveVariantStyle(tokens, {
    tone,
    size,
    emphasis,
    fg,
    bg,
    border: borderColor,
    padding: padded ? undefined : 0,
  });

  return (
    <box
      border
      padding={padded ? panelStyle.padding : undefined}
      style={{
        flexDirection: "column",
        gap: 1,
        backgroundColor: panelStyle.bg,
        borderColor: panelStyle.border,
      }}
    >
      {title ? <text content={title} fg={panelStyle.fg} /> : null}
      {subtitle ? <text content={subtitle} fg={tokens.textMuted} /> : null}
      <box style={{ flexDirection: "column", gap: 1 }}>{children}</box>
      {footer ? <box style={{ marginTop: 1 }}>{footer}</box> : null}
    </box>
  );
}
