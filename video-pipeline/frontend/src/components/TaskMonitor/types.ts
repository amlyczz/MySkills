// ── Types ──

export interface ScriptSegment {
  index: number
  text: string
  duration_est: number
  assigned_asset: string | null
  visual_hook: string
}

export interface ScriptData {
  full_text: string
  total_duration_est: number
  segments: ScriptSegment[]
}

export interface HitlEvent {
  reason: string
  message: string
  script?: ScriptData
  preview_url?: string
  scene_count?: number
  total_duration_frames?: number
  total_duration_seconds?: number
  analysis?: AnalysisSummary
  error?: string
}

export interface AnalysisSummary {
  title: string
  tagline: string
  quick_start: string
  use_cases: string
  source_code_highlights: string[]
  has_content: boolean
}

export interface TrendingRepo {
  owner: string
  name: string
  url: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  final_score: number
  one_liner: string
  recent_stars_7d?: number
}
