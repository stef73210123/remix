# North Castle Town Board — transcript analysis dataset

Same pipeline as `../nc-planning`, applied to the elected **Town Board** over
2022–2026 (111 meeting dates, the most recent being 2026-08-12). 2023-06-28 had both a regular meeting and a
same-day work session transcribed separately — the two are merged into one
`analysis.json` entry for that date (rather than two rows sharing a date,
which the board page keys meeting rows and timeline points by). Served by the
board page (`/admin/municipal/board?muni=nc&body=town_board`) and member
profiles.

## Contents
- `transcripts/<YYYY-MM-DD>.txt` — raw meeting-video transcripts (ASR, no speaker
  labels), one per Town Board meeting.
- `analysis.json` — per-meeting agenda items / resolutions with themes and
  sentiment, plus roll-ups (themes over time, per-item sentiment trajectory,
  per-member sentiment profiles). Shape defined by `lib/municipal/analysis.ts`.
- `aggregate.py` — regenerates `analysis.json` from the per-meeting analyses.

## Roster (two Supervisor eras, one council turnover)
- **Michael Schiliro** — Supervisor 2022–2023 (did not seek a 6th term; the
  un-named presiding voice in 2022–2023 meetings is his).
- **Joseph Rende** — Supervisor 2024– (presides from Jan 2024 on; the un-named
  presiding voice from 2024 on is his).
- **Barbara DiGiacinto** — Councilwoman (all years; the most frequent dissenting vote).
- **Saleem Hussain** — Councilman (Deputy Supervisor 2026).
- **Jose Berra** — Councilman, Deputy Supervisor 2024–25 (serves all years 2022–2026).
- **Matt Milim** — Councilman Jan 2022–Dec 2025 (elected Nov 2021; did not seek
  re-election in 2025; in 2026 appears as a private citizen).
- **Sonny Vataj** — Councilman, joined 2026 (replaced Milim).

Staff heard in meetings (kept out of member attribution): Allison Simon (Clerk),
Roland (Town Attorney), Robert "Bob" Spolzino (special counsel), Kevin (Town
Administrator), Abbas (Comptroller), Matt Traynor (Rec & Parks), Adam Kaufman
(Planner), "Sal" (Water/Sewer).

## Notes
- Member attribution is **name-based** (a member is credited when named, addressed,
  or presiding) with per-position confidence — directional, not a vote record.
  Because the ASR labels every councilmember "Councilman", the lone councilwoman
  (DiGiacinto) and the Supervisor-vs-Councilman "Joe/Jose" overlap were resolved
  by role and roll-call cues.
- Standing procedural mechanics (minutes approval, consensus agenda, adjournment,
  roll call, liaison reports) are kept in each meeting's detail but excluded from
  the rolled-up "agenda items" list so substantive matters aren't buried.
- Sentiment runs −1 (opposed / heavy concern) to +1 (supportive / favorable).
- The un-named presiding voice is always resolved to the specific Supervisor for
  that meeting's era (Schiliro through 2023, Rende from 2024) — never left as a
  generic "Supervisor" role, since the seat changed hands partway through the
  archive.

## dossiers.json
Researched per-member stakeholder profiles (contact email where published, a short researched bio, and a "how to engage" read — key issues, what earns their support, what draws skepticism, and a recommended approach). The engagement read is synthesized from the member's meeting record plus public background; treat it as directional and verify before relying on it. Emails are only included where actually found on the town directory (the town blocks scraping, so several are blank).
