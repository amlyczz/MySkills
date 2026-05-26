import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Play, Activity, CheckCircle2, AlertTriangle, Flame, Link2, XCircle,
  TerminalSquare, ExternalLink, Clock, Eye, MessageSquare, ArrowLeft,
  Loader2, Pause, Zap, Image, Music, Film, FileText, GitBranch, RotateCcw
} from 'lucide-react'

// ── Types ──

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
  recent_stars_7d?: number
}

// ── Pipeline DAG config ──

type DagNodeId = typeof DAG_NODES[number]

const DAG_NODES = [
  'github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script',
  'hitl_script_review',
  'generate_diagrams', 'generate_blueprint',
  'hitl_blueprint_review',
  'audio_design', 'render_compose',
] as const

const NODE_META: Record<string, { label: string; icon: typeof CheckCircle2 }> = {
  github_trending:         { label: 'GitHub Trending',    icon: Flame },
  hitl_trending_review:    { label: 'Trending Review',    icon: Pause },
  analyze_repo:            { label: 'Repo Analysis',      icon: GitBranch },
  compose_script:          { label: 'Script Compose',     icon: FileText },
  hitl_script_review:      { label: 'Script Review',      icon: Pause },
  generate_diagrams:       { label: 'Generate Diagrams',  icon: Image },
  generate_blueprint:      { label: 'Visual Blueprint',   icon: Zap },
  hitl_blueprint_review:   { label: 'Blueprint Review',   icon: Pause },
  audio_design:            { label: 'Audio Design',       icon: Music },
  render_compose:          { label: 'Render & Compose',   icon: Film },
}

type NodeState = 'completed' | 'active' | 'hitl' | 'error' | 'idle'

// Map backend PipelineStatus → which DAG nodes are completed + current node
const STATUS_TO_PROGRESS: Record<string, { completed: string[]; current?: string }> = {
  pending:                 { completed: [] },
  hitl_trending:           { completed: ['github_trending'], current: 'hitl_trending_review' },
  analyzing:               { completed: ['github_trending', 'hitl_trending_review'], current: 'analyze_repo' },
  composing:               { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo'], current: 'compose_script' },
  hitl_script_review:      { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script'], current: 'hitl_script_review' },
  blueprinting:            { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams'], current: 'generate_blueprint' },
  hitl_blueprint_review:   { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint'], current: 'hitl_blueprint_review' },
  generate_media:          { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint', 'hitl_blueprint_review'], current: 'audio_design' },
  rendering:               { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint', 'hitl_blueprint_review', 'audio_design'], current: 'render_compose' },
  post_processing:         { completed: [...DAG_NODES.slice(0, -1)], current: 'render_compose' },
  completed:               { completed: [...DAG_NODES] },
  error:                   { completed: [] },
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const API_BASE = 'http://localhost:18274/api/v1'

// ── DAG Step Component ──

function DagStep({ nodeId, state, isLast, errorDetail, onRetry }: {
  nodeId: DagNodeId
  state: NodeState
  isLast: boolean
  errorDetail?: string
  onRetry?: (nodeId: string) => void
}) {
  const meta = NODE_META[nodeId]
  const Icon = meta.icon
  const isHITL = nodeId.startsWith('hitl_')

  const stateStyles: Record<NodeState, { ring: string; fill: string; text: string; icon: string; line: string }> = {
    completed: {
      ring: 'border-green-600 bg-green-50',
      fill: 'text-green-600',
      text: 'text-green-700 font-medium',
      icon: '',
      line: 'bg-green-400',
    },
    active: {
      ring: 'border-[var(--color-accent)] bg-[var(--color-accent-light)]',
      fill: 'text-[var(--color-accent)]',
      text: 'text-[var(--color-accent)] font-semibold',
      icon: 'animate-spin',
      line: 'bg-[var(--color-border)]',
    },
    hitl: {
      ring: 'border-amber-500 bg-amber-50',
      fill: 'text-amber-600',
      text: 'text-amber-700 font-medium',
      icon: '',
      line: 'bg-[var(--color-border)]',
    },
    error: {
      ring: 'border-red-500 bg-red-50',
      fill: 'text-red-500',
      text: 'text-red-600 font-medium',
      icon: '',
      line: 'bg-[var(--color-border)]',
    },
    idle: {
      ring: 'border-[var(--color-border)] bg-[var(--color-surface)]',
      fill: 'text-[var(--color-ink-muted)]',
      text: 'text-[var(--color-ink-muted)]',
      icon: '',
      line: 'bg-[var(--color-border)]',
    },
  }

  const s = stateStyles[state]

  return (
    <div className="flex gap-3">
      {/* Vertical track */}
      <div className="flex flex-col items-center w-6 shrink-0">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${s.ring}`}>
          {state === 'completed' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          ) : state === 'active' ? (
            <Loader2 className={`w-3.5 h-3.5 text-[var(--color-accent)] ${s.icon}`} />
          ) : state === 'hitl' ? (
            <Pause className="w-3 h-3 text-amber-600" />
          ) : state === 'error' ? (
            <XCircle className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ink-muted)]" />
          )}
        </div>
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-4 ${state === 'completed' ? 'bg-green-400' : 'bg-[var(--color-border)]'}`} />
        )}
      </div>

      {/* Label */}
      <div className="pb-4 pt-0.5 min-w-0">
        <div className={`flex items-center gap-1.5 text-sm ${s.text}`}>
          <Icon className="w-3.5 h-3.5 shrink-0 opacity-70" />
          <span>{meta.label}</span>
        </div>
        {state === 'completed' && (
          <span className="text-[10px] text-green-600/70 ml-5">Done</span>
        )}
        {state === 'active' && (
          <span className="text-[10px] text-[var(--color-accent)]/70 ml-5">Running...</span>
        )}
        {state === 'hitl' && (
          <span className="text-[10px] text-amber-600/70 ml-5">Awaiting review</span>
        )}
        {state === 'error' && (
          <div className="ml-5">
            <span className="text-[10px] text-red-500/70">Failed</span>
            {errorDetail && (
              <p className="text-[9px] text-red-400/60 mt-0.5 line-clamp-2 max-w-[180px]">{errorDetail}</p>
            )}
            {onRetry && (
              <button onClick={() => onRetry(nodeId)}
                className="mt-1 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)] transition-colors font-medium">
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        )}
        {state === 'idle' && isHITL && (
          <span className="text-[10px] text-[var(--color-ink-muted)]/50 ml-5">Review step</span>
        )}
      </div>
    </div>
  )
}

// ── Main Component ──

export default function TaskMonitor() {
  const { id: projectId, tid: taskId } = useParams<{ id: string; tid: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'url' | 'trending'>('trending')
  const [url, setUrl] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [failedNodes, setFailedNodes] = useState<Set<string>>(new Set())
  const [nodeErrors, setNodeErrors] = useState<Record<string, string>>({})
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [pipelineStatus, setPipelineStatus] = useState<string>('pending')
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId || null)
  const [feedbackText, setFeedbackText] = useState('')
  const [restoring, setRestoring] = useState(!!taskId)

  const [trendingRepos, setTrendingRepos] = useState<TrendingRepo[] | null>(null)
  const [trendingInterest, setTrendingInterest] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const resumeWsRef = useRef<WebSocket | null>(null)
  const isTrendingMode = useRef(false)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const justStartedRef = useRef(false)  // skip restore when we just created the task

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [logs, scrollToBottom])

  useEffect(() => {
    return () => { wsRef.current?.close(); resumeWsRef.current?.close() }
  }, [])

  // ── Compute node state ──
  const getNodeState = useCallback((node: string): NodeState => {
    if (completedNodes.has(node)) return 'completed'
    if (failedNodes.has(node)) return 'error'
    if (currentNode === node) {
      if (node.startsWith('hitl_')) return 'hitl'
      return 'active'
    }
    return 'idle'
  }, [completedNodes, failedNodes, currentNode])

  // ── Restore task state from backend when taskId is provided via URL ──
  useEffect(() => {
    if (!taskId) return
    // Skip restore if we just created this task (navigate() changed URL mid-session)
    if (justStartedRef.current) {
      justStartedRef.current = false
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`${API_BASE}/task/${taskId}`)
        if (!res.ok) { setRestoring(false); return }
        const data = await res.json()

        const status: string = data.status || 'pending'
        setPipelineStatus(status)

        const progress = STATUS_TO_PROGRESS[status] || { completed: [] }

        // Restore DAG progress
        setCompletedNodes(new Set(progress.completed))
        setCurrentNode(progress.current || null)

        // Build log entries from progress
        const restoreLogs: string[] = [`> Task restored (status: ${status})`]
        for (const node of progress.completed) {
          restoreLogs.push(`> [${NODE_META[node]?.label || node}] COMPLETED`)
        }
        if (progress.current) {
          restoreLogs.push(`> [${NODE_META[progress.current]?.label || progress.current}] IN PROGRESS...`)
        }
        if (status === 'completed') {
          restoreLogs.push('> PIPELINE COMPLETED.')
        }
        if (status === 'error') {
          restoreLogs.push('> ERROR: Task failed.')
        }
        setLogs(restoreLogs)

        // Detect trending mode from repo_url
        const repoUrl: string = data.repo_url || ''
        if (repoUrl === 'trending') {
          isTrendingMode.current = true
          setActiveTab('trending')
        } else if (repoUrl && repoUrl !== 'pending') {
          setActiveTab('url')
          setUrl(repoUrl)
        }

        // Restore HITL state for paused tasks
        if (status === 'hitl_trending' && data.trending_repos) {
          const repos = data.trending_repos as (TrendingRepo & { one_liner?: string })[]
          setTrendingRepos(repos.map(r => ({
            owner: r.owner, name: r.name, url: r.url, description: r.description,
            stars: r.stars, forks: r.forks || 0, language: r.language,
            final_score: r.final_score, one_liner: r.one_liner || r.description || '',
            recent_stars_7d: r.recent_stars_7d,
          })))
          restoreLogs.push('> PAUSED: Awaiting repository selection.')
          setLogs([...restoreLogs])
        } else if (status === 'hitl_script_review' && data.script) {
          const s = data.script as ScriptData
          setHitlEvent({ reason: 'script_review', message: 'Review the script.', script: s })
          restoreLogs.push('> PAUSED: Awaiting script review.')
          setLogs([...restoreLogs])
        } else if (status === 'hitl_blueprint_review' && data.blueprint) {
          setHitlEvent({ reason: 'blueprint_review', message: 'Review the blueprint.' })
          restoreLogs.push('> PAUSED: Awaiting blueprint review.')
          setLogs([...restoreLogs])
        }
      } catch {
        setLogs(['> Failed to restore task state.'])
      }
      setRestoring(false)
    })()
  }, [taskId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return
    startWithUrl(activeTab === 'url' ? url : 'trending')
  }

  const startWithUrl = async (repoUrl: string) => {
    if (!projectId) return
    const isTrending = repoUrl === 'trending'
    isTrendingMode.current = isTrending
    setLogs([`> Initiating synthesis for: ${isTrending ? 'GitHub Trending' : repoUrl}`])
    setCompletedNodes(new Set())
    setFailedNodes(new Set())
    setNodeErrors({})
    setPipelineStatus('pending')
    setCurrentNode(isTrending ? 'github_trending' : 'analyze_repo')
    setHitlEvent(null)
    setTrendingRepos(null)

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, project_type: 'educational' }),
      })
      const data = await res.json()
      if (data.task_id) {
        setCurrentTaskId(data.task_id)
        justStartedRef.current = true  // prevent restore effect from resetting state
        // Update URL so refresh can restore state
        navigate(`/project/${projectId}/task/${data.task_id}`, { replace: true })
        connectWebSocket(data.task_id, repoUrl)
      }
    } catch {
      setLogs(prev => [...prev, `> Error: Could not connect to backend.`])
      setCurrentNode(null)
    }
  }

  // Map active node → pipeline status for real-time status display
  const NODE_TO_STATUS: Record<string, string> = {
    github_trending: 'pending',
    hitl_trending_review: 'hitl_trending',
    analyze_repo: 'analyzing',
    compose_script: 'composing',
    hitl_script_review: 'hitl_script_review',
    generate_diagrams: 'blueprinting',
    generate_blueprint: 'blueprinting',
    hitl_blueprint_review: 'hitl_blueprint_review',
    audio_design: 'generate_media',
    render_compose: 'rendering',
  }

  const handleWsMessage = (data: { type: string; [key: string]: unknown }) => {
    if (data.type === 'state_change') {
      const node = data.node as string
      const status = data.status as string
      const detail = data.detail as string | undefined
      if ((node === 'github_trending' || node === 'hitl_trending_review') && !isTrendingMode.current) return
      if (status === 'completed') {
        setCurrentNode(null)
        setCompletedNodes(prev => new Set([...prev, node]))
      } else if (status === 'active') {
        setCurrentNode(node)
        // Update pipeline status based on the active node
        const mapped = NODE_TO_STATUS[node]
        if (mapped) setPipelineStatus(mapped)
      } else if (status === 'error') {
        setFailedNodes(prev => new Set([...prev, node]))
        setCurrentNode(null)
        setPipelineStatus('error')
        if (detail) setNodeErrors(prev => ({ ...prev, [node]: detail }))
      }
      const label = NODE_META[node]?.label || node
      const logLine = detail ? `[${label}] ${status.toUpperCase()} — ${detail}` : `[${label}] ${status.toUpperCase()}`
      setLogs(prev => [...prev, `> ${logLine}`])
    } else if (data.type === 'hitl') {
      setLogs(prev => [...prev, `> PAUSED: ${data.message as string}`])
      // Map HITL reason to pipeline status for correct DAG state
      const v = (data.value || {}) as Record<string, unknown>
      const reasonToStatus: Record<string, string> = {
        trending_review: 'hitl_trending',
        script_review: 'hitl_script_review',
        blueprint_review: 'hitl_blueprint_review',
      }
      const hitlStatus = reasonToStatus[(v.reason as string) || ''] || 'hitl'
      setPipelineStatus(hitlStatus)
      if (v.reason === 'trending_review') {
        const repos = (v.repos || []) as (TrendingRepo & { url?: string; one_liner?: string })[]
        setTrendingRepos(repos.map(r => ({
          owner: r.owner, name: r.name, url: r.url, description: r.description,
          stars: r.stars, forks: r.forks || 0, language: r.language,
          final_score: r.final_score, one_liner: r.one_liner || r.description || '',
        })))
      } else if (v.reason === 'script_review') {
        const s = v.script as ScriptData | undefined
        setHitlEvent({ reason: 'script_review', message: (v.message as string) || 'Review the script.',
          script: s ? { full_text: s.full_text || '', total_duration_est: s.total_duration_est || 0, segments: s.segments || [] } : undefined })
      } else if (v.reason === 'blueprint_review') {
        setHitlEvent({ reason: 'blueprint_review', message: (v.message as string) || 'Review the blueprint.',
          preview_url: v.preview_url as string | undefined, scene_count: v.scene_count as number | undefined,
          total_duration_frames: v.total_duration_frames as number | undefined, total_duration_seconds: v.total_duration_seconds as number | undefined })
      } else {
        setHitlEvent({ reason: (v.reason as string) || (data.message as string), message: data.message as string })
      }
    } else if (data.type === 'pipeline_end') {
      setPipelineStatus('completed')
      setLogs(prev => [...prev, `> PIPELINE COMPLETED.`]); setCurrentNode(null)
    } else if (data.type === 'error') {
      setPipelineStatus('error')
      setLogs(prev => [...prev, `> ERROR: ${data.content as string}`]); setCurrentNode(null)
    }
  }

  const connectWebSocket = (tid: string, repoUrl: string) => {
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/stream/${tid}?repo_url=${encodeURIComponent(repoUrl)}`)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, `> Connection closed.`])
  }

  const handleRetry = (nodeId: string) => {
    if (!currentTaskId) return
    // Clear error state for the failed node
    setFailedNodes(prev => { const n = new Set(prev); n.delete(nodeId); return n })
    setNodeErrors(prev => { const n = { ...prev }; delete n[nodeId]; return n })
    setPipelineStatus('pending')
    setLogs(prev => [...prev, `> Retrying from ${NODE_META[nodeId]?.label || nodeId}...`])

    // Open retry WebSocket
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/retry/${currentTaskId}`)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, `> Retry connection closed.`])
    ws.onerror = () => setLogs(prev => [...prev, `> Retry connection failed.`])
  }

  const confirmAndSendHitl = (action: string, feedback?: string, repoUrl?: string) => {
    const confirmMap: Record<string, string> = {
      select: `确认选择这个仓库？\n\n${repoUrl}`,
      approve: '确认通过审核？',
      reject: '确认驳回并重试？',
      abort: '确认中止整个管线？此操作不可撤销。',
    }
    const msg = confirmMap[action]
    if (msg && !confirm(msg)) return

    if (!currentTaskId) return
    setHitlEvent(null); setFeedbackText('')
    if (action === 'select') { setTrendingRepos(null); setLogs(prev => [...prev, `> Selected: ${repoUrl}`]) }
    else if (action === 'approve') { setLogs(prev => [...prev, `> Approved`]) }
    else if (action === 'reject') { setTrendingRepos(null); setCurrentNode('github_trending'); setLogs(prev => [...prev, `> Rejected — retrying`]) }
    else if (action === 'abort') { setLogs(prev => [...prev, `> Aborted.`]) }
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/resume/${currentTaskId}`)
    resumeWsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ action, feedback, repo_url: repoUrl }))
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onerror = () => setLogs(prev => [...prev, `> Resume connection failed.`])
  }

  const hasHitl = !!(hitlEvent || trendingRepos)

  // For restored completed/error tasks, don't show the source form
  const isRestoredTerminal = !!taskId && !restoring

  // Compute overall progress
  const totalSteps = DAG_NODES.length
  const completedCount = completedNodes.size
  const progressPct = Math.round((completedCount / totalSteps) * 100)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
        <button onClick={() => navigate(`/project/${projectId}`)}
          className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          {currentTaskId && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pipelineStatus === 'error' ? 'bg-red-500' :
                    pipelineStatus === 'completed' ? 'bg-green-500' :
                    'bg-[var(--color-accent)]'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">{progressPct}%</span>
            </div>
          )}
          <span className="text-xs text-[var(--color-ink-muted)] font-mono">
            {currentTaskId ? `Task ${currentTaskId.slice(0, 8)}` : 'Pipeline Monitor'}
          </span>
        </div>
      </div>

      {/* ── Layout: sidebar + right split ── */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left sidebar: Source + DAG — 280px */}
        <div className="w-[280px] shrink-0 flex flex-col border-r border-[var(--color-border)] overflow-y-auto bg-[var(--color-surface)]">
          {/* Source — only show for new tasks */}
          {!isRestoredTerminal && (
            <section className="p-4 border-b border-[var(--color-border)]">
              <div className="flex border-b border-[var(--color-border)] mb-3">
                {(['trending', 'url'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                      activeTab === tab ? 'border-[var(--color-accent)] text-[var(--color-accent)]' : 'border-transparent text-[var(--color-ink-muted)]'
                    }`}>
                    {tab === 'trending' ? <><Flame className="w-3.5 h-3.5" /> Trending</> : <><Link2 className="w-3.5 h-3.5" /> URL</>}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit}>
                {activeTab === 'url' ? (
                  <div className="flex gap-2">
                    <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/..."
                      className="flex-1 min-w-0 border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]" />
                    <button type="submit" disabled={!url.trim()}
                      className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-30">
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div>
                    {currentNode === 'github_trending' && !trendingRepos ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-[var(--color-ink-secondary)] text-xs">
                        <Activity className="w-3.5 h-3.5 animate-spin text-[var(--color-accent)]" /> Fetching trending repos...
                      </div>
                    ) : !trendingRepos ? (
                      <div className="flex gap-2">
                        <input type="text" value={trendingInterest} onChange={e => setTrendingInterest(e.target.value)} placeholder="Interest? (optional)"
                          className="flex-1 min-w-0 border border-[var(--color-border)] rounded px-2.5 py-1.5 text-xs bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)]" />
                        <button type="submit"
                          className="bg-[var(--color-accent)] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[var(--color-accent-hover)] flex items-center gap-1">
                          <Flame className="w-3 h-3" /> Go
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </form>
            </section>
          )}

          {/* Restored task info — show repo URL for existing tasks */}
          {isRestoredTerminal && (
            <section className="p-4 border-b border-[var(--color-border)]">
              <h3 className="text-[11px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider mb-2">Task Info</h3>
              <p className="text-xs text-[var(--color-ink)] font-mono break-all">{url || 'trending'}</p>
            </section>
          )}

          {/* DAG Steps */}
          <section className="p-4 flex-1">
            <h3 className="text-[11px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider mb-3">Pipeline Steps</h3>
            <div className="space-y-0">
              {DAG_NODES.map((node, i) => (
                <DagStep
                  key={node}
                  nodeId={node}
                  state={getNodeState(node)}
                  isLast={i === DAG_NODES.length - 1}
                  errorDetail={nodeErrors[node]}
                  onRetry={failedNodes.has(node) ? handleRetry : undefined}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right: Output (30vh) + HITL Review (remaining) */}
        <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
          {/* Terminal — fixed 30vh */}
          <section className="terminal flex flex-col overflow-hidden shrink-0" style={{ height: '30vh' }}>
            <div className="border-b border-[#2A2722] px-3 py-1.5 flex items-center gap-2 bg-[#1F1D19]">
              <TerminalSquare className="w-3 h-3 text-[var(--color-ink-muted)]" />
              <span className="text-[10px] text-[var(--color-ink-muted)] flex-1 font-mono">Output</span>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#991B1B]/60" />
                <div className="w-2 h-2 rounded-full bg-[#92400E]/60" />
                <div className="w-2 h-2 rounded-full bg-[#166534]/60" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 text-[11px] leading-relaxed">
              {restoring ? (
                <p className="text-[var(--color-ink-muted)] italic font-mono">Restoring task state...</p>
              ) : logs.length === 0 ? (
                <p className="text-[var(--color-ink-muted)] italic font-mono">Waiting for pipeline output...</p>
              ) : (
                logs.map((log, i) => (
                  <p key={i} className={`mb-0.5 font-mono ${
                    log.includes('ERROR') ? 'text-red-400' :
                    log.includes('PAUSED') ? 'text-amber-400' :
                    log.includes('COMPLETED') ? 'text-green-400' :
                    log.includes('Approved') ? 'text-green-400' :
                    'text-[#C8C4BC]'
                  }`}>{log}</p>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>

          {/* HITL — fills remaining space */}
          {hasHitl && (
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              {/* ── HITL: Trending Review ── */}
              {trendingRepos && (
                <section className="paper p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: 'var(--font-serif)' }}>
                      <Flame className="w-4 h-4 text-[var(--color-accent)]" /> Select a Repository
                    </h2>
                    <span className="text-[10px] text-[var(--color-ink-muted)]">{trendingRepos.length} repos scored</span>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0 -mx-1">
                    <div className="space-y-1.5 px-1">
                      {trendingRepos.map((repo) => (
                        <div key={repo.url}
                          className="border border-[var(--color-border)] rounded-md p-3 cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]/30 transition-all"
                          onClick={() => confirmAndSendHitl('select', undefined, repo.url)}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="text-xs font-semibold text-[var(--color-ink)] truncate">
                              {repo.owner}/<span className="text-[var(--color-accent)]">{repo.name}</span>
                            </h3>
                            <div className="flex items-center gap-2 shrink-0">
                              {repo.language && <span className="text-[10px] text-[var(--color-indigo)] bg-[var(--color-indigo-light)] px-1.5 py-0.5 rounded">{repo.language}</span>}
                              <span className="text-[10px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded">{repo.final_score.toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-[var(--color-ink-secondary)] line-clamp-2 leading-relaxed mb-1">{repo.one_liner}</p>
                          <div className="flex items-center gap-3 text-[10px] text-[var(--color-ink-muted)]">
                            <span>{'★'} {repo.stars.toLocaleString()}</span>
                            {repo.recent_stars_7d != null && repo.recent_stars_7d > 0 && (
                              <span className="text-green-600 font-medium">+{repo.recent_stars_7d.toLocaleString()}/7d</span>
                            )}
                            <span>{repo.forks.toLocaleString()} forks</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-[var(--color-border)] shrink-0">
                    <button onClick={() => confirmAndSendHitl('reject', 'Try different repos')}
                      className="flex-1 border border-[var(--color-border)] py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 hover:bg-[var(--color-surface)] text-[var(--color-ink)]">
                      <XCircle className="w-3.5 h-3.5" /> Retry
                    </button>
                    <button onClick={() => confirmAndSendHitl('abort')}
                      className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-error)] px-2 py-1.5 text-xs">Abort</button>
                  </div>
                </section>
              )}

              {/* ── HITL: Script Review ── */}
              {hitlEvent && hitlEvent.reason?.includes('script') && (
                <section className="paper p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: 'var(--font-serif)' }}>
                      <MessageSquare className="w-4 h-4 text-[var(--color-accent)]" /> Script Review
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-ink-muted)]">
                      <Clock className="w-3 h-3" />
                      <span>{hitlEvent.script ? formatDuration(hitlEvent.script.total_duration_est) : '--:--'}</span>
                      <span>{hitlEvent.script?.segments.length || 0} segments</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0 mb-2">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[var(--color-surface)]">
                        <tr className="text-[var(--color-ink-muted)] text-[10px] uppercase tracking-wider border-b border-[var(--color-border)]">
                          <th className="py-1.5 px-1.5 text-left w-8">#</th>
                          <th className="py-1.5 px-1.5 text-left">Text</th>
                          <th className="py-1.5 px-1.5 text-center w-10">Dur</th>
                          <th className="py-1.5 px-1.5 text-left w-24">Hook</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hitlEvent.script?.segments.map((seg, i) => (
                          <tr key={i} className="border-b border-[var(--color-border)]/40">
                            <td className="py-1.5 px-1.5 text-[var(--color-ink-muted)] font-mono text-[10px]">{i + 1}</td>
                            <td className="py-1.5 px-1.5 text-[var(--color-ink)] leading-relaxed">{seg.text}</td>
                            <td className="py-1.5 px-1.5 text-center text-[var(--color-accent)] font-mono text-[10px]">{seg.duration_est}s</td>
                            <td className="py-1.5 px-1.5 text-[var(--color-ink-secondary)] text-[10px]">{seg.visual_hook}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="shrink-0 pt-2 border-t border-[var(--color-border)]">
                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Optional feedback..."
                      className="w-full border border-[var(--color-border)] rounded p-2 text-xs mb-2 resize-none h-14 focus:outline-none focus:border-[var(--color-accent)] bg-[var(--color-bg)] text-[var(--color-ink)]" />
                    <div className="flex gap-2">
                      <button onClick={() => confirmAndSendHitl('approve')}
                        className="flex-1 bg-[var(--color-status-success)] text-white py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-90">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => confirmAndSendHitl('reject', feedbackText || 'Please improve')}
                        className="flex-1 border border-[var(--color-border)] py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 hover:bg-[var(--color-surface)] text-[var(--color-ink)]">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => confirmAndSendHitl('abort')}
                        className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-error)] px-2 py-1.5 text-xs">Abort</button>
                    </div>
                  </div>
                </section>
              )}

              {/* ── HITL: Blueprint Review ── */}
              {hitlEvent && hitlEvent.reason?.includes('blueprint') && (
                <section className="paper p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h2 className="text-sm font-bold flex items-center gap-1.5" style={{ fontFamily: 'var(--font-serif)' }}>
                      <Eye className="w-4 h-4 text-[var(--color-indigo)]" /> Blueprint Review
                    </h2>
                    <a href={hitlEvent.preview_url || 'http://localhost:31200/'} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 border border-[var(--color-indigo)] text-[var(--color-indigo)] px-2.5 py-1 rounded text-[10px] font-medium hover:bg-[var(--color-indigo-light)]">
                      <ExternalLink className="w-3 h-3" /> Remotion Studio
                    </a>
                  </div>
                  <div className="border border-[var(--color-border)] rounded p-3 mb-3 flex items-center gap-4 bg-[var(--color-bg)] text-xs shrink-0">
                    <span className="text-[var(--color-ink-muted)]">Scenes: <span className="font-mono text-[var(--color-ink)]">{hitlEvent.scene_count || '-'}</span></span>
                    <span className="text-[var(--color-ink-muted)]">Duration: <span className="font-mono text-[var(--color-ink)]">{hitlEvent.total_duration_seconds ? formatDuration(hitlEvent.total_duration_seconds) : '-'}</span></span>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0" />
                  <div className="shrink-0 pt-2 border-t border-[var(--color-border)]">
                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Optional feedback..."
                      className="w-full border border-[var(--color-border)] rounded p-2 text-xs resize-none h-14 mb-2 focus:outline-none focus:border-[var(--color-indigo)] bg-[var(--color-bg)] text-[var(--color-ink)]" />
                    <div className="flex gap-2">
                      <button onClick={() => confirmAndSendHitl('approve')}
                        className="flex-1 bg-[var(--color-status-success)] text-white py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-90">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => confirmAndSendHitl('reject', feedbackText || 'Please improve')}
                        className="flex-1 border border-[var(--color-border)] py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1 hover:bg-[var(--color-surface)] text-[var(--color-ink)]">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button onClick={() => confirmAndSendHitl('abort')}
                        className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-error)] px-2 py-1.5 text-xs">Abort</button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
