# North Castle Architectural Review Board — transcript analysis dataset

Same pipeline as `../nc-townboard` and `../nc-planning`, applied to the
**Architectural Review Board**. Served by the board page
(`/admin/municipal/board?muni=nc&body=arb`).

## Contents
- `transcripts/<YYYY-MM-DD>.txt` — raw meeting-video transcript (ASR, no speaker
  labels).
- `analysis.json` — per-meeting agenda items with themes and sentiment, plus
  roll-ups. Shape defined by `lib/municipal/analysis.ts`.
- `aggregate.py` — regenerates `analysis.json` from the per-meeting analyses.

## Coverage — a single meeting, and why
This board's coverage in the source transcript archive is just **one meeting**
(2022-02-02). Broader ARB coverage wasn't recoverable from the source
recordings available at ingestion time — this is a corpus limitation, not a
sign the board is inactive. Treat every stat on this board's page as a single
data point, not a trend.

## No roster yet
No Architectural Review Board member is named anywhere in the one available
transcript — deliberation on its sole case ("I'm okay with what I saw," "I'm
fine," etc.) has no name cues at all. Per this site's attribution methodology,
no member position is invented without at least low-confidence evidence, so
`MEMBERS` in `aggregate.py` is intentionally empty and the board page shows no
member-sentiment cards. Add real names to `MEMBERS`/`MEMBER_ALIAS` once a
future meeting transcript names individuals.

## Notes
- Member attribution (once a roster exists) will be **name-based** (a member
  is credited when named, addressed, or presiding) with per-position
  confidence — directional, not a vote record.
- Sentiment runs −1 (opposed / heavy concern) to +1 (supportive / favorable).
