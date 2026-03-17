import type { ReactNode, Ref } from 'react'
import type { ScrollBoxRenderable } from '@opentui/core'
import { formatFixedWidth, useTuiTheme } from '@bunli/runtime/app'
import {
  resolveVariantStyle,
  type ComponentEmphasis,
  type ComponentSize
} from './variant.js'
import type { PanelTone } from './panel.js'

export interface ScrollPanelScrollbarOptions {
  visible?: boolean
  trackColor?: string
  thumbColor?: string
}

export interface ScrollPanelProps {
  id?: string
  title?: string
  subtitle?: string
  chromeLineWidth?: number
  header?: ReactNode
  footer?: ReactNode
  tone?: PanelTone
  size?: ComponentSize
  emphasis?: ComponentEmphasis
  padded?: boolean
  focused?: boolean
  stickyHeader?: boolean
  stickyFooter?: boolean
  height?: number | `${number}%` | 'auto'
  width?: number | `${number}%` | 'auto'
  fg?: string
  bg?: string
  borderColor?: string
  bodyGap?: number
  bodyPadding?: number
  allowHorizontalScroll?: boolean
  bodyRef?: Ref<ScrollBoxRenderable>
  scrollbar?: ScrollPanelScrollbarOptions
  children?: ReactNode
}

function hasChrome(props: { title?: string; subtitle?: string; header?: ReactNode }) {
  return Boolean(props.title || props.subtitle || props.header)
}

function hasFooter(props: { footer?: ReactNode }) {
  return Boolean(props.footer)
}

export function ScrollPanel({
  id,
  title,
  subtitle,
  chromeLineWidth,
  header,
  footer,
  tone = 'default',
  size = 'md',
  emphasis = 'subtle',
  padded = true,
  focused = false,
  stickyHeader = true,
  stickyFooter = true,
  height,
  width,
  fg,
  bg,
  borderColor,
  bodyGap = 1,
  bodyPadding,
  allowHorizontalScroll = false,
  bodyRef,
  scrollbar,
  children
}: ScrollPanelProps) {
  const { tokens } = useTuiTheme()
  const panelStyle = resolveVariantStyle(tokens, {
    tone,
    size,
    emphasis,
    fg,
    bg,
    border: borderColor,
    padding: padded ? undefined : 0
  })
  const chromePadding = bodyPadding ?? (padded ? panelStyle.padding : 0)
  const chromeExists = hasChrome({ title, subtitle, header })
  const footerExists = hasFooter({ footer })
  const resolvedTitle = title && typeof chromeLineWidth === 'number'
    ? formatFixedWidth(title, chromeLineWidth, { overflow: 'clip' })
    : title
  const resolvedSubtitle = subtitle && typeof chromeLineWidth === 'number'
    ? formatFixedWidth(subtitle, chromeLineWidth, { overflow: 'clip' })
    : subtitle

  const headerNode = chromeExists ? (
    <box
      padding={chromePadding}
      paddingBottom={0}
      style={{ flexDirection: 'column', gap: 1 }}
    >
      {resolvedTitle ? <text content={resolvedTitle} fg={panelStyle.fg} /> : null}
      {resolvedSubtitle ? <text content={resolvedSubtitle} fg={tokens.textMuted} /> : null}
      {header ? <box style={{ flexDirection: 'column', gap: 1 }}>{header}</box> : null}
    </box>
  ) : null

  const footerNode = footerExists ? (
    <box
      padding={chromePadding}
      paddingTop={0}
      style={{ flexDirection: 'column', gap: 1 }}
    >
      {footer}
    </box>
  ) : null

  return (
    <box
      id={id}
      border
      height={height}
      width={width}
      style={{
        flexDirection: 'column',
        flexGrow: 1,
        backgroundColor: panelStyle.bg,
        borderColor: focused ? tokens.accent : panelStyle.border
      }}
    >
      {stickyHeader ? headerNode : null}
      <scrollbox
        ref={bodyRef}
        flexGrow={1}
        focused={focused}
        scrollY
        scrollX={allowHorizontalScroll}
        viewportOptions={{
          width: '100%'
        }}
        contentOptions={{
          width: '100%'
        }}
        scrollbarOptions={{
          visible: scrollbar?.visible ?? true,
          trackOptions: {
            backgroundColor: scrollbar?.trackColor ?? tokens.backgroundMuted,
            foregroundColor: scrollbar?.thumbColor ?? (focused ? tokens.accent : tokens.borderMuted)
          }
        }}
        horizontalScrollbarOptions={{
          visible: false
        }}
      >
        {!stickyHeader ? headerNode : null}
        <box
          width='100%'
          padding={chromePadding}
          paddingTop={chromePadding}
          style={{ flexDirection: 'column', gap: bodyGap }}
        >
          {children}
        </box>
        {!stickyFooter ? footerNode : null}
      </scrollbox>
      {stickyFooter ? footerNode : null}
    </box>
  )
}
