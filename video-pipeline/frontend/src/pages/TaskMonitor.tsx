import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Flame, Link2, MessageSquare, ArrowLeft,
  Loader2, Pause, Zap, Image, Music, Film, FileText, GitBranch, RotateCcw,
  TerminalSquare, XCircle,
} from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  MarkerType,
  useNodesState,
  useEdgesState,
  BaseEdge,
  getBezierPath,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

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

const API_BASE = 'http://localhost:18274/api/v1'

type NodeState = 'completed' | 'active' | 'hitl' | 'error' | 'idle'

const DAG_NODES = [
  'github_trending', 'github_url', 'twitter_url',
  'hitl_trending_review',
  'analyze_repo', 'analyze_twitter',
  'compose_script', 'hitl_script_review',
  'generate_diagrams', 'generate_blueprint', 'hitl_blueprint_review',
  'audio_design', 'render_compose',
] as const

const NODE_META: Record<string, { label: string }> = {
  github_trending:       { label: 'GitHub Trending' },
  github_url:            { label: 'GitHub URL' },
  twitter_url:           { label: 'Twitter' },
  hitl_trending_review:  { label: 'Trending Review' },
  analyze_repo:          { label: 'Repo Analyzer' },
  analyze_twitter:       { label: 'Twitter Analyzer' },
  compose_script:        { label: 'Script Composer' },
  hitl_script_review:    { label: 'Script Review' },
  generate_diagrams:     { label: 'Generate Diagrams' },
  generate_blueprint:    { label: 'Visual Blueprint' },
  hitl_blueprint_review: { label: 'Blueprint Review' },
  audio_design:          { label: 'Audio Design' },
  render_compose:        { label: 'Render & Export' },
}

// ── React Flow: Node Definitions ──

const INITIAL_NODES: Node[] = [
  // Phase 1: Source - Column 0
  { id: 'github_trending', type: 'dagSource', position: { x: 0, y: 0 }, data: { label: '🔥 GitHub Trending', nodeId: 'github_trending', isHitl: false } },
  { id: 'github_url',      type: 'dagSource', position: { x: 0, y: 100 }, data: { label: '🔗 GitHub URL', nodeId: 'github_url', isHitl: false } },
  { id: 'twitter_url',     type: 'dagSource', position: { x: 0, y: 200 }, data: { label: '🐦 Twitter', nodeId: 'twitter_url', isHitl: false } },

  // Trending HITL review
  { id: 'hitl_trending_review', type: 'dagHitl', position: { x: 150, y: 130 }, data: { label: 'Trending Review', nodeId: 'hitl_trending_review', isHitl: true } },

  // Phase 2: Analysis - Column 250
  { id: 'analyze_repo',    type: 'dagProcess', position: { x: 320, y: 30 }, data: { label: 'Repo Analyzer', nodeId: 'analyze_repo', isHitl: false } },
  { id: 'analyze_twitter', type: 'dagProcess', position: { x: 320, y: 200 }, data: { label: 'Twitter Analyzer', nodeId: 'analyze_twitter', isHitl: false } },

  // Phase 3: Core Pipeline - Column 580+
  { id: 'compose_script',      type: 'dagProcess', position: { x: 580, y: 110 }, data: { label: 'Script Composer', nodeId: 'compose_script', isHitl: false } },
  { id: 'hitl_script_review',  type: 'dagHitl',    position: { x: 740, y: 110 }, data: { label: 'Script Review', nodeId: 'hitl_script_review', isHitl: true } },
  { id: 'generate_diagrams',   type: 'dagProcess', position: { x: 900, y: 110 }, data: { label: 'Diagrams', nodeId: 'generate_diagrams', isHitl: false } },
  { id: 'generate_blueprint',  type: 'dagProcess', position: { x: 1060, y: 110 }, data: { label: 'Blueprint', nodeId: 'generate_blueprint', isHitl: false } },
  { id: 'hitl_blueprint_review', type: 'dagHitl',  position: { x: 1220, y: 110 }, data: { label: 'Blueprint Review', nodeId: 'hitl_blueprint_review', isHitl: true } },
  { id: 'audio_design',        type: 'dagProcess', position: { x: 1380, y: 110 }, data: { label: 'Audio Design', nodeId: 'audio_design', isHitl: false } },
  { id: 'render_compose',      type: 'dagProcess', position: { x: 1540, y: 110 }, data: { label: 'Render & Export', nodeId: 'render_compose', isHitl: false } },
]

const BASE_EDGES: Edge[] = [
  // Source → Trending HITL
  { id: 'e-github_trending-hitl_trending_review', source: 'github_trending', target: 'hitl_trending_review' },
  { id: 'e-github_trending-analyze_repo', source: 'github_trending', target: 'analyze_repo' },
  { id: 'e-github_url-analyze_repo',      source: 'github_url',      target: 'analyze_repo' },
  { id: 'e-twitter_url-analyze_twitter',  source: 'twitter_url',     target: 'analyze_twitter' },

  // Trending HITL → analyze_repo
  { id: 'e-hitl_trending_review-analyze_repo', source: 'hitl_trending_review', target: 'analyze_repo' },

  // Analysis → Core (converge)
  { id: 'e-analyze_repo-compose_script',    source: 'analyze_repo',    target: 'compose_script' },
  { id: 'e-analyze_twitter-compose_script', source: 'analyze_twitter', target: 'compose_script' },

  // Core pipeline
  { id: 'e-compose_script-hitl_script_review',      source: 'compose_script',    target: 'hitl_script_review' },
  { id: 'e-hitl_script_review-generate_diagrams',   source: 'hitl_script_review', target: 'generate_diagrams' },
  { id: 'e-generate_diagrams-generate_blueprint',   source: 'generate_diagrams',  target: 'generate_blueprint' },
  { id: 'e-generate_blueprint-hitl_blueprint_review', source: 'generate_blueprint', target: 'hitl_blueprint_review' },
  { id: 'e-hitl_blueprint_review-audio_design',     source: 'hitl_blueprint_review', target: 'audio_design' },
  { id: 'e-audio_design-render_compose',            source: 'audio_design',         target: 'render_compose' },
]

// ── SVG Glow Filter ──
const edgeGlowFilter = (
  <defs>
    <filter id="edgeGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
)

// ── Animated Glowing Edge ──
function GlowEdge({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={MarkerType.ArrowClosed}
      style={{
        stroke: selected ? '#3B82F6' : '#6B7280',
        strokeWidth: selected ? 2 : 1,
        filter: selected ? 'url(#edgeGlow)' : undefined,
        strokeDasharray: selected ? '8 4' : undefined,
        animation: selected ? 'dash-flow 1s linear infinite' : undefined,
      }}
    />
  )
}

// ── Custom Node Components ──

function DagProcessNode({ data }: NodeProps) {
  const nodeState = (data as { nodeState: NodeState; nodeId: string }).nodeState
  const label = (data as { label: string }).label

  let borderColor = 'border-gray-600'
  let bgColor = 'bg-[#1E1E1E]'
  let textColor = 'text-gray-400'
  let shadow = ''
  let pulse = ''

  if (nodeState === 'completed') {
    borderColor = 'border-green-500'
    textColor = 'text-green-400'
    shadow = 'shadow-[0_0_12px_rgba(34,197,94,0.3)]'
  } else if (nodeState === 'active') {
    borderColor = 'border-blue-500'
    bgColor = 'bg-blue-950/20'
    textColor = 'text-blue-400'
    shadow = 'shadow-[0_0_12px_rgba(59,130,246,0.4)]'
    pulse = 'animate-pulse'
  } else if (nodeState === 'error') {
    borderColor = 'border-red-500'
    textColor = 'text-red-400'
    shadow = 'shadow-[0_0_12px_rgba(239,68,68,0.3)]'
  }

  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${borderColor} ${bgColor} ${shadow} min-w-[130px] transition-all`}>
      <div className={`text-[11px] font-semibold text-center ${textColor} ${pulse}`}>{label}</div>
    </div>
  )
}

function DagHitlNode({ data }: NodeProps) {
  const nodeState = (data as { nodeState: NodeState; nodeId: string }).nodeState
  const label = (data as { label: string }).label

  let borderColor = 'border-gray-600'
  let textColor = 'text-gray-500'
  let shadow = ''

  if (nodeState === 'hitl') {
    borderColor = 'border-amber-500'
    textColor = 'text-amber-400'
    shadow = 'shadow-[0_0_12px_rgba(245,158,11,0.4)]'
  } else if (nodeState === 'completed') {
    borderColor = 'border-green-500'
    textColor = 'text-green-400'
  }

  return (
    <div className={`px-3 py-1.5 rounded-full border-2 ${borderColor} bg-[#1E1E1E] ${shadow} transition-all`}>
      <div className={`text-[10px] text-center ${textColor}`}>
        <span className="mr-1">⏸</span>{label}
      </div>
    </div>
  )
}

function DagSourceNode({ data }: NodeProps) {
  const nodeState = (data as { nodeState: NodeState; nodeId: string }).nodeState
  const label = (data as { label: string }).label

  let opacity = 'opacity-40'
  let borderColor = 'border-gray-700'
  let textColor = 'text-gray-500'

  if (nodeState === 'completed') {
    opacity = 'opacity-100'
    borderColor = 'border-green-500'
    textColor = 'text-green-400'
  } else if (nodeState === 'active') {
    opacity = 'opacity-100'
    borderColor = 'border-blue-500'
    textColor = 'text-blue-400'
  }

  return (
    <div className={`px-3 py-2 rounded-lg border ${borderColor} bg-[#1A1A2E] ${opacity} transition-all min-w-[110px]`}>
      <div className={`text-[11px] font-medium text-center ${textColor}`}>{label}</div>
    </div>
  )
}

// ── STATUS_TO_PROGRESS fallback (only for extreme degradation) ──
const STATUS_TO_PROGRESS: Record<string, { completed: string[]; current?: string }> = {
  pending:                 { completed: [] },
  fetching_trending:       { completed: [], current: 'github_trending' },
  hitl_trending:           { completed: ['github_trending'], current: 'hitl_trending_review' },
  analyzing:               { completed: ['github_trending', 'hitl_trending_review'], current: 'analyze_repo' },
  composing:               { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo'], current: 'compose_script' },
  hitl_script_review:      { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script'], current: 'hitl_script_review' },
  generating_diagrams:     { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review'], current: 'generate_diagrams' },
  blueprinting:            { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams'], current: 'generate_blueprint' },
  hitl_blueprint_review:   { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint'], current: 'hitl_blueprint_review' },
  generate_media:          { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint', 'hitl_blueprint_review'], current: 'audio_design' },
  rendering:               { completed: ['github_trending', 'hitl_trending_review', 'analyze_repo', 'compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint', 'hitl_blueprint_review', 'audio_design'], current: 'render_compose' },
  completed:               { completed: [...DAG_NODES] },
  error:                   { completed: [] },
}

// ── Pure function: derive node state from backend fields (Single Source of Truth) ──
function deriveNodeState(
  nodeId: string,
  completedNodes: Set<string>,
  currentNode: string | null,
  failedNode: string | null,
  pipelineStatus: string,
): NodeState {
  if (completedNodes.has(nodeId)) return 'completed'
  if (failedNode === nodeId) return 'error'
  if (currentNode === nodeId) {
    if (nodeId.startsWith('hitl_') && pipelineStatus.startsWith('hitl_')) return 'hitl'
    return 'active'
  }
  return 'idle'
}

// ── Main Component ──

export default function TaskMonitor() {
  const { id: projectId, tid: taskId } = useParams<{ id: string; tid: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'url' | 'trending' | 'twitter'>('trending')
  const [url, setUrl] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [failedNodes, setFailedNodes] = useState<Set<string>>(new Set())
  const [nodeErrors, setNodeErrors] = useState<Record<string, string>>({})
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [pipelineStatus, setPipelineStatus] = useState<string>('pending')
  const [sourceType, setSourceType] = useState<string>('github_url')
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null)
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId || null)
  const [feedbackText, setFeedbackText] = useState('')
  const [restoring, setRestoring] = useState(!!taskId)

  const [trendingRepos, setTrendingRepos] = useState<TrendingRepo[] | null>(null)
  const [trendingInterest, setTrendingInterest] = useState('')

  const wsRef = useRef<WebSocket | null>(null)
  const resumeWsRef = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const justStartedRef = useRef(false)

  // React Flow state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(BASE_EDGES)

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [logs, scrollToBottom])

  useEffect(() => {
    return () => { wsRef.current?.close(); resumeWsRef.current?.close() }
  }, [])

  // ── React Flow callbacks ──
  const nodeTypes = useMemo(() => ({
    dagProcess: DagProcessNode,
    dagHitl: DagHitlNode,
    dagSource: DagSourceNode,
  }), [])

  const edgeTypes = useMemo(() => ({
    default: GlowEdge,
  }), [])

  // ── Sync node states to React Flow based on derived state ──
  useEffect(() => {
    const failedNode = failedNodes.size > 0 ? Array.from(failedNodes)[0] : null

    setRfNodes(nds => nds.map(n => ({
      ...n,
      data: {
        ...n.data,
        nodeState: deriveNodeState(
          n.id,
          completedNodes,
          currentNode,
          failedNode,
          pipelineStatus,
        ),
      },
    })))

    // Determine active branch edges for highlighting
    const isTwitter = sourceType === 'twitter'
    const isTrending = sourceType === 'github_trending'
    const isGithubUrl = sourceType === 'github_url'

    // Build set of active path node IDs
    const activePathNodes = new Set<string>()

    if (isTwitter) {
      activePathNodes.add('twitter_url')
      if (completedNodes.has('twitter_url') || currentNode === 'twitter_url') activePathNodes.add('analyze_twitter')
    }
    if (isTrending) {
      activePathNodes.add('github_trending')
      activePathNodes.add('hitl_trending_review')
    }
    if (isGithubUrl) {
      activePathNodes.add('github_url')
    }

    // Core path: nodes from analyze_repo OR analyze_twitter through the end
    const coreNodes = ['compose_script', 'hitl_script_review', 'generate_diagrams', 'generate_blueprint', 'hitl_blueprint_review', 'audio_design', 'render_compose']
    if (completedNodes.has('analyze_repo') || completedNodes.has('analyze_twitter') || currentNode === 'analyze_repo' || currentNode === 'analyze_twitter') {
      activePathNodes.add('analyze_repo')
      activePathNodes.add('analyze_twitter')
      coreNodes.forEach(n => activePathNodes.add(n))
    } else if (isTrending && (completedNodes.has('hitl_trending_review') || currentNode === 'analyze_repo')) {
      activePathNodes.add('analyze_repo')
      coreNodes.forEach(n => activePathNodes.add(n))
    }

    // Highlight edges along active path
    setRfEdges(eds => eds.map(e => {
      const [src, tgt] = e.id.replace('e-', '').split('-')
      const isActive = completedNodes.has(src) || completedNodes.has(tgt) ||
        activePathNodes.has(src) || activePathNodes.has(tgt)

      return {
        ...e,
        selected: isActive,
        style: isActive
          ? { stroke: '#3B82F6', strokeWidth: 2, filter: 'url(#edgeGlow)', strokeDasharray: '8 4', animation: 'dash-flow 1s linear infinite' }
          : { stroke: '#374151', strokeWidth: 1, opacity: 0.3 },
      }
    }))
  }, [completedNodes, currentNode, failedNodes, pipelineStatus, sourceType, setRfNodes, setRfEdges])

  // ── Restore task state from backend ──
  useEffect(() => {
    if (!taskId) return
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

        const repoUrl: string = data.repo_url || ''
        const detectedType = repoUrl === 'trending' ? 'github_trending'
          : (repoUrl.includes('twitter.com') || repoUrl.includes('x.com')) ? 'twitter'
          : 'github_url'
        setSourceType(detectedType)

        if (detectedType === 'github_trending') {
          setActiveTab('trending')
        } else if (detectedType === 'twitter') {
          setActiveTab('twitter')
          setUrl(repoUrl)
        } else {
          setActiveTab('url')
          setUrl(repoUrl)
        }

        const backendCompleted: string[] = data.completed_nodes || []
        const completed = new Set<string>(backendCompleted)
        const failed = new Set<string>()
        let current: string | null = data.current_node || null

        // Fallback only when backend has NO progress at all
        if (backendCompleted.length === 0 && !current && !data.failed_node && status !== 'pending' && status !== 'error') {
          const fallback = STATUS_TO_PROGRESS[status]
          if (fallback?.current) {
            current = fallback.current
            fallback.completed.forEach(n => completed.add(n))
          }
        }

        if (status === 'error' && data.failed_node) {
          failed.add(data.failed_node)
          if (data.node_error) {
            setNodeErrors(prev => ({ ...prev, [data.failed_node]: data.node_error }))
          }
        }

        setCompletedNodes(completed)
        setFailedNodes(failed)
        setCurrentNode(current)

        const restoreLogs: string[] = [`> Task restored (status: ${status})`]
        for (const node of DAG_NODES) {
          if (completed.has(node)) {
            restoreLogs.push(`> [${NODE_META[node]?.label || node}] COMPLETED`)
          }
        }
        if (current) {
          restoreLogs.push(`> [${NODE_META[current]?.label || current}] IN PROGRESS...`)
        }
        if (status === 'completed') restoreLogs.push('> PIPELINE COMPLETED.')
        if (status === 'error') restoreLogs.push('> ERROR: Task failed.')
        setLogs(restoreLogs)

        // Restore HITL
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

        const isTerminal = status === 'completed' || status === 'error'
        const isHitl = status === 'hitl_trending' || status === 'hitl_script_review' || status === 'hitl_blueprint_review'
        if (!isTerminal && !isHitl && taskId) {
          connectWebSocket(taskId, repoUrl)
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
    startWithUrl(activeTab === 'trending' ? 'trending' : url)
  }

  const startWithUrl = async (repoUrl: string) => {
    if (!projectId) return
    const detectedType = repoUrl === 'trending' ? 'github_trending'
      : (repoUrl.includes('twitter.com') || repoUrl.includes('x.com')) ? 'twitter'
      : 'github_url'
    setSourceType(detectedType)
    setLogs([`> Initiating synthesis for: ${detectedType === 'github_trending' ? 'GitHub Trending' : repoUrl}`])
    setCompletedNodes(new Set())
    setFailedNodes(new Set())
    setNodeErrors({})
    setPipelineStatus('pending')
    setCurrentNode(detectedType === 'github_trending' ? 'github_trending' : detectedType === 'twitter' ? 'analyze_twitter' : 'analyze_repo')
    setHitlEvent(null)
    setTrendingRepos(null)

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl }),
      })
      const data = await res.json()
      if (data.task_id) {
        setCurrentTaskId(data.task_id)
        justStartedRef.current = true
        navigate(`/project/${projectId}/task/${data.task_id}`, { replace: true })
        connectWebSocket(data.task_id, repoUrl)
      }
    } catch {
      setLogs(prev => [...prev, `> Error: Could not connect to backend.`])
      setCurrentNode(null)
    }
  }

  // ── Unified WebSocket handler ──
  const handleWsMessage = (msg: { type: string; [key: string]: unknown }) => {
    if (msg.type === 'node_event') {
      const node = msg.node as string
      const status = msg.status as string
      const pipeStatus = msg.pipeline_status as string
      const serverCompleted = (msg.completed_nodes || []) as string[]
      const detail = msg.detail as string | undefined
      const errorMsg = msg.error as string | undefined

      // Determine source type from completed_nodes pattern on first message
      if (serverCompleted.length > 0) {
        if (serverCompleted.includes('github_trending')) setSourceType('github_trending')
        else if (serverCompleted.includes('analyze_twitter') || node === 'analyze_twitter') setSourceType('twitter')
        else if (node === 'analyze_repo') setSourceType('github_url')
      }

      if (status === 'completed') {
        setCurrentNode(null)
        setCompletedNodes(new Set(serverCompleted))
        setPipelineStatus(pipeStatus)
      } else if (status === 'started') {
        setCurrentNode(node)
        setCompletedNodes(new Set(serverCompleted))
        setPipelineStatus(pipeStatus)
      } else if (status === 'error') {
        setFailedNodes(prev => new Set([...prev, node]))
        setCurrentNode(null)
        setPipelineStatus('error')
        if (errorMsg) setNodeErrors(prev => ({ ...prev, [node]: errorMsg }))
      }

      const label = NODE_META[node]?.label || node
      const logDetail = detail || errorMsg || ''
      const logLine = logDetail ? `[${label}] ${status.toUpperCase()} — ${logDetail}` : `[${label}] ${status.toUpperCase()}`
      setLogs(prev => [...prev, `> ${logLine}`])

    } else if (msg.type === 'hitl_event') {
      const node = msg.node as string
      const pipeStatus = msg.pipeline_status as string
      const reason = msg.reason as string
      const eventData = (msg.data || {}) as Record<string, unknown>
      const serverCompleted = (msg.completed_nodes || []) as string[]

      setPipelineStatus(pipeStatus)
      setCurrentNode(node)
      setCompletedNodes(new Set(serverCompleted))
      setLogs(prev => [...prev, `> PAUSED: ${(eventData.message as string) || 'Awaiting review'}`])

      if (reason === 'trending_review') {
        const repos = (eventData.repos || []) as (TrendingRepo & { url?: string; one_liner?: string })[]
        setTrendingRepos(repos.map(r => ({
          owner: r.owner, name: r.name, url: r.url, description: r.description,
          stars: r.stars, forks: r.forks || 0, language: r.language,
          final_score: r.final_score, one_liner: r.one_liner || r.description || '',
        })))
      } else if (reason === 'script_review') {
        const s = eventData.script as ScriptData | undefined
        setHitlEvent({ reason: 'script_review', message: (eventData.message as string) || 'Review the script.',
          script: s ? { full_text: s.full_text || '', total_duration_est: s.total_duration_est || 0, segments: s.segments || [] } : undefined })
      } else if (reason === 'blueprint_review') {
        setHitlEvent({ reason: 'blueprint_review', message: (eventData.message as string) || 'Review the blueprint.',
          preview_url: eventData.preview_url as string | undefined, scene_count: eventData.scene_count as number | undefined,
          total_duration_frames: eventData.total_duration_frames as number | undefined, total_duration_seconds: eventData.total_duration_seconds as number | undefined })
      } else {
        setHitlEvent({ reason, message: (eventData.message as string) || 'Awaiting review' })
      }

    } else if (msg.type === 'pipeline_event') {
      const finalStatus = msg.status as string
      const serverCompleted = (msg.completed_nodes || []) as string[]
      setCompletedNodes(new Set(serverCompleted))
      setPipelineStatus(finalStatus)
      setCurrentNode(null)
      if (finalStatus === 'completed') setLogs(prev => [...prev, `> PIPELINE COMPLETED.`])
      else if (finalStatus === 'error') setLogs(prev => [...prev, `> ERROR: Pipeline failed.`])
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
    setFailedNodes(prev => { const n = new Set(prev); n.delete(nodeId); return n })
    setNodeErrors(prev => { const n = { ...prev }; delete n[nodeId]; return n })
    setPipelineStatus('pending')
    setLogs(prev => [...prev, `> Retrying from ${NODE_META[nodeId]?.label || nodeId}...`])
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
  const isRestoredTerminal = !!taskId && !restoring
  const totalSteps = DAG_NODES.length
  const completedCount = completedNodes.size
  const progressPct = Math.round((completedCount / totalSteps) * 100)

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ── Style block for edge animation ── */}
      <style>{`
        @keyframes dash-flow {
          to { stroke-dashoffset: -24; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)] shrink-0 bg-[var(--color-surface)]">
        <button onClick={() => navigate(`/project/${projectId}`)}
          className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
          <ArrowLeft className="w-3 h-3" /> Back
        </button>
        <div className="flex items-center gap-3">
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

      <main className="flex flex-col flex-1 min-h-0 overflow-hidden bg-[var(--color-bg)]">
        {/* TOP: Source Cards + DAG */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-8">

          {/* Source Selection Cards */}
          {!isRestoredTerminal && (
            <section className="max-w-4xl mx-auto w-full">
              <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4 uppercase tracking-wider">1. Select Data Source</h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {(
                  [
                    { tab: 'trending' as const, icon: Flame, title: 'GitHub Trending', desc: 'Fetch top repositories from GitHub trending page automatically.', color: 'var(--color-accent)' },
                    { tab: 'url' as const, icon: Link2, title: 'GitHub URL', desc: 'Directly input a specific GitHub repository link to analyze.', color: 'var(--color-accent)' },
                    { tab: 'twitter' as const, icon: MessageSquare, title: 'Twitter URL', desc: 'Input a Twitter/X thread or post URL to extract community insights.', color: '#1DA1F2' },
                  ] as const
                ).map(({ tab, icon: Icon, title, desc, color }) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`relative p-4 rounded-xl border transition-all text-left overflow-hidden ${
                      activeTab === tab ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)]/20 shadow-md' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-ink-muted)]'
                    }`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${activeTab === tab ? 'text-white' : 'bg-[var(--color-bg)] text-[var(--color-ink-muted)]'}`}
                        style={activeTab === tab ? { backgroundColor: color } : {}}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`font-semibold ${activeTab === tab ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink)]'}`}>{title}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-1 line-clamp-2">{desc}</p>
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="paper p-4 border border-[var(--color-border)] flex items-center gap-3">
                {activeTab === 'trending' ? (
                  <>
                    <Flame className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                    <input type="text" value={trendingInterest} onChange={e => setTrendingInterest(e.target.value)} placeholder="Enter an optional topic of interest (e.g. AI Agents, Web3)..."
                      className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-[var(--color-ink)]" />
                    <button type="submit" className="bg-[var(--color-accent)] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-[var(--color-accent-hover)] transition-colors">Fetch Trending</button>
                  </>
                ) : activeTab === 'url' ? (
                  <>
                    <Link2 className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
                    <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/owner/repo"
                      className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-[var(--color-ink)]" />
                    <button type="submit" disabled={!url.trim()} className="bg-[var(--color-accent)] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-30 transition-colors">Analyze Repo</button>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 text-[#1DA1F2] shrink-0" />
                    <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://x.com/username/status/..."
                      className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none text-[var(--color-ink)]" />
                    <button type="submit" disabled={!url.trim()} className="bg-[#1DA1F2] text-white px-5 py-2 rounded-md text-sm font-semibold hover:bg-[#1A91DA] disabled:opacity-30 transition-colors">Analyze Twitter</button>
                  </>
                )}
              </form>
            </section>
          )}

          {isRestoredTerminal && (
            <section className="max-w-4xl mx-auto w-full text-center py-4">
              <h2 className="text-sm font-semibold text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Active Task Source</h2>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-xs font-mono text-[var(--color-ink)]">
                {url || (sourceType === 'github_trending' ? 'Trending Workflow' : 'Unknown')}
              </div>
            </section>
          )}

          {/* DAG Visualizer — React Flow */}
          <section className="max-w-7xl mx-auto w-full">
            <h2 className="text-sm font-semibold text-[var(--color-ink)] mb-4 uppercase tracking-wider text-center">Pipeline Execution DAG</h2>
            <div className="paper border border-[var(--color-border)] rounded-lg overflow-hidden bg-[#0D1117]" style={{ height: 330 }}>
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.5}
                maxZoom={2}
                panOnDrag
                zoomOnScroll
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                {edgeGlowFilter}
                <Background color="#1F2937" gap={20} />
                <Controls showInteractive={false} className="bg-[#1E1E1E] [&>button]:border-gray-600 [&>button]:text-gray-400" />
              </ReactFlow>
            </div>
          </section>
        </div>

        {/* BOTTOM: Terminal + HITL */}
        <div className="h-[35vh] min-h-[250px] border-t border-[#2A2722] flex bg-[#161513] shrink-0">
          {/* SSE Terminal */}
          <section className={`terminal flex flex-col overflow-hidden h-full ${hasHitl ? 'w-1/2 border-r border-[#2A2722]' : 'w-full'}`}>
            <div className="border-b border-[#2A2722] px-4 py-2 flex items-center gap-2 bg-[#1C1A17]">
              <TerminalSquare className="w-4 h-4 text-[var(--color-ink-muted)]" />
              <span className="text-xs font-semibold text-[var(--color-ink-muted)] flex-1 font-mono tracking-widest uppercase">Stream Logs (SSE/WS)</span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#991B1B]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#92400E]/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#166534]/60" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 text-[12px] leading-relaxed font-mono">
              {restoring ? (
                <p className="text-[var(--color-ink-muted)] italic">Restoring task state...</p>
              ) : logs.length === 0 ? (
                <p className="text-[var(--color-ink-muted)] italic">Waiting for SSE/WebSocket pipeline output...</p>
              ) : (
                logs.slice(-500).map((log, i) => (
                  <div key={i} className={`mb-1 ${
                    log.includes('ERROR') ? 'text-red-400 font-bold' :
                    log.includes('PAUSED') ? 'text-amber-400' :
                    log.includes('COMPLETED') || log.includes('Approved') ? 'text-green-400' :
                    'text-[#D4D4D4]'
                  }`}>{log}</div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </section>

          {/* HITL Panels */}
          {hasHitl && (
            <div className="w-1/2 flex flex-col h-full bg-[var(--color-surface)]">
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-sm font-semibold mb-3 text-[var(--color-ink)]">Human-in-the-loop</h3>

                {/* Trending Review */}
                {trendingRepos && (
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)] mb-3">Select a repository to analyze:</p>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {trendingRepos.map((r, i) => (
                        <button key={i} onClick={() => confirmAndSendHitl('select', undefined, r.url)}
                          className="w-full text-left p-2 rounded border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)]/10 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--color-ink)]">{r.owner}/{r.name}</span>
                            <span className="text-[10px] text-[var(--color-ink-muted)]">⭐ {r.stars}</span>
                          </div>
                          <p className="text-[10px] text-[var(--color-ink-muted)] mt-0.5 line-clamp-1">{r.one_liner}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => confirmAndSendHitl('retry')}
                      className="mt-2 w-full py-1.5 text-[10px] rounded border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-bg)] transition-colors">
                      Retry Trending Fetch
                    </button>
                    <button onClick={() => confirmAndSendHitl('abort')}
                      className="mt-1 w-full py-1.5 text-[10px] rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                      Abort Pipeline
                    </button>
                  </div>
                )}

                {/* Script Review */}
                {hitlEvent?.reason === 'script_review' && hitlEvent.script && (
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                      {hitlEvent.script.segments.length} segments, ~{hitlEvent.script.total_duration_est.toFixed(0)}s total
                    </p>
                    <div className="max-h-[150px] overflow-y-auto mb-3 p-2 bg-[var(--color-bg)] rounded border border-[var(--color-border)]">
                      <p className="text-[10px] text-[var(--color-ink)] whitespace-pre-wrap leading-relaxed">{hitlEvent.script.full_text.slice(0, 800)}</p>
                    </div>
                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Optional feedback for rejection..."
                      className="w-full p-2 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] resize-none h-14 focus:outline-none focus:border-[var(--color-accent)]" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => confirmAndSendHitl('approve', '')}
                        className="flex-1 py-1.5 text-[10px] rounded bg-green-600 text-white hover:bg-green-700 transition-colors">Approve</button>
                      <button onClick={() => confirmAndSendHitl('reject', feedbackText)}
                        className="flex-1 py-1.5 text-[10px] rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors">Reject</button>
                      <button onClick={() => confirmAndSendHitl('abort')}
                        className="flex-1 py-1.5 text-[10px] rounded bg-red-600/50 text-red-200 hover:bg-red-700 transition-colors">Abort</button>
                    </div>
                  </div>
                )}

                {/* Blueprint Review */}
                {hitlEvent?.reason === 'blueprint_review' && (
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                      {hitlEvent.scene_count || 0} scenes, ~{hitlEvent.total_duration_seconds?.toFixed(1) || 0}s
                    </p>
                    {hitlEvent.preview_url && (
                      <a href={hitlEvent.preview_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mb-3">
                        Open Remotion Preview ↗
                      </a>
                    )}
                    <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Optional feedback for rejection..."
                      className="w-full p-2 text-[11px] rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-ink)] resize-none h-14 focus:outline-none focus:border-[var(--color-accent)]" />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => confirmAndSendHitl('approve', '')}
                        className="flex-1 py-1.5 text-[10px] rounded bg-green-600 text-white hover:bg-green-700 transition-colors">Approve</button>
                      <button onClick={() => confirmAndSendHitl('reject', feedbackText)}
                        className="flex-1 py-1.5 text-[10px] rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors">Reject</button>
                      <button onClick={() => confirmAndSendHitl('abort')}
                        className="flex-1 py-1.5 text-[10px] rounded bg-red-600/50 text-red-200 hover:bg-red-700 transition-colors">Abort</button>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {pipelineStatus === 'error' && !hasHitl && (
                  <div>
                    <p className="text-xs text-red-400 mb-2">Pipeline encountered an error.</p>
                    {Array.from(failedNodes).map(fn => {
                      const err = nodeErrors[fn]
                      return (
                        <div key={fn} className="mb-2">
                          <p className="text-[10px] text-red-300 font-mono">{NODE_META[fn]?.label || fn}</p>
                          {err && <p className="text-[10px] text-red-400/70 mt-0.5">{err}</p>}
                          <button onClick={() => handleRetry(fn)}
                            className="mt-1 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[var(--color-accent)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors">
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
