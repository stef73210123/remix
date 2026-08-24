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

## Roster (researched from Town records, not the transcript)
No member is named by full name in the one available transcript, but the
board's membership is documented in the Town's own records: a January 2019
ARB letter to the Town Board signs **Beata Buhl-Tatka (Chair), Susan Geffen,
Angelo Monaco, Chris Tuzzo, John Scarlato**, and the Town's 2025 ARB agenda
lists the same board with one seat turned over — **Mel Orellana** replacing
Monaco (transition date not pinned down; the fifth seat's occupant on
2022-02-02 is therefore uncertain, and Monaco is marked inactive). Buhl-Tatka
chaired continuously across 2019–2025, so the presiding voice in the 2022
transcript is attributed to her at medium confidence by role; the other
deliberation voices ("I'm okay with what I saw," "I'm fine," "I second it")
carry no name cues and are left unattributed per this site's methodology.
**Lori J. Zawacki** is the Board Secretary (staff, not a member).

## Notes
- Member attribution (once a roster exists) will be **name-based** (a member
  is credited when named, addressed, or presiding) with per-position
  confidence — directional, not a vote record.
- Sentiment runs −1 (opposed / heavy concern) to +1 (supportive / favorable).
