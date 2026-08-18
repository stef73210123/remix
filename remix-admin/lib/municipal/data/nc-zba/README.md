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

## Roster (one board turnover across the archive)
This board had no prior dataset — the roster below was compiled during the
2026 backfill from what board members were actually heard across all 44
meetings, cross-checked against the town's official ZBA webpage. The board
turned over its chair and one seat partway through the archive:

- **Ray Rodriguez** — Chairman (joined as a new member October 2023,
  chairman by 2024)
- **Ed Lashins** — Member (first heard in 2024; likely joined alongside or
  shortly after Rodriguez)
- **Bob Greer** — Member (serves throughout 2022–2026)
- **Scott Stopnik** — Member (serves throughout 2022–2026)
- **John Stipo** — Member (serves throughout 2022–2026; the ASR renders this
  surname many different ways — "Steepo," "Stiefo," "Cepo," "Steve Both/Out"
  — all mapped to him in `MEMBER_ALIAS`)
- **Joe Monticelli** — *Inactive.* Chairman through 2023 (last heard
  2023-12-07); gone from the record by 2024. ASR also renders this "Joe
  Monticello."
- **Lester Berkelhammer** — *Inactive.* The fifth 2022–2023 member; a
  26-year board veteran who resigned July 1, 2023 and passed away shortly
  after (announced at the 2023-09-07 and 2023-10-05 meetings). Real spelling
  uncertain from the badly-garbled ASR ("Bergenheimer," "Purple Hammer,"
  "Circle Howard," "Birkel Hammer") — "Berkelhammer" was chosen as the more
  plausible surname.

Staff heard in meetings (kept out of member attribution): **Lori Zawacki**
(Board Secretary/Clerk, handles roll calls), the Town Attorney (referred to
as "Roland" in later meetings, "Jerry" in 2022), Town Planner **Adam
Kaufman**, the Building Inspector (referred to as "Rob," likely Rob
Melillo), and various Town consultants/engineers named per-meeting (e.g.
KSCJ).

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
