-- ===========================================================================
-- Deflekt — one-time / manual RDS maintenance
-- ===========================================================================
-- The CI deploy runs the `migrate` container automatically, which already
-- does everything in section 1. This file is a manual escape hatch you can run
-- against RDS (psql "$DATABASE_URL" -f db/rds-setup.sql) if you ever need to
-- fix things by hand. Every statement is idempotent and tenant-safe.
--
-- Requires a role with rds_superuser (the RDS master user) for CREATE EXTENSION.
-- ===========================================================================

-- 1. pgvector -------------------------------------------------------------
--    Retrieval + the chunks.embedding column depend on this extension.
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Purge legacy "mock" chunks ------------------------------------------
--    Documents ingested before the local-storage fallback landed were stored
--    with a placeholder body, which poisons retrieval. This removes only those
--    exact placeholder chunks; real content is untouched. Safe to run anytime.
--    (New ingests can no longer create these — ingestion now fails loudly.)
DELETE FROM chunks
WHERE content = 'This is a mock document because no AWS credentials were provided.';

-- 3. Flag documents that produced no usable chunks ------------------------
--    Surfaces sources that need re-uploading in the dashboard.
UPDATE documents d
SET status = 'failed',
    error_message = COALESCE(error_message, 'No chunks found — please re-upload this source.'),
    updated_at = now()
WHERE d.status = 'completed'
  AND NOT EXISTS (SELECT 1 FROM chunks c WHERE c.document_id = d.id);
