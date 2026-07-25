/**
 * Morning-briefing + fitness-checklist store (Upstash Redis).
 *
 * The daily briefing is composed by a Cowork scheduled task (calendar, email,
 * Slack, school, job scan, NBA…). That task POSTs the composed briefing to
 * `/admin/api/briefing`, which stores it here; the admin Dashboard reads the
 * latest and renders it at the top. Fitness items in the briefing become
 * checkboxes whose state is stored per-day and mirrored to the "Food and
 * Protein Log" spreadsheet.
 */
import { getRedis } from './redis'

export interface Briefing {
  /** YYYY-MM-DD in America/New_York. */
  date: string
  /** ISO timestamp of when this briefing was stored. */
  updatedAt: string
  /** Briefing body — Slack mrkdwn or plain text. */
  markdown: string
  /** Fitness item labels to render as checkboxes (optional). */
  fitness?: string[]
}

const LATEST_KEY = 'briefing:latest'
export const fitnessKey = (date: string) => `fitness:${date}`

/** Sensible default daily fitness checklist when the briefing carries none. */
export const DEFAULT_FITNESS_ITEMS = [
  'Strength / workout',
  '10k steps',
  'Hit protein target',
  'Creatine',
  'Water — 64 oz+',
]

/** Today's date as YYYY-MM-DD in Eastern time (Stefan's timezone). */
export function etDate(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export async function getLatestBriefing(): Promise<Briefing | null> {
  return (await getRedis().get<Briefing>(LATEST_KEY)) ?? null
}

export async function setLatestBriefing(b: Briefing): Promise<void> {
  await getRedis().set(LATEST_KEY, b)
}

export async function getFitnessState(date: string): Promise<Record<string, boolean>> {
  return (await getRedis().get<Record<string, boolean>>(fitnessKey(date))) ?? {}
}

export async function setFitnessItem(
  date: string,
  item: string,
  checked: boolean,
): Promise<Record<string, boolean>> {
  const state = await getFitnessState(date)
  state[item] = checked
  await getRedis().set(fitnessKey(date), state)
  return state
}
