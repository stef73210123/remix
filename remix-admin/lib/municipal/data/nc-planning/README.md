# North Castle Planning Board — transcript analysis dataset

Derived data served by the municipal board page (`/admin/municipal/board?muni=nc&body=planning`)
and member profiles.

## Contents
- `transcripts/<YYYY-MM-DD>.txt` — raw meeting-video transcripts (automatic speech
  recognition, **no speaker labels**), one per Planning Board meeting, 12 months.
- `analysis.json` — structured analysis aggregated from the transcripts: per-meeting
  cases/themes/sentiment, plus roll-ups (themes over time, per-case sentiment
  trajectory, per-member sentiment profiles). Shape defined by
  `lib/municipal/analysis.ts`.
- `aggregate.py` — regenerates `analysis.json` from per-meeting analysis files.

## How it was produced
1. Each transcript was analyzed for cases discussed, themes, overall sentiment, and
   **per-member sentiment** toward cases/themes.
2. Because the transcripts are un-diarized, member attribution is **name-based**: a
   member is credited only when named, addressed by name, or presiding (the Chair).
   Every attributed position carries a confidence (high/medium/low). Case- and
   theme-level sentiment is robust; member-level is directional, not a vote record.
3. `aggregate.py` canonicalizes themes to a controlled vocabulary, merges the same
   application across meetings, and computes the roll-ups.

Roster used for attribution: Chair (presiding, unnamed in ASR), Larry Ruizi,
Michael Pollock, Steve Sorrell, Christopher; staff Adam Kaufman (Town Planner),
John Kellard (Town Engineer), Vincent DeAnno (Conservation liaison).

Sentiment scale is −1 (opposed / heavy concern) to +1 (supportive / favorable).
