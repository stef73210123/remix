'use client'

import { useState } from 'react'

/**
 * The plain-language "how to read this / what it isn't" note that accompanies
 * every surface built from meeting-transcript analysis.
 *
 * Why this exists as one shared component: the numbers on those surfaces are
 * derived from machine transcription plus automated inference, and a reader who
 * meets them without context can reasonably mistake them for an official record
 * or for a scorecard of officials. They are neither. Stating that once in the
 * footer is not enough — the caveat belongs next to the number itself, in words
 * an ordinary resident can use, every time.
 *
 * Keep the collapsed line short enough that it doesn't become wallpaper people
 * scroll past, with the specifics one tap away for anyone who wants them.
 */
export default function TranscriptCaveat({
  /** 'member' tunes the wording for a single official's page. */
  variant = 'board',
  style,
}: {
  variant?: 'board' | 'member'
  style?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)

  const summary =
    variant === 'member'
      ? 'An automated summary of what this member said in recorded meetings — not a voting record, and not a rating.'
      : 'An automated summary of what was said in recorded meetings — not a voting record, and not a rating of anyone.'

  return (
    <div
      className="muted"
      style={{ fontSize: 11.5, lineHeight: 1.55, maxWidth: 720, marginBottom: 14, ...style }}
    >
      {summary}{' '}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          font: 'inherit', color: 'var(--primary-light)', background: 'none', border: 'none',
          padding: 0, cursor: 'pointer', textDecoration: 'underline',
        }}
        aria-expanded={open}
      >
        {open ? 'Hide details' : 'How to read this'}
      </button>
      {open && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <li>
            <strong>A higher number is not &ldquo;better.&rdquo;</strong> It only means the remarks
            leaned supportive rather than critical. Asking hard questions about a proposal is a normal
            and useful part of the job, and it reads here as critical.
          </li>
          <li>
            <strong>It is not a vote count.</strong> Official votes are recorded in the Town&rsquo;s
            minutes. This measures the tone of discussion, which often differs from how someone voted.
          </li>
          <li>
            <strong>The transcripts are machine-generated</strong> from meeting recordings and contain
            errors, especially with names and numbers.
          </li>
          <li>
            <strong>Who said what is inferred, not certain.</strong> The recordings do not label
            speakers, so remarks are matched to people using names spoken aloud and context. Each one
            carries a confidence level, and anything too unclear to attribute is left out entirely.
          </li>
          <li>
            <strong>Coverage is partial.</strong> Only meetings with a usable public recording are
            included, so some meetings and some remarks are missing.
          </li>
          <li>
            For anything that matters, check the Town&rsquo;s official minutes and recordings — they
            are the authoritative record, and this site is not.
          </li>
        </ul>
      )}
    </div>
  )
}
