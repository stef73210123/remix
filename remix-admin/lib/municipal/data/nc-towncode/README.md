# North Castle Town Code — AI review dataset

A chapter-by-chapter review of the Code of the Town of North Castle (codified
by General Code, published at ecode360.com/NO0492 — legislation through
3-11-2026), generated from the full 649-page code text. Served by the Town
Code page (`/admin/municipal/towncode?muni=nc`), reachable from a standalone
top-level "Town Code" nav item.

## Contents
- `analysis.json` — `{ meta, chapters }`. `meta` carries dataset-level stats
  (rating/category counts, average score); `chapters` is one entry per
  substantive code chapter (52 of the code's 54 chapters — 2 are `(Reserved)`
  placeholders with no content and were excluded). Shape defined by
  `lib/municipal/townCode.ts`.

## Per-chapter fields
- `rating` — `Good shape` / `Standard` / `Needs work`, plus a 0-100
  `progressScore` and a `ratingRationale` citing something specific in the
  text (a stale reference, an internal inconsistency, a gap relative to
  current peer practice, etc.) — not generic praise/criticism.
- `recommendations` — each tagged with whichever optimization lens actually
  fits that specific suggestion (Business friendliness, Government
  efficiency, Fiscal/budget impact, Environmental protection, Housing
  affordability, Public safety, Legal/liability risk, Resident quality of
  life, or an occasional bespoke lens) — chosen per chapter's real substance,
  not a fixed lens list forced onto every chapter.
- `peerComparison` — commentary on how the chapter compares to typical
  Westchester County / New York State municipal practice for that subject.
  This is grounded in general professional knowledge of standard NY
  municipal code practice, **not** a document-to-document comparison against
  other towns' actual code text (which wasn't fetched or reviewed).

## Notes
- This is AI-generated directional commentary, not legal advice.
- Source text was extracted from a 649-page PDF export of the code (the
  town's own eCode360-hosted code page returns a Cloudflare bot challenge to
  automated fetches, so the export was supplied directly rather than
  scraped).
- 15 of 52 chapters were rated "Needs work," 19 "Standard," and 18 "Good
  shape" (average score 66/100) as of this generation. Notable finds
  surfaced along the way: stale/incorrect statutory citations (Ch. 5 cites
  "CPLR § 600.20" for a rule that's actually in Criminal Procedure Law; Ch.
  186 still names the NYS Racing and Wagering Board, abolished in 2012),
  unlocalized-template artifacts (Ch. 292 cites a Pennsylvania "magisterial
  district judge"; Ch. 152's own HISTORY line says "Town of New Castle"), a
  brand-new 2025 amendment with a typo (Ch. 336 references "Water District
  No. 8" where it means "No. 9"), and a First Amendment risk flag on Ch.
  233's canvasser-registration requirement.
