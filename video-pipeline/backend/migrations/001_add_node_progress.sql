-- Migration: Add node-level progress tracking columns + new enum values
-- Run this against your PostgreSQL database before starting the updated backend

-- 1. Add new PipelineStatus enum values
ALTER TYPE pipelinestatus ADD VALUE IF NOT EXISTS 'fetching_trending';
ALTER TYPE pipelinestatus ADD VALUE IF NOT EXISTS 'generating_diagrams';

-- 2. Add node-level progress tracking columns
ALTER TABLE pipeline_tasks ADD COLUMN IF NOT EXISTS current_node VARCHAR;
ALTER TABLE pipeline_tasks ADD COLUMN IF NOT EXISTS completed_nodes VARCHAR[];
ALTER TABLE pipeline_tasks ADD COLUMN IF NOT EXISTS failed_node VARCHAR;
ALTER TABLE pipeline_tasks ADD COLUMN IF NOT EXISTS node_error VARCHAR;

-- 3. Remove 'post_processing' is not possible with ALTER TYPE DROP VALUE in Postgres
-- (enum values cannot be removed). Old rows with post_processing will still work
-- since we handle unknown statuses gracefully.
