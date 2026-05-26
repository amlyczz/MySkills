-- Migration 002: Remove project_category from pipeline_tasks and unused columns from projects

-- pipeline_tasks: drop project_category column
ALTER TABLE pipeline_tasks DROP COLUMN IF EXISTS project_category;

-- projects: drop source_type, repo_url, language, stars, thumbnail_url
ALTER TABLE projects DROP COLUMN IF EXISTS source_type;
ALTER TABLE projects DROP COLUMN IF EXISTS repo_url;
ALTER TABLE projects DROP COLUMN IF EXISTS language;
ALTER TABLE projects DROP COLUMN IF EXISTS stars;
ALTER TABLE projects DROP COLUMN IF EXISTS thumbnail_url;
