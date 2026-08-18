# North Castle Zoning Board of Appeals — transcript analysis dataset

Same pipeline as `../nc-townboard` and `../nc-planning`, applied to the
**Zoning Board of Appeals** over 2022–2026. Served by the board page
(`/admin/municipal/board?muni=nc&body=zba`) and member profiles.

## Contents
- `transcripts/<YYYY-MM-DD>.txt` — raw meeting-video transcripts (ASR, no speaker
  labels), one per ZBA meeting.
- `analysis.json` — per-meeting variance applications with themes and
  sentiment, plus roll-ups. Shape defined by `lib/municipal/analysis.ts`.
- `aggregate.py` — regenerates `analysis.json` from the per-meeting analyses.

## Roster
This board had no prior dataset — the roster below was compiled during the
2026 backfill from what board members were actually heard across all 44
meetings, cross-checked against the town's official ZBA webpage.

- **Ray Rodriguez** — Chairman
- **Ed Lashins** — Member
- **Bob Greer** — Member
- **Scott Stopnik** — Member
- **John Stipo** — Member (the ASR renders this surname many different ways —
  "Steepo," "Stiefo," "Cepo," "Steve Both/Out" — all mapped to him in
  `MEMBER_ALIAS`)

Staff heard in meetings (kept out of member attribution): **Lori Zawacki**
(Board Secretary/Clerk, handles roll calls), **Roland** (Town Attorney), and
various Town consultants/engineers named per-meeting (e.g. Adam Kaufman,
KSCJ) and the Building Inspector.

## Notes
- The ZBA hears variance applications (area, use, and off-street-parking
  variances); most cases are short — a hearing and a vote — rather than the
  extended multi-meeting debate typical of Planning/Town Board matters, so
  case summaries here are proportionately brief.
- Member attribution is **name-based** (a member is credited when named,
  addressed, or presiding) with per-position confidence — directional, not a
  vote record.
- Sentiment runs −1 (opposed / heavy concern) to +1 (supportive / favorable).
- Several applicant/property names across the archive are ASR-garbled beyond
  confident reconstruction and were left blank or flagged in that meeting's
  `attributionNote` rather than guessed at.
