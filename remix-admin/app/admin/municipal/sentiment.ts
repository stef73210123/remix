/**
 * Discussion-tone display helpers — a diverging scale for the transcript analysis.
 *
 * Score is in [-1, 1]. We render a two-pole diverging scale (critical → mixed
 * → supportive) with the brand coral for critical, a muted slate for mixed, and
 * the validated green for supportive. Color is ALWAYS paired with a numeric value
 * or text label so it is never the sole channel (mitigates red/green CVD).
 *
 * LANGUAGE NOTE (deliberate, please preserve): every label here describes how a
 * COMMENT sounded, never how a person performed. This measure has no "good" end
 * — a member who asks hard questions about an application reads as critical, and
 * that is ordinary, valuable public service, not a low grade. Avoid reintroducing
 * words like "progress", "rating", "grade", or "score out of" that imply the site
 * has a preferred direction. It does not.
 */
import type { CSSProperties } from 'react'

const NEG = [0xca, 0x61, 0x5f] // --primary coral (negative)
const NEU = [0x7a, 0x85, 0x90] // slate (neutral)
const POS = [0x3d, 0x9c, 0x72] // validated green (positive)

function mix(a: number[], b: number[], t: number): string {
  const c = a.map((av, i) => Math.round(av + (b[i] - av) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

/** Interpolate neutral→pole by magnitude so faint scores read faint. */
export function sentimentColor(score: number): string {
  const s = Math.max(-1, Math.min(1, score))
  if (s >= 0) return mix(NEU, POS, Math.min(1, s / 0.6))
  return mix(NEU, NEG, Math.min(1, -s / 0.6))
}

/** How a person's comments read overall, in plain language. Describes the
 *  remarks, not the person — see the LANGUAGE NOTE at the top of this file. */
export function sentimentLabel(score: number): string {
  if (score <= -0.5) return 'Mostly critical'
  if (score <= -0.15) return 'Leaned critical'
  if (score < 0.15) return 'Mixed or neutral'
  if (score < 0.5) return 'Leaned supportive'
  return 'Mostly supportive'
}

/** Short label for how comments read toward one application specifically. */
export function dispositionLabel(score: number): string {
  if (score <= -0.5) return 'Critical'
  if (score <= -0.15) return 'Raised concerns'
  if (score < 0.15) return 'Mixed or neutral'
  if (score < 0.5) return 'Supportive'
  return 'Strongly supportive'
}

/** Display tone on a −10…+10 scale (one decimal): 0.55 → "+5.5". */
export function fmtSent(score: number): string {
  const r = Math.round(score * 100) / 10
  return (r > 0 ? '+' : '') + r.toFixed(1)
}

/** A small pill showing the numeric score on its diverging color. */
export function sentimentChipStyle(score: number): CSSProperties {
  return {
    background: sentimentColor(score),
    color: '#0a0a0a',
    fontWeight: 700,
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 999,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
    minWidth: 44,
    textAlign: 'center',
  }
}
