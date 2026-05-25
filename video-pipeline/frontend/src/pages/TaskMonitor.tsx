import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Play, Activity, CheckCircle2, AlertTriangle, Flame, Link2, XCircle, TerminalSquare, ExternalLink, Clock, Eye, MessageSquare, ArrowLeft } from 'lucide-react'

interface ScriptSegment {
  index: number
  text: string
  duration_est: number
  assigned_asset: string | null
  visual_hook: string
}

interface ScriptData {
  full_text: string
  total_duration_est: number
  segments: ScriptSegment[]
}

interface HitlEvent {
  reason: string
  message: string
  script?: ScriptData
  preview_url?: string
  scene_count?: number
  total_duration_frames?: number
  total_duration_seconds?: number
}

interface TrendingRepo {
  owner: string
  name: string
  url: string
  description: string | null
  stars: number
  forks: number
  language: string | null
  final_score: number
  one_liner: string
}

const DAG_NODES = [
  'github_trending', 'analyze_repo', 'compose_script',
  'hitl_script_review',
  'generate_blueprint',
  'hitl_blueprint_review',
  'audio_design', 'render_compose',
] as const

const NODE_LABELS: Record<string, string> = {
  github_trending: 'GitHub Trending',
  analyze_repo: 'Analyze Repo',
  compose_script: 'Compose Script',
  hitl_script_review: 'Script Review',
  generate_blueprint: 'Blueprint',
  hitl_blueprint_review: 'Blueprint Review',
  audio_design: 'Audio Design',
  render_compose: 'Render + Mix',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function TaskMonitor() {
  const { id: projectId, tid: taskId } = useParams<{ id: string; tid: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'url' | 'trending'>('url')
  const [url, setUrl] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId || null)
  const [feedbackText, setFeedbackText] = useState('')

  const [trendingRepos, setTrendingRepos] = useState<TrendingRepo[] | null>(null)
  const [isFetchingTrending, setIsFetchingTrending] = useState(false)
  const [trendingError, setTrendingError] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const resumeWsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [logs, scrollToBottom])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      resumeWsRef.current?.close()
    }
  }, [])

  const fetchTrending = async () => {
    setIsFetchingTrending(true)
    setTrendingError(false)
    try {
      const res = await fetch('http://localhost:18274/api/v1/trending?limit=10')
      const data = await res.json()
      setTrendingRepos(data)
    } catch (e) {
      setTrendingError(true)
      setLogs(prev => [...prev, `> Error fetching trending repos: ${e}`])
    }
    setIsFetchingTrending(false)
  }

  useEffect(() => {
    if (activeTab === 'trending' && !trendingRepos && !isFetchingTrending && !trendingError) {
      fetchTrending()
    }
  }, [activeTab, trendingRepos, isFetchingTrending, trendingError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return

    const targetUrl = activeTab === 'url' ? url : 'trending'
    setLogs(prev => [...prev, `> Initiating synthesis for: ${targetUrl}`])
    setCompletedNodes(new Set())
    setCurrentNode('analyze_repo')
    setHitlEvent(null)

    try {
      const res = await fetch(`http://localhost:18274/api/v1/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: targetUrl, project_type: 'educational' }),
      })
      const data = await res.json()

      if (data.task_id) {
        setCurrentTaskId(data.task_id)
        connectWebSocket(data.task_id, targetUrl)
      }
    } catch {
      setLogs(prev => [...prev, `> Error: Could not connect to backend.`])
      setCurrentNode(null)
    }
  }

  const connectWebSocket = (tid: string, repoUrl: string) => {
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/stream/${tid}?repo_url=${encodeURIComponent(repoUrl)}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'state_change') {
        if (data.status === 'completed') {
          setCurrentNode(null)
          setCompletedNodes(prev => new Set([...prev, data.node]))
        } else {
          setCurrentNode(data.node)
        }
        setLogs(prev => [...prev, `> [${NODE_LABELS[data.node] || data.node}] ${data.status.toUpperCase()}`])
      } else if (data.type === 'log') {
        setLogs(prev => {
          const lastLog = prev[prev.length - 1]
          if (lastLog && lastLog.startsWith(`> [${NODE_LABELS[data.node] || data.node}] STREAM:`)) {
            const newLogs = [...prev]
            newLogs[newLogs.length - 1] += data.content
            return newLogs
          }
          return [...prev, `> [${NODE_LABELS[data.node] || data.node}] STREAM: ${data.content}`]
        })
      } else if (data.type === 'hitl') {
        setLogs(prev => [...prev, `> ⚠ PIPELINE PAUSED: ${data.message}`])
        fetch(`http://localhost:18274/api/v1/task/${tid}`)
          .then(res => res.json())
          .then(taskData => {
            if (taskData.status === 'hitl_trending') {
              setTrendingRepos(taskData.trending_repos)
            } else {
              const evt: HitlEvent = {
                reason: taskData.status || data.message,
                message: 'Pipeline paused for your review.',
                script: taskData.script ? {
                  full_text: taskData.script.full_text,
                  total_duration_est: taskData.script.total_duration_est,
                  segments: taskData.script.segments || [],
                } : undefined,
                preview_url: undefined,
              }
              setHitlEvent(evt)
            }
          })
      } else if (data.type === 'pipeline_end') {
        setLogs(prev => [...prev, `> PIPELINE COMPLETED.`])
        setCurrentNode(null)
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, `> ERROR: ${data.content}`])
        setCurrentNode(null)
      }
    }

    ws.onclose = () => {
      setLogs(prev => [...prev, `> WebSocket connection closed.`])
    }
  }

  const handleHitlDecision = (action: string, feedback?: string, repoUrl?: string) => {
    if (!currentTaskId) return
    setHitlEvent(null)
    setFeedbackText('')
    if (action === 'select') {
      setTrendingRepos(null)
      setLogs(prev => [...prev, `> Selected Trending Repo: ${repoUrl}`])
    } else if (action === 'approve') {
      setLogs(prev => [...prev, `> ✓ Approved — continuing pipeline`])
    } else if (action === 'reject') {
      setLogs(prev => [...prev, `> ✗ Rejected — regenerating with feedback`])
    }

    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/resume/${currentTaskId}`)
    resumeWsRef.current = ws

    ws.onopen = () => ws.send(JSON.stringify({ action, feedback, repo_url: repoUrl }))

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'state_change') {
        if (data.status === 'completed') {
          setCurrentNode(null)
          setCompletedNodes(prev => new Set([...prev, data.node]))
        } else {
          setCurrentNode(data.node)
        }
        setLogs(prev => [...prev, `> [${NODE_LABELS[data.node] || data.node}] ${data.status.toUpperCase()}`])
      } else if (data.type === 'log') {
        setLogs(prev => [...prev, `> STREAM: ${data.content}`])
      } else if (data.type === 'hitl') {
        setLogs(prev => [...prev, `> ⚠ PIPELINE PAUSED: ${data.message}`])
        fetch(`http://localhost:18274/api/v1/task/${currentTaskId}`)
          .then(res => res.json())
          .then(taskData => {
            if (taskData.status === 'hitl_trending') {
              setTrendingRepos(taskData.trending_repos)
            } else {
              const evt: HitlEvent = {
                reason: taskData.status,
                message: 'Pipeline paused for your review.',
                script: taskData.script ? {
                  full_text: taskData.script.full_text,
                  total_duration_est: taskData.script.total_duration_est,
                  segments: taskData.script.segments || [],
                } : undefined,
                preview_url: taskData.preview_url,
              }
              setHitlEvent(evt)
            }
          })
      } else if (data.type === 'pipeline_end') {
        setLogs(prev => [...prev, `> PIPELINE COMPLETED.`])
        setCurrentNode(null)
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, `> ERROR: ${data.content}`])
        setCurrentNode(null)
      }
    }
  }

  const isScriptReview = hitlEvent?.reason?.includes('script')
  const isBlueprintReview = hitlEvent?.reason?.includes('blueprint')

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col font-sans">
      {/* Back nav */}
      <button
        onClick={() => navigate(`/project/${projectId}`)}
        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Project
      </button>

      {/* HITL Modals — identical to before */}
      {hitlEvent && isScriptReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-4xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-cyan-400" /> Script Review
              </h2>
              <div className="flex items-center gap-3 text-[var(--color-text-secondary)] text-sm">
                <Clock className="w-4 h-4" />
                <span>{hitlEvent.script ? formatDuration(hitlEvent.script.total_duration_est) : '--:--'}</span>
                <span>|</span>
                <span>{hitlEvent.script?.segments.length || 0} segments</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--color-bg)]">
                  <tr className="text-[var(--color-text-secondary)] text-xs uppercase tracking-wider border-b border-white/10">
                    <th className="py-2 px-3 text-left w-10">#</th>
                    <th className="py-2 px-3 text-left">Text</th>
                    <th className="py-2 px-3 text-center w-16">Dur</th>
                    <th className="py-2 px-3 text-left w-36">Visual Hook</th>
                    <th className="py-2 px-3 text-left w-28">Asset</th>
                  </tr>
                </thead>
                <tbody>
                  {hitlEvent.script?.segments.map((seg, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-[var(--color-text-muted)] font-mono">{i + 1}</td>
                      <td className="py-3 px-3 text-white leading-relaxed">{seg.text}</td>
                      <td className="py-3 px-3 text-center text-cyan-400 font-mono">{seg.duration_est}s</td>
                      <td className="py-3 px-3 text-[var(--color-text-secondary)] text-xs">{seg.visual_hook}</td>
                      <td className="py-3 px-3 text-amber-400/70 text-xs truncate max-w-28">{seg.assigned_asset || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-white/10 bg-black/30">
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Optional: describe what needs improvement..." className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm mb-4 resize-none h-20 focus:outline-none focus:border-[var(--color-accent)]" />
              <div className="flex gap-3">
                <button onClick={() => handleHitlDecision('approve')} className="flex-1 bg-green-600/80 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Approve</button>
                <button onClick={() => handleHitlDecision('reject', feedbackText || 'Please improve the script')} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject & Regenerate</button>
                <button onClick={() => handleHitlDecision('abort')} className="text-[var(--color-text-muted)] hover:text-red-400 px-4 py-3 text-sm transition-colors">Abort</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hitlEvent && isBlueprintReview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3"><Eye className="w-6 h-6 text-purple-400" /> Blueprint Visual Review</h2>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">Review the visual blueprint in Remotion Studio</p>
            <div className="bg-black/30 rounded-lg p-5 mb-6 border border-white/10 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[var(--color-text-secondary)]">Scenes</span><span className="text-white font-mono">{hitlEvent.scene_count || '—'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[var(--color-text-secondary)]">Duration</span><span className="text-white font-mono">{hitlEvent.total_duration_seconds ? formatDuration(hitlEvent.total_duration_seconds) : '—'}</span></div>
              <a href={hitlEvent.preview_url || 'http://localhost:31200/'} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 py-3 rounded-lg font-medium transition-all border border-purple-500/30 mt-4"><ExternalLink className="w-5 h-5" /> Open Remotion Studio</a>
            </div>
            <div className="space-y-3">
              <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Optional: describe visual issues..." className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white text-sm resize-none h-20 focus:outline-none focus:border-purple-400" />
              <div className="flex gap-3">
                <button onClick={() => handleHitlDecision('approve')} className="flex-1 bg-green-600/80 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Approve</button>
                <button onClick={() => handleHitlDecision('reject', feedbackText || 'Please improve the blueprint visuals')} className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Reject & Regenerate</button>
                <button onClick={() => handleHitlDecision('abort')} className="text-[var(--color-text-muted)] hover:text-red-400 px-4 py-3 text-sm transition-colors">Abort</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Left: Commission + DAG */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Play className="w-5 h-5 text-[var(--color-accent)]" /> Task Commission</h2>

            <div className="flex bg-black/40 rounded-lg p-1 mb-6">
              <button onClick={() => setActiveTab('trending')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'trending' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-white'}`}><Flame className="w-4 h-4" /> Trending</button>
              <button onClick={() => setActiveTab('url')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'url' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-white'}`}><Link2 className="w-4 h-4" /> Manual URL</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'url' ? (
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Repository URL</label>
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/..." className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors" />
                  <button type="submit" className="w-full mt-4 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-2"><Play className="w-4 h-4 fill-current" /> Commence Synthesis</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentNode === 'github_trending' && !trendingRepos ? (
                    <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-secondary)] gap-3 bg-black/30 rounded-lg border border-white/5"><Activity className="w-6 h-6 animate-spin text-[var(--color-accent)]" /><span>Agent is scraping and scoring GitHub repositories...</span></div>
                  ) : trendingRepos ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input type="text" id="feedbackInput" placeholder="Not satisfied? e.g. 'I want Python AI agents'" className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[var(--color-accent)] text-sm" />
                        <button type="button" onClick={() => { const input = document.getElementById('feedbackInput') as HTMLInputElement; if (input.value) { handleHitlDecision('retry', input.value); setTrendingRepos(null) } }} className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-lg text-sm transition-all">Retry Search</button>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        {trendingRepos.map((repo) => (
                          <div key={repo.url} onClick={() => handleHitlDecision('select', undefined, repo.url)} className="bg-black/40 border border-white/10 hover:border-[var(--color-accent)]/50 rounded-lg p-4 cursor-pointer transition-all hover:bg-[var(--color-accent)]/10 group">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-white font-semibold group-hover:text-[var(--color-accent)] transition-colors text-base truncate pr-2">{repo.owner} / <span className="text-[var(--color-accent)]">{repo.name}</span></h3>
                              <span className="shrink-0 bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs px-2 py-0.5 rounded font-bold border border-[var(--color-accent)]/30">⭐ {repo.final_score.toFixed(1)}</span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2 leading-relaxed">{repo.one_liner}</p>
                            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] font-mono">
                              <span className="flex items-center gap-1 text-yellow-500/80">★ {repo.stars.toLocaleString()}</span>
                              {repo.language && <span className="text-[var(--color-accent-purple)]/80">{repo.language}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button type="submit" className="w-full mt-4 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-2"><Play className="w-4 h-4 fill-current" /> Find Trending Projects</button>
                  )}
                </div>
              )}
            </form>
          </section>

          {/* DAG */}
          <section className="glass-panel p-6 flex-1">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-[var(--color-accent-purple)]" /> Pipeline DAG</h2>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-white/5 rounded-full"></div>
              <div className="space-y-4 relative z-10">
                {DAG_NODES.map(node => {
                  const isActive = currentNode === node
                  const isDone = completedNodes.has(node)
                  const isHITL = node.startsWith('hitl_')
                  return (
                    <div key={node} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 shadow-[0_0_10px_var(--color-accent)]' : isDone ? 'border-green-500 bg-green-500/20' : isHITL ? 'border-amber-500/30 bg-black/40' : 'border-white/10 bg-black/40'}`}>
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : isActive ? <Activity className="w-4 h-4 text-[var(--color-accent)] animate-spin-slow" /> : isHITL ? <AlertTriangle className="w-3 h-3 text-amber-500/50" /> : <div className="w-2 h-2 rounded-full bg-white/20"></div>}
                      </div>
                      <div className={`flex-1 p-3 rounded-lg border transition-all duration-300 ${isActive ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5' : isDone ? 'border-green-500/30 bg-green-500/5' : isHITL ? 'border-amber-500/20 bg-amber-500/5' : 'border-white/5 bg-black/20'}`}>
                        <h3 className={`font-medium text-sm ${isActive ? 'text-[var(--color-accent)] glow-text' : isDone ? 'text-green-400' : isHITL ? 'text-amber-400' : 'text-[var(--color-text-secondary)]'}`}>{NODE_LABELS[node]}</h3>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Right: Log Viewer */}
        <div className="lg:col-span-7 h-[85vh]">
          <section className="glass-panel h-full flex flex-col overflow-hidden">
            <div className="bg-black/60 border-b border-white/10 p-4 flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <h2 className="text-sm font-mono text-[var(--color-text-secondary)] flex-1">System Synthesis Output</h2>
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80"></div><div className="w-3 h-3 rounded-full bg-yellow-500/80"></div><div className="w-3 h-3 rounded-full bg-green-500/80"></div></div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-[#0B0E14]/80">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic">Awaiting synthesis initiation...</div>
              ) : (
                logs.map((log, i) => (
                  <p key={i} className={`mb-1.5 leading-relaxed break-words ${log.includes('ERROR') || log.includes('⚠') ? 'text-red-400' : log.includes('PAUSED') ? 'text-amber-400' : log.includes('COMPLETED') ? 'text-green-400' : log.includes('✓') ? 'text-green-400' : log.includes('✗') ? 'text-orange-400' : log.startsWith('>') ? 'text-[var(--color-accent)]' : 'text-[#A0A8B8]'}`}>{log}</p>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
