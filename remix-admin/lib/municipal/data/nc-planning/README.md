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
4. Case names are cross-referenced against the agenda items as read into each
   meeting record and collapsed to canonical applications via `case_canon.json`
   (e.g. "92 & 94 Round Hill Road" appeared under 4 name variants; "Whipple" is
   the ASR mangling of "Whippoorwill"). This took the case list from 127 raw
   entries to 80 canonical applications. Distinct lots within one subdivision are
   kept separate.

Roster (from the town's official Board Members list): **Christopher Carthy**
(Chairman — presides, so the un-named presiding voice in the ASR is his),
**Steven Sauro**, **Michael Pollack**, **Thomas Crispi**, **Lawrence Ruisi**
(members); Joseline Huerta (Secretary). Staff/consultants heard in meetings:
Adam Kaufman (Town Planner), John Kellard (Town Engineer), Vincent DeAnno
(Conservation liaison).

The per-meeting analyses were run with this confirmed roster (the transcripts
were re-analyzed once the official Board Members list was available), so members
are attributed by their real names directly. `aggregate.py` still carries a
`MEMBER_ALIAS` map as a safety net for residual ASR manglings (Ruizi→Ruisi,
Pollock→Pollack, "Sorrell/Sorro"→Sauro, "Chris"/"Chair"→Christopher Carthy,
"Tom"→Thomas Crispi). All five members — including Thomas Crispi — now carry
attributed positions; where a member was absent or not individually named in a
given meeting, no position was invented (flagged per meeting in
`attributionNote`).

Sentiment scale is −1 (opposed / heavy concern) to +1 (supportive / favorable).
