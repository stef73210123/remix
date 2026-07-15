# North Castle Town Board — transcript analysis dataset

Same pipeline as `../nc-planning`, applied to the elected **Town Board** over
2024–2026 (55 meetings). Served by the board page
(`/admin/municipal/board?muni=nc&body=town_board`) and member profiles.

## Contents
- `transcripts/<YYYY-MM-DD>.txt` — raw meeting-video transcripts (ASR, no speaker
  labels), one per Town Board meeting.
- `analysis.json` — per-meeting agenda items / resolutions with themes and
  sentiment, plus roll-ups (themes over time, per-item sentiment trajectory,
  per-member sentiment profiles). Shape defined by `lib/municipal/analysis.ts`.
- `aggregate.py` — regenerates `analysis.json` from the per-meeting analyses.

## Roster (with the 2024→2026 seat turnover)
- **Joseph Rende** — Supervisor (presides; the un-named presiding voice is his).
- **Barbara DiGiacinto** — Councilwoman (all years; the most frequent dissenting vote).
- **Saleem Hussain** — Councilman (Deputy Supervisor 2026).
- **Jose Berra** — Councilman, Deputy Supervisor 2024–25 (serves all three years).
- **Matt Milim** — Councilman 2024–2025 only (left after 2025; in 2026 appears
  as a private citizen).
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

## dossiers.json
Researched per-member stakeholder profiles (contact email where published, a short researched bio, and a "how to engage" read — key issues, what earns their support, what draws skepticism, and a recommended approach). The engagement read is synthesized from the member's meeting record plus public background; treat it as directional and verify before relying on it. Emails are only included where actually found on the town directory (the town blocks scraping, so several are blank).
