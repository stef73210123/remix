-- =============================================================================
-- Municipal Dashboard — initial schema
--
-- Target: Neon Postgres 16+, pgvector extension enabled.
--
-- Design principles:
--   - jurisdiction-scoped everywhere via `municipality_id`; no NC-hardcodes
--   - polyglot adapter agnostic: schema captures what a meeting IS, not how
--     it was scraped. Source-of-truth URLs live on `meeting_asset`.
--   - full-text search via GENERATED tsvector columns + GIN indexes
--   - semantic search via `pgvector` in the same DB
--   - append-only enrichment history for auditability
--   - hard exclusions from the ethical scope enforced at insert time via CHECK
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector
CREATE EXTENSION IF NOT EXISTS postgis;    -- parcel coordinates
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy matching on names

-- -----------------------------------------------------------------------------
-- Domain reference tables (small, low-churn)
-- -----------------------------------------------------------------------------

CREATE TABLE municipality (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  state         text NOT NULL,
  county        text,
  timezone      text NOT NULL DEFAULT 'America/New_York',
  meta          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE body (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id    uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  key                text NOT NULL,
  display_name       text NOT NULL,
  civicplus_agenda_id integer,
  granicus_view_id   integer,
  meeting_pattern    text,
  active             boolean NOT NULL DEFAULT true,
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, key)
);

-- Meetings + assets
CREATE TYPE meeting_status AS ENUM ('scheduled', 'held', 'cancelled', 'rescheduled');

CREATE TABLE meeting (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  body_id               uuid NOT NULL REFERENCES body(id) ON DELETE CASCADE,
  municipality_id       uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  scheduled_at          timestamptz NOT NULL,
  status                meeting_status NOT NULL DEFAULT 'scheduled',
  location              text,
  title                 text,
  source_ref            text NOT NULL,
  source_url            text,
  granicus_clip_id      integer,
  granicus_event_id     integer,
  meta                  jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at         timestamptz NOT NULL DEFAULT now(),
  last_ingested_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, source_ref)
);
CREATE INDEX meeting_scheduled_idx ON meeting (municipality_id, scheduled_at DESC);
CREATE INDEX meeting_body_idx      ON meeting (body_id, scheduled_at DESC);

CREATE TYPE meeting_asset_kind AS ENUM (
  'agenda', 'minutes', 'staff_report', 'exhibit',
  'video_mp4', 'captions_vtt', 'captions_srt', 'audio_mp3', 'other'
);

CREATE TABLE meeting_asset (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  kind           meeting_asset_kind NOT NULL,
  source_url     text NOT NULL,
  blob_url       text,
  sha256         text,
  content_type   text,
  page_count     integer,
  byte_size      bigint,
  fetched_at     timestamptz,
  meta           jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (meeting_id, source_url)
);

CREATE TYPE text_extractor AS ENUM (
  'pdf-parse', 'whisper-mini', 'yt-captions', 'granicus-vtt', 'html-cheerio', 'manual'
);

CREATE TABLE meeting_text (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id       uuid NOT NULL REFERENCES meeting_asset(id) ON DELETE CASCADE,
  meeting_id     uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  extractor      text_extractor NOT NULL,
  full_text      text NOT NULL,
  lang           text NOT NULL DEFAULT 'en',
  tsv            tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(full_text, ''))) STORED,
  extracted_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meeting_text_tsv_idx ON meeting_text USING GIN (tsv);
CREATE INDEX meeting_text_meeting_idx ON meeting_text (meeting_id);

-- Transcript segments (per-segment sentiment lands in M2)
CREATE TABLE transcript_segment (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id           uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  asset_id             uuid NOT NULL REFERENCES meeting_asset(id) ON DELETE CASCADE,
  start_ms             integer NOT NULL,
  end_ms               integer NOT NULL,
  speaker_id           uuid,
  text                 text NOT NULL,
  tsv                  tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(text, ''))) STORED,
  sentiment_score      real,
  sentiment_confidence real,
  topics               text[] NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transcript_segment_tsv_idx     ON transcript_segment USING GIN (tsv);
CREATE INDEX transcript_segment_topics_idx  ON transcript_segment USING GIN (topics);
CREATE INDEX transcript_segment_meeting_idx ON transcript_segment (meeting_id, start_ms);

-- Documents
CREATE TYPE document_kind AS ENUM (
  'code_chapter', 'code_section', 'master_plan', 'comprehensive_plan',
  'policy', 'resolution', 'ordinance', 'other'
);

CREATE TABLE document (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id   uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  kind              document_kind NOT NULL,
  title             text NOT NULL,
  source_platform   text NOT NULL,
  source_url        text NOT NULL,
  blob_url          text,
  full_text         text NOT NULL DEFAULT '',
  tsv               tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(full_text, ''))) STORED,
  effective_date    date,
  superseded_by_id  uuid REFERENCES document(id),
  meta              jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_ingested_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, source_url)
);
CREATE INDEX document_tsv_idx ON document USING GIN (tsv);
CREATE INDEX document_muni_kind_idx ON document (municipality_id, kind);

-- Officials
CREATE TYPE official_kind AS ENUM ('elected', 'appointed', 'department_head', 'staff');
CREATE TYPE enrichment_status AS ENUM ('pending', 'enriched', 'partial', 'failed', 'refresh_due');

CREATE TABLE official (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id      uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  kind                 official_kind NOT NULL,
  full_name            text NOT NULL,
  aliases              jsonb NOT NULL DEFAULT '[]'::jsonb,
  title                text,
  body_ids             uuid[] NOT NULL DEFAULT '{}',
  term_start           date,
  term_end             date,
  active               boolean NOT NULL DEFAULT true,
  phone                text,
  email                text,
  linkedin_url         text,
  linkedin_confidence  real,
  day_job              text,
  employer             text,
  bio                  text,
  photo_url            text,
  affiliations         jsonb NOT NULL DEFAULT '[]'::jsonb,
  professional_licenses jsonb NOT NULL DEFAULT '[]'::jsonb,
  campaign_finance_url text,
  enrichment_status    enrichment_status NOT NULL DEFAULT 'pending',
  enrichment_sources   jsonb NOT NULL DEFAULT '{}'::jsonb,
  enriched_at          timestamptz,
  refresh_due_at       timestamptz,
  meta                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bio_no_minor_markers CHECK (
    bio IS NULL OR bio !~* '\y(minor child|underage|elementary school|middle school|high school student)\y'
  )
);
CREATE UNIQUE INDEX official_muni_name_uniq ON official (municipality_id, lower(full_name));
CREATE INDEX official_muni_active_idx ON official (municipality_id, active);
CREATE INDEX official_name_trgm ON official USING GIN (full_name gin_trgm_ops);

CREATE TABLE enrichment_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id       uuid NOT NULL REFERENCES official(id) ON DELETE CASCADE,
  field_name        text NOT NULL,
  previous_value    text,
  new_value         text,
  source_url        text,
  source_kind       text NOT NULL,
  changed_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enrichment_history_official_idx ON enrichment_history (official_id, changed_at DESC);

CREATE TABLE enrichment_rejection (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id       uuid REFERENCES official(id) ON DELETE SET NULL,
  candidate_field   text NOT NULL,
  candidate_value   text,
  source_url        text,
  rejection_reason  text NOT NULL,
  rejected_at       timestamptz NOT NULL DEFAULT now()
);

-- Speakers
CREATE TABLE speaker (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  official_id    uuid REFERENCES official(id) ON DELETE SET NULL,
  applicant_name text,
  raw_label      text NOT NULL,
  confidence     real,
  meta           jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX speaker_meeting_idx ON speaker (meeting_id);
CREATE INDEX speaker_official_idx ON speaker (official_id) WHERE official_id IS NOT NULL;

ALTER TABLE transcript_segment
  ADD CONSTRAINT transcript_segment_speaker_fk
  FOREIGN KEY (speaker_id) REFERENCES speaker(id) ON DELETE SET NULL;

-- Matters
CREATE TYPE matter_kind AS ENUM (
  'site_plan', 'subdivision', 'variance', 'special_use_permit',
  'rezoning', 'zoning_amendment', 'comprehensive_plan_update',
  'code_amendment', 'resolution', 'ordinance',
  'property_matter', 'other'
);
CREATE TYPE matter_status AS ENUM (
  'submitted', 'in_review', 'public_hearing', 'decision',
  'conditions', 'approved', 'denied', 'withdrawn', 'ongoing'
);
CREATE TYPE matter_outcome AS ENUM ('approved', 'denied', 'withdrawn');

CREATE TABLE matter (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id    uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  kind               matter_kind NOT NULL,
  slug               text NOT NULL,
  applicant_name     text,
  subject            text NOT NULL,
  description        text,
  status             matter_status NOT NULL DEFAULT 'submitted',
  application_date   date,
  decision_date      date,
  decision_outcome   matter_outcome,
  parcel_ids         uuid[] NOT NULL DEFAULT '{}',
  meeting_ids        uuid[] NOT NULL DEFAULT '{}',
  document_ids       uuid[] NOT NULL DEFAULT '{}',
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, slug)
);
CREATE INDEX matter_muni_status_idx ON matter (municipality_id, status);
CREATE INDEX matter_meetings_idx    ON matter USING GIN (meeting_ids);
CREATE INDEX matter_parcels_idx     ON matter USING GIN (parcel_ids);

-- Votes
CREATE TYPE vote_position AS ENUM ('yea', 'nay', 'abstain', 'absent', 'recused');
CREATE TYPE vote_source AS ENUM ('minutes', 'transcript', 'manual');

CREATE TABLE vote (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id     uuid NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  matter_id      uuid REFERENCES matter(id) ON DELETE SET NULL,
  official_id    uuid NOT NULL REFERENCES official(id) ON DELETE CASCADE,
  position       vote_position NOT NULL,
  motion_text    text,
  extracted_from vote_source NOT NULL,
  segment_id     uuid REFERENCES transcript_segment(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, matter_id, official_id)
);
CREATE INDEX vote_official_idx ON vote (official_id, created_at DESC);
CREATE INDEX vote_matter_idx   ON vote (matter_id);

-- Entities + parcels + mentions
CREATE TYPE entity_kind AS ENUM ('person', 'address', 'parcel', 'applicant', 'project', 'business');

CREATE TABLE entity (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id  uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  kind             entity_kind NOT NULL,
  canonical_name   text NOT NULL,
  aliases          jsonb NOT NULL DEFAULT '[]'::jsonb,
  mention_count    integer NOT NULL DEFAULT 0,
  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX entity_muni_kind_idx ON entity (municipality_id, kind);
CREATE INDEX entity_name_trgm ON entity USING GIN (canonical_name gin_trgm_ops);

CREATE TABLE parcel (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id    uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  tax_map_id         text,
  address            text,
  coordinates        geography(Point, 4326),
  linked_matter_ids  uuid[] NOT NULL DEFAULT '{}',
  mention_count      integer NOT NULL DEFAULT 0,
  meta               jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (municipality_id, tax_map_id)
);
CREATE INDEX parcel_muni_idx ON parcel (municipality_id);
CREATE INDEX parcel_coords_gix ON parcel USING GIST (coordinates);

CREATE TYPE mention_target AS ENUM ('meeting_text', 'transcript_segment', 'document');

CREATE TABLE mention (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      uuid REFERENCES entity(id) ON DELETE CASCADE,
  parcel_id      uuid REFERENCES parcel(id) ON DELETE CASCADE,
  target_kind    mention_target NOT NULL,
  target_id      uuid NOT NULL,
  offset_start   integer,
  offset_end     integer,
  context        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (entity_id IS NOT NULL OR parcel_id IS NOT NULL)
);
CREATE INDEX mention_entity_idx ON mention (entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX mention_parcel_idx ON mention (parcel_id) WHERE parcel_id IS NOT NULL;
CREATE INDEX mention_target_idx ON mention (target_kind, target_id);

-- Embeddings
CREATE TYPE embedding_target AS ENUM ('meeting_text', 'transcript_segment', 'document');

CREATE TABLE embedding (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind    embedding_target NOT NULL,
  target_id      uuid NOT NULL,
  chunk_index    integer NOT NULL,
  chunk_text     text NOT NULL,
  vec            vector(1536),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_kind, target_id, chunk_index)
);
CREATE INDEX embedding_vec_idx ON embedding USING ivfflat (vec vector_cosine_ops) WITH (lists = 100);

-- Topics
CREATE TABLE topic (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE topic_candidate (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_string     text NOT NULL,
  embedding      vector(1536),
  sightings_count integer NOT NULL DEFAULT 1,
  first_seen_at  timestamptz NOT NULL DEFAULT now(),
  promoted_topic_id uuid REFERENCES topic(id) ON DELETE SET NULL,
  UNIQUE (raw_string)
);

CREATE TABLE segment_topic (
  segment_id  uuid NOT NULL REFERENCES transcript_segment(id) ON DELETE CASCADE,
  topic_id    uuid NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  confidence  real NOT NULL,
  PRIMARY KEY (segment_id, topic_id)
);

CREATE TABLE official_topic_sentiment (
  official_id            uuid NOT NULL REFERENCES official(id) ON DELETE CASCADE,
  topic_id               uuid NOT NULL REFERENCES topic(id) ON DELETE CASCADE,
  municipality_id        uuid NOT NULL REFERENCES municipality(id) ON DELETE CASCADE,
  positive_mentions      integer NOT NULL DEFAULT 0,
  negative_mentions      integer NOT NULL DEFAULT 0,
  neutral_mentions       integer NOT NULL DEFAULT 0,
  positive_segment_ids   uuid[] NOT NULL DEFAULT '{}',
  negative_segment_ids   uuid[] NOT NULL DEFAULT '{}',
  weighted_positive      real NOT NULL DEFAULT 0,
  weighted_negative      real NOT NULL DEFAULT 0,
  first_mention_date     date,
  last_mention_date      date,
  last_computed_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (official_id, topic_id)
);
CREATE INDEX official_topic_sentiment_muni_idx ON official_topic_sentiment (municipality_id);

-- Official positions
CREATE TYPE stance AS ENUM ('supports', 'opposes', 'neutral', 'undeclared');

CREATE TABLE official_position (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  official_id            uuid NOT NULL REFERENCES official(id) ON DELETE CASCADE,
  matter_id              uuid REFERENCES matter(id) ON DELETE CASCADE,
  topic_id               uuid REFERENCES topic(id) ON DELETE CASCADE,
  stance                 stance NOT NULL,
  confidence             real NOT NULL DEFAULT 0.5,
  derived_from_segment_ids uuid[] NOT NULL DEFAULT '{}',
  derived_from_vote_id   uuid REFERENCES vote(id) ON DELETE SET NULL,
  observed_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (matter_id IS NOT NULL OR topic_id IS NOT NULL)
);
CREATE INDEX official_position_official_idx ON official_position (official_id, observed_at DESC);

-- Alerts
CREATE TYPE alert_channel AS ENUM ('email', 'slack', 'sms');
CREATE TYPE alert_mode AS ENUM ('realtime', 'digest_daily');

CREATE TABLE alert_rule (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email        text NOT NULL,
  name              text NOT NULL,
  active            boolean NOT NULL DEFAULT true,
  municipality_ids  uuid[] NOT NULL DEFAULT '{}',
  keywords          text[] NOT NULL DEFAULT '{}',
  entity_ids        uuid[] NOT NULL DEFAULT '{}',
  parcel_ids        uuid[] NOT NULL DEFAULT '{}',
  official_ids      uuid[] NOT NULL DEFAULT '{}',
  matter_ids        uuid[] NOT NULL DEFAULT '{}',
  body_ids          uuid[] NOT NULL DEFAULT '{}',
  asset_kinds       text[] NOT NULL DEFAULT '{}',
  sentiment_shift   jsonb,
  channel           alert_channel NOT NULL DEFAULT 'email',
  delivery_mode     alert_mode NOT NULL DEFAULT 'realtime',
  slack_webhook_url text,
  last_matched_at   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alert_rule_user_idx ON alert_rule (user_email, active);

CREATE TABLE alert_hit (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id            uuid NOT NULL REFERENCES alert_rule(id) ON DELETE CASCADE,
  target_kind        text NOT NULL,
  target_id          uuid NOT NULL,
  matched_at         timestamptz NOT NULL DEFAULT now(),
  sent_at            timestamptz,
  delivery_channel   alert_channel,
  snippet            text
);
CREATE INDEX alert_hit_rule_idx ON alert_hit (rule_id, matched_at DESC);
