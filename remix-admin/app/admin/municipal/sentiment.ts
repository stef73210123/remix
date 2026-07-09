/**
 * Sentiment display helpers — a diverging scale for the transcript analysis.
 *
 * Score is in [-1, 1]. We render a two-pole diverging scale (negative → neutral
 * → positive) with the brand coral for negative, a muted slate for neutral, and
 * the validated green for positive. Color is ALWAYS paired with a numeric value
 * or text label so it is never the sole channel (mitigates red/green CVD).
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

export function sentimentLabel(score: number): string {
  if (score <= -0.5) return 'Strongly negative'
  if (score <= -0.15) return 'Negative'
  if (score < 0.15) return 'Neutral / mixed'
  if (score < 0.5) return 'Positive'
  return 'Strongly positive'
}

/** Short label for stances toward an application specifically. */
export function dispositionLabel(score: number): string {
  if (score <= -0.5) return 'Opposed'
  if (score <= -0.15) return 'Skeptical'
  if (score < 0.15) return 'Neutral'
  if (score < 0.5) return 'Supportive'
  return 'Strongly supportive'
}

/** Display sentiment on a −10…+10 scale (one decimal): 0.55 → "+5.5". */
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
