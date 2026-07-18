-- =============================================================================
-- Adds a free-text category to `document`, for content that doesn't fit the
-- existing `document_kind` enum (code_chapter/master_plan/policy/... — scoped
-- to land-use/code documents). Rather than growing that enum every time a new
-- source category shows up (budgets, financial reports, water quality
-- reports, local laws, meeting agendas/minutes, permit rollups, ...), this
-- carries the source's own category label — used for citation display and
-- as a mechanical, auditable way to confirm ingestion never crosses scope
-- (e.g. `SELECT DISTINCT category FROM document` should never show an
-- excluded source like legal-case research).
-- =============================================================================

ALTER TABLE document ADD COLUMN IF NOT EXISTS category text;
CREATE INDEX IF NOT EXISTS document_muni_category_idx ON document (municipality_id, category);
