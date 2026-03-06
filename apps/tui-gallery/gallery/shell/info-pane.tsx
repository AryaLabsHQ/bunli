import { Divider, Menu, Panel } from '@bunli/tui/interactive'
import type { GalleryEntry, GalleryFocusRegion, GalleryStateOption } from '../model.js'
import { wrapPathLines, wrapTextLines } from '../lib/text.js'

function selectedIndex<T extends { id: string }>(items: T[], currentId: string): number {
  const index = items.findIndex((item) => item.id === currentId)
  return index < 0 ? 0 : index
}

export interface InfoPaneProps {
  activeEntry: GalleryEntry | null
  activeState: GalleryStateOption | undefined
  focusRegion: GalleryFocusRegion
  infoWidth: number
  stateKey: string
  stateOptions: GalleryStateOption[]
  onStateSelect: (stateKey: string) => void
}

export function InfoPane({
  activeEntry,
  activeState,
  focusRegion,
  infoWidth,
  stateKey,
  stateOptions,
  onStateSelect
}: InfoPaneProps) {
  const lineWidth = Math.max(18, infoWidth - 6)

  return (
    <Panel
      title={focusRegion === 'states' ? 'Info / Help [focus]' : 'Info / Help'}
      subtitle='States, usage, source references'
      tone={focusRegion === 'states' ? 'accent' : 'default'}
      emphasis={focusRegion === 'states' ? 'outline' : 'subtle'}
    >
      <Menu
        key={`states:${activeEntry?.id ?? 'none'}:${stateKey}`}
        title={focusRegion === 'states' ? 'States [focus]' : 'States'}
        items={stateOptions.map((state) => ({
          key: state.key,
          label: state.label
        }))}
        initialIndex={selectedIndex(stateOptions.map((state) => ({ id: state.key })), stateKey)}
        scopeId='gallery:shell:states'
        keyboardEnabled={focusRegion === 'states'}
        maxLineWidth={infoWidth - 6}
        boxed={false}
        onSelect={onStateSelect}
      />
      {wrapTextLines(activeState?.description ?? '', lineWidth).map((line, index) => (
        <text key={`state-description-${index}`} content={line} />
      ))}
      <Divider />
      {wrapTextLines(activeEntry?.summary ?? 'No summary available.', lineWidth).map((line, index) => (
        <text key={`summary-${index}`} content={line} />
      ))}
      <Divider />
      <text content='When to use' />
      {(activeEntry?.usage ?? []).flatMap((line, index) =>
        wrapTextLines(line, lineWidth, { firstPrefix: '- ', restPrefix: '  ' }).map((wrapped, wrappedIndex) => (
          <text key={`usage-${index}-${wrappedIndex}`} content={wrapped} />
        ))
      )}
      {(activeEntry?.keybindings?.length ?? 0) > 0 ? (
        <>
          <Divider />
          {wrapTextLines(`Entry keys: ${(activeEntry?.keybindings ?? []).join(', ')}`, lineWidth).map((line, index) => (
            <text key={`keys-${index}`} content={line} />
          ))}
        </>
      ) : null}
      <Divider />
      <text content='Source references' />
      {(activeEntry?.sourceRefs ?? []).map((ref) => (
        <box key={ref.path} style={{ flexDirection: 'column', gap: 0 }}>
          <text content={`- ${ref.label}`} />
          {wrapPathLines(ref.path, lineWidth).map((line, index) => (
            <text key={`${ref.path}-${index}`} content={line} />
          ))}
        </box>
      ))}
      {activeState?.description ? (
        <>
          <Divider />
          {wrapTextLines(`Active state: ${activeState.label} - ${activeState.description}`, lineWidth).map((line, index) => (
            <text key={`active-state-${index}`} content={line} />
          ))}
        </>
      ) : null}
    </Panel>
  )
}
