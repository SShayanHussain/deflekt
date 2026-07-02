-- Enable pgvector extension on first boot.
-- Mounted into /docker-entrypoint-initdb.d/ by docker-compose.
CREATE EXTENSION IF NOT EXISTS vector;
