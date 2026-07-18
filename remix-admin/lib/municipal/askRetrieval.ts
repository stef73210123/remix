/**
 * Full-text retrieval for the "Ask" feature — searches the real documents
 * ingested by scripts/municipal/backfill-rag-phase1.mjs (meeting transcripts
 * via `meeting_text`, and analysis/budget/permit summaries via `document`)
 * for passages relevant to a resident's question, so the model can cite real
 * sources instead of only the small static digest in askContext.ts.
 *
 * v1 deliberately uses Postgres full-text search (tsvector/GIN, already in
 * the schema) rather than vector embeddings — no chunking, no new API
 * dependency. Whole-document ts_rank_cd ranking + ts_headline snippet
 * extraction works fine without pre-chunked rows; chunking only becomes
 * necessary once an embedding model's bounded context window forces it,
 * which is future work (see the plan this was built from).
 */
import { sql } from './db'

export interface RetrievedPassage {
  sourceKind: 'meeting_text' | 'document'
  title: string
  date: string | null
  category: string | null
  url: string | null
  snippet: string
}

interface RetrievalRow {
  source_kind: 'meeting_text' | 'document'
  title: string
  doc_date: string | null
  category: string | null
  source_url: string | null
  rank: number
  snippet: string
}

/**
 * Runs a single ranked full-text query across meeting transcripts and
 * documents for the given municipality. Fails soft: any DB error (including
 * `NEON_DATABASE_URL` being unset, which lib/municipal/db.ts only surfaces
 * on first use, not at import time) or a municipality with nothing ingested
 * yet just returns an empty array — the caller falls back to the existing
 * static-digest-only behavior rather than erroring the whole Ask request.
 */
export async function retrieveContext(muniKey: string, question: string, k = 8): Promise<RetrievedPassage[]> {
  try {
    const rows = (await sql`
      WITH q AS (SELECT websearch_to_tsquery('english', ${question}) AS query),
           muni AS (SELECT id FROM municipality WHERE key = ${muniKey})
      SELECT 'meeting_text' AS source_kind, m.title, m.scheduled_at::date AS doc_date,
             b.display_name AS category, m.source_url,
             ts_rank_cd(mt.tsv, q.query) AS rank,
             ts_headline('english', mt.full_text, q.query, 'MaxFragments=2, MinWords=15, MaxWords=60') AS snippet
      FROM meeting_text mt
      JOIN meeting m ON m.id = mt.meeting_id
      JOIN body b ON b.id = m.body_id
      CROSS JOIN q
      CROSS JOIN muni
      WHERE m.municipality_id = muni.id AND mt.tsv @@ q.query
      UNION ALL
      SELECT 'document', d.title, d.effective_date, d.category, d.source_url,
             ts_rank_cd(d.tsv, q.query),
             ts_headline('english', d.full_text, q.query, 'MaxFragments=2, MinWords=15, MaxWords=60')
      FROM document d
      CROSS JOIN q
      CROSS JOIN muni
      WHERE d.municipality_id = muni.id AND d.tsv @@ q.query
      ORDER BY rank DESC
      LIMIT ${k}
    `) as RetrievalRow[]

    return rows.map((r) => ({
      sourceKind: r.source_kind,
      title: r.title,
      date: r.doc_date,
      category: r.category,
      // Repo-sourced documents carry a synthetic `repo://...` identifier
      // (not a real clickable page) — only surface http(s) links.
      url: r.source_url && /^https?:\/\//.test(r.source_url) ? r.source_url : null,
      snippet: r.snippet,
    }))
  } catch {
    return []
  }
}
