-- Migration 003: Add twitter_content column to pipeline_tasks

ALTER TABLE pipeline_tasks ADD COLUMN IF NOT EXISTS twitter_content JSONB;
