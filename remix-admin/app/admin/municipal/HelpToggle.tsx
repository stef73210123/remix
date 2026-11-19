'use client'

import { useId, useState } from 'react'
import { Info } from 'lucide-react'

/**
 * Explanatory "how to read this section" copy, tucked behind a small ⓘ toggle.
 *
 * Section intros used to render as an always-open muted paragraph under every
 * heading, which on a phone added up to several screens of the same kind of
 * text before any data. The explanations still matter, so they stay one tap
 * away instead of being deleted.
 *
 * NOT for disclaimers that must stay visible (the "not an official Town
 * website" line, TranscriptCaveat's one-liner, source attributions on
 * figures). Those keep rendering inline; this is only for helper text.
 *
 * Use <HelpToggle> beside a heading and <HelpPanel> right under the heading
 * row, sharing state via useHelpToggle(); or the all-in-one <HelpNote> when
 * the button can sit on its own line.
 */
export function useHelpToggle() {
  const [open, setOpen] = useState(false)
  const id = useId()
  return { open, setOpen, id }
}

export function HelpToggle({
  open, setOpen, id, label = 'About this section',
}: {
  open: boolean
  setOpen: (fn: (o: boolean) => boolean) => void
  id: string
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-controls={id}
      aria-label={label}
      title={label}
      className="help-toggle"
      data-open={open ? '' : undefined}
    >
      <Info size={14} aria-hidden />
    </button>
  )
}

export function HelpPanel({ open, id, children, style }: { open: boolean; id: string; children: React.ReactNode; style?: React.CSSProperties }) {
  if (!open) return null
  return (
    <div id={id} className="help-panel muted" style={style}>
      {children}
    </div>
  )
}

/** Heading + ⓘ + collapsible help in one, for the common case. */
export function SectionHeading({
  title, help, right, as: Tag = 'h2', style,
}: {
  title: React.ReactNode
  help?: React.ReactNode
  right?: React.ReactNode
  as?: 'h2' | 'h3'
  style?: React.CSSProperties
}) {
  const t = useHelpToggle()
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '0 0 12px', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <Tag style={{ fontSize: 16, margin: 0 }}>{title}</Tag>
          {help && <HelpToggle {...t} />}
        </div>
        {right}
      </div>
      {help && <HelpPanel open={t.open} id={t.id}>{help}</HelpPanel>}
    </>
  )
}
