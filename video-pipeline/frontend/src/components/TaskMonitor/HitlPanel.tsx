import { useState, useEffect } from 'react'
import { Pause, ChevronDown, RotateCcw, Film, Image } from 'lucide-react'
import type { HitlEvent, TrendingRepo } from './types'
import type { Node } from '@xyflow/react'

interface HitlPanelProps {
  hasHitl: boolean
  trendingRepos: TrendingRepo[] | null
  hitlEvent: HitlEvent | null
  pipelineStatus: string
  rfNodes: Node[]
  handleRetry: (nodeId?: string) => void
  confirmAndSendHitl: (action: string, feedback?: string, repoUrl?: string) => void
}

export function HitlPanel({ hasHitl, trendingRepos, hitlEvent, pipelineStatus, rfNodes, handleRetry, confirmAndSendHitl }: HitlPanelProps) {
  const [showHitl, setShowHitl] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')

  useEffect(() => { if (hasHitl) setShowHitl(true) }, [hasHitl])

  return (
    <section className={`paper overflow-hidden border-2 transition-colors ${hasHitl ? 'border-[#8B6914] bg-[#FDF8EC]' : 'border-[#E2DED6] bg-white'}`}>
      <button onClick={() => setShowHitl(!showHitl)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FAF9F6] transition-colors">
        <div className="flex items-center gap-2">
          <Pause className={`w-4 h-4 ${hasHitl ? 'text-[#8B6914]' : 'text-[#A8A29E]'}`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${hasHitl ? 'text-[#8B6914]' : 'text-[#A8A29E]'}`}>
            Human-in-the-Loop
          </span>
          {hasHitl && <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#8B6914] text-white font-bold">ACTIVE</span>}
        </div>
        <ChevronDown className={`w-4 h-4 ${hasHitl ? 'text-[#8B6914]' : 'text-[#A8A29E]'} transition-transform ${showHitl ? '' : '-rotate-90'}`} />
      </button>
      {showHitl && hasHitl && (
        <div className="border-t border-[#E2DED6] p-3 space-y-3">
          {trendingRepos && (
            <div className="space-y-3">
              <p className="text-sm text-[#57534E]">Select a repository to analyze:</p>
              <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto">
                {trendingRepos.map((r, i) => (
                  <button key={i} onClick={() => confirmAndSendHitl('select', undefined, r.url)}
                    className="text-left p-3 rounded-lg border border-[#E2DED6] bg-white hover:border-[#7C2D2D] hover:bg-[#FBF1F1] transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-[#1C1917]">{r.owner}/{r.name}</span>
                      <span className="text-[11px] text-[#A8A29E] flex items-center gap-1">⭐ {r.stars.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-[#57534E] line-clamp-1">{r.one_liner}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => confirmAndSendHitl('retry')}
                  className="text-xs px-3 py-1.5 rounded-md border border-[#E2DED6] text-[#57534E] hover:bg-white transition-colors">
                  Retry
                </button>
                <button onClick={() => confirmAndSendHitl('abort')}
                  className="text-xs px-3 py-1.5 rounded-md border border-[#991B1B]/30 text-[#991B1B] hover:bg-[#FEF2F2] transition-colors">
                  Abort
                </button>
              </div>
            </div>
          )}

          {hitlEvent?.reason === 'script_review' && hitlEvent.script && (() => {
            const segments = hitlEvent.script.segments || []
            const totalDur = hitlEvent.script.total_duration_est || 0
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[#57534E] font-medium">
                    <span className="text-[#7C2D2D] font-bold">{segments.length}</span> segments
                  </span>
                  <span className="text-[#57534E] font-medium">
                    Total <span className="text-[#7C2D2D] font-bold">{totalDur.toFixed(0)}s</span>
                  </span>
                  <span className="text-[#A8A29E]">|</span>
                  <span className="text-[#A8A29E] text-[11px]">Scroll to review each segment</span>
                </div>

                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-white rounded-lg border border-[#E2DED6] hover:border-[#CCC7BD] transition-colors">
                      <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 44 }}>
                        <span className="w-7 h-7 rounded-full bg-[#7C2D2D] text-white text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-[10px] font-mono text-[#A8A29E] tabular-nums">
                          {seg.duration_est?.toFixed(0) || '?'}s
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#1C1917] leading-relaxed mb-1.5">{seg.text}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {seg.visual_hook && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#FBF1F1] text-[#7C2D2D]">
                              <Film className="w-3 h-3" /> {seg.visual_hook}
                            </span>
                          )}
                          {seg.assigned_asset && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#EEF2F7] text-[#1E3A5F]">
                              <Image className="w-3 h-3" /> {seg.assigned_asset}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-end">
                        <div className="w-1 rounded-full bg-[#7C2D2D]/20"
                          style={{ height: `${Math.max(8, Math.min(48, (seg.duration_est || 1) / Math.max(1, totalDur) * 48))}px` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <details className="text-[11px]">
                  <summary className="text-[#A8A29E] cursor-pointer hover:text-[#57534E]">View full script text</summary>
                  <pre className="mt-2 p-2 bg-[#FAF9F6] rounded text-[#57534E] whitespace-pre-wrap text-[11px] leading-relaxed max-h-[120px] overflow-y-auto border border-[#E2DED6]">
                    {hitlEvent.script.full_text}
                  </pre>
                </details>

                <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                  placeholder="Optional feedback for rejection..."
                  className="w-full p-2.5 text-[12px] rounded-lg border border-[#E2DED6] bg-white text-[#1C1917] resize-none h-14
                    focus:outline-none focus:border-[#7C2D2D] placeholder:text-[#A8A29E]" />
                <div className="flex gap-2">
                  <button onClick={() => confirmAndSendHitl('approve', '')}
                    className="flex-1 py-2 text-xs font-semibold rounded-md bg-[#166534] text-white hover:bg-[#145326]">Approve</button>
                  <button onClick={() => confirmAndSendHitl('reject', feedbackText)}
                    className="flex-1 py-2 text-xs font-semibold rounded-md bg-[#8B6914] text-white hover:bg-[#7A5B11]">Reject</button>
                  <button onClick={() => confirmAndSendHitl('abort')}
                    className="flex-1 py-2 text-xs font-semibold rounded-md border border-[#991B1B] text-[#991B1B] hover:bg-[#FEF2F2]">Abort</button>
                </div>
              </div>
            )
          })()}

          {hitlEvent?.reason === 'blueprint_review' && (
            <div className="space-y-3">
              <p className="text-sm text-[#57534E]">
                {hitlEvent.scene_count || 0} scenes, ~{hitlEvent.total_duration_seconds?.toFixed(1) || 0}s
              </p>
              {hitlEvent.preview_url && (
                <a href={hitlEvent.preview_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#1E3A5F] hover:underline font-medium">
                  Open Remotion Preview ↗
                </a>
              )}
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                placeholder="Optional feedback..."
                className="w-full p-2.5 text-[12px] rounded-lg border border-[#E2DED6] bg-white text-[#1C1917] resize-none h-16
                  focus:outline-none focus:border-[#7C2D2D] placeholder:text-[#A8A29E]" />
              <div className="flex gap-2">
                <button onClick={() => confirmAndSendHitl('approve', '')}
                  className="flex-1 py-2 text-xs font-semibold rounded-md bg-[#166534] text-white hover:bg-[#145326]">Approve</button>
                <button onClick={() => confirmAndSendHitl('reject', feedbackText)}
                  className="flex-1 py-2 text-xs font-semibold rounded-md bg-[#8B6914] text-white hover:bg-[#7A5B11]">Reject</button>
                <button onClick={() => confirmAndSendHitl('abort')}
                  className="flex-1 py-2 text-xs font-semibold rounded-md border border-[#991B1B] text-[#991B1B] hover:bg-[#FEF2F2]">Abort</button>
              </div>
            </div>
          )}

          {hitlEvent?.reason === 'analyze_review' && (
            <div className="space-y-3">
              {hitlEvent.error ? (
                <div className="p-3 bg-[#FEF2F2] border border-[#991B1B]/20 rounded-lg">
                  <p className="text-xs text-[#991B1B] font-semibold mb-1">Analysis Failed</p>
                  <p className="text-[11px] text-[#991B1B]/80 font-mono break-all">{hitlEvent.error}</p>
                </div>
              ) : hitlEvent.analysis ? (
                <div className="space-y-2">
                  {hitlEvent.analysis.title && (
                    <div>
                      <span className="text-[10px] text-[#A8A29E] uppercase tracking-wide">Title</span>
                      <p className="text-sm font-semibold text-[#1C1917]">{hitlEvent.analysis.title}</p>
                    </div>
                  )}
                  {hitlEvent.analysis.tagline && (
                    <div>
                      <span className="text-[10px] text-[#A8A29E] uppercase tracking-wide">Tagline</span>
                      <p className="text-xs text-[#57534E]">{hitlEvent.analysis.tagline}</p>
                    </div>
                  )}
                  {hitlEvent.analysis.quick_start && (
                    <div>
                      <span className="text-[10px] text-[#A8A29E] uppercase tracking-wide">Quick Start</span>
                      <p className="text-xs text-[#57534E] font-mono bg-[#FAF9F6] px-2 py-1 rounded border border-[#E2DED6] truncate">{hitlEvent.analysis.quick_start}</p>
                    </div>
                  )}
                  {hitlEvent.analysis.use_cases && (
                    <div>
                      <span className="text-[10px] text-[#A8A29E] uppercase tracking-wide">Use Cases</span>
                      <p className="text-xs text-[#57534E]">{hitlEvent.analysis.use_cases}</p>
                    </div>
                  )}
                  {hitlEvent.analysis.source_code_highlights?.length ? (
                    <div>
                      <span className="text-[10px] text-[#A8A29E] uppercase tracking-wide">Code Highlights</span>
                      <ul className="mt-1 space-y-1">
                        {hitlEvent.analysis.source_code_highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="text-xs text-[#57534E] flex items-start gap-1">
                            <span className="text-[#7C2D2D]">•</span>{h}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-[#57534E]">No analysis data available.</p>
              )}
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
                placeholder="Optional feedback for retry..."
                className="w-full p-2.5 text-[12px] rounded-lg border border-[#E2DED6] bg-white text-[#1C1917] resize-none h-16
                  focus:outline-none focus:border-[#7C2D2D] placeholder:text-[#A8A29E]" />
              <div className="flex gap-2">
                <button onClick={() => confirmAndSendHitl('approve', '')}
                  className="flex-1 py-2 text-xs font-semibold rounded-md bg-[#166534] text-white hover:bg-[#145326]">Approve</button>
                <button onClick={() => confirmAndSendHitl('retry', feedbackText)}
                  className="flex-1 py-2 text-xs font-semibold rounded-md bg-[#8B6914] text-white hover:bg-[#7A5B11]">Retry</button>
                <button onClick={() => confirmAndSendHitl('abort')}
                  className="flex-1 py-2 text-xs font-semibold rounded-md border border-[#991B1B] text-[#991B1B] hover:bg-[#FEF2F2]">Abort</button>
              </div>
            </div>
          )}

          {pipelineStatus === 'error' && !hasHitl && (
            <div className="space-y-3">
              <p className="text-sm text-[#991B1B] font-medium">Pipeline encountered an error:</p>
              {rfNodes.filter(n => n.data.state === 'error').map(n => (
                <div key={n.id} className="p-2 bg-[#FEF2F2] rounded-lg border border-[#991B1B]/20 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#991B1B] font-semibold">{n.data.label as string}</p>
                    <p className="text-[10px] text-[#991B1B]/70">FAILED</p>
                  </div>
                  <button onClick={() => handleRetry(n.id)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-[#7C2D2D] text-[#7C2D2D]
                      hover:bg-[#7C2D2D] hover:text-white transition-colors">
                    <RotateCcw className="w-3 h-3" /> Retry
                  </button>
                </div>
              ))}
              <button onClick={() => handleRetry()}
                className="w-full text-[10px] py-1 rounded border border-[#E2DED6] text-[#A8A29E] hover:bg-[#FAF9F6]">
                Retry entire pipeline (fresh run)
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
