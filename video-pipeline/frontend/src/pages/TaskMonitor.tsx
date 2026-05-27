import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Flame, Link2, MessageSquare, ArrowLeft,
  Pause, RotateCcw, ChevronDown, Activity, Play,
  Film, Image,
} from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
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
import {
  fetchTaskDag,
  fetchDefaultDag,
  submitTaskInProject,
  getTaskStatus,
  type DagSnapshot,
} from '../lib/api'

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

// ── Constants ──

// ── React Flow: Custom Edge ──

function GlowEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <BaseEdge
      path={edgePath}
      markerEnd={MarkerType.ArrowClosed}
      style={{
        stroke: selected ? '#7C2D2D' : '#D6D0C4',
        strokeWidth: selected ? 2.5 : 1.5,
        strokeDasharray: selected ? '6 3' : undefined,
        animation: selected ? 'dash-flow 0.8s linear infinite' : undefined,
      }}
    />
  )
}

// ── Custom Node Components ──

function DagProcessNode({ data }: NodeProps) {
  const { state, label, icon, status_label } = data as {
    state: string; label: string; icon: string; status_label: string
  }

  let containerCls = 'border-[#D6D0C4] bg-white'
  let accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#D6D0C4]" />

  if (state === 'completed') {
    containerCls = 'border-[#166534] bg-[#F0FDF4]'
    accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
  } else if (state === 'active') {
    containerCls = 'node-active'
    accentNode = (
      <div className="radar-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
      </div>
    )
  } else if (state === 'error') {
    containerCls = 'node-error'
    accentNode = <span className="alarm-blink w-1.5 h-1.5 rounded-full" />
  }

  const statusCls = state === 'completed' ? 'text-[#166534]' :
    state === 'active' ? 'text-[#E11D48] font-bold' :
    state === 'error' ? 'text-[#DC2626] font-extrabold' : 'text-[#A8A29E]'

  return (
    <div className={`relative rounded-lg border-2 ${containerCls} min-w-[130px] transition-all duration-500`}>
      <Handle type="target" position={Position.Left} className="!bg-[#7C2D2D] !w-2.5 !h-2.5 !border-2 !border-white !left-[-5px]" />
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-semibold text-[#1C1917]">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {accentNode}
          <span className={`text-[9px] font-bold tracking-wider ${statusCls}`}>{status_label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#7C2D2D] !w-2.5 !h-2.5 !border-2 !border-white !right-[-5px]" />
    </div>
  )
}

function DagHitlNode({ data }: NodeProps) {
  const { state, label, status_label } = data as {
    state: string; label: string; status_label: string
  }

  let containerCls = 'border-[#D6D0C4] border-dashed bg-white'
  let accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#D6D0C4]" />

  if (state === 'hitl') {
    containerCls = 'node-hitl'
    accentNode = <span className="alarm-blink w-1.5 h-1.5 rounded-full bg-[#D97706]" />
  } else if (state === 'completed') {
    containerCls = 'border-[#166534] border-solid bg-[#F0FDF4]'
    accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
  }

  const statusCls = state === 'hitl' ? 'text-[#D97706] font-bold' :
    state === 'completed' ? 'text-[#166534]' : 'text-[#A8A29E]'

  return (
    <div className={`relative rounded-full border-2 ${containerCls} min-w-[90px] transition-all duration-500`}>
      <Handle type="target" position={Position.Left} className="!bg-[#8B6914] !w-2.5 !h-2.5 !border-2 !border-white !left-[-5px]" />
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Pause className="w-3 h-3" />
          <span className="text-[10px] font-semibold text-[#1C1917]">{label}</span>
          {accentNode}
          <span className={`text-[8px] font-bold tracking-wider ${statusCls}`}>{status_label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#8B6914] !w-2.5 !h-2.5 !border-2 !border-white !right-[-5px]" />
    </div>
  )
}

function DagSourceNode({ data }: NodeProps) {
  const { state, label, icon, status_label } = data as {
    state: string; label: string; icon: string; status_label: string
  }

  let containerCls = 'opacity-50 border-[#D6D0C4] bg-[#FAF9F6]'

  if (state === 'completed') {
    containerCls = 'opacity-100 border-[#166534] bg-[#F0FDF4]'
  } else if (state === 'active') {
    containerCls = 'opacity-100 node-active'
  }

  const statusCls = state === 'completed' ? 'text-[#166534]' :
    state === 'active' ? 'text-[#E11D48] font-bold' : 'text-[#A8A29E]'

  return (
    <div className={`relative rounded-lg border ${containerCls} min-w-[110px] transition-all duration-500`}>
      <Handle type="source" position={Position.Right} className="!bg-[#7C2D2D] !w-2.5 !h-2.5 !border-2 !border-white !right-[-5px]" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs">{icon}</span>
          <span className="text-[10px] font-semibold text-[#1C1917]">{label}</span>
        </div>
        <span className={`text-[9px] font-bold tracking-wider ${statusCls}`}>{status_label}</span>
      </div>
    </div>
  )
}

// ── Helpers ──

function dagSnapshotToReactFlow(snapshot: DagSnapshot): { nodes: Node[]; edges: Edge[] } {
  const activeSet = new Set(snapshot.active_path_nodes)

  const rfNodes: Node[] = snapshot.nodes.map(n => ({
    id: n.id,
    type: n.type === 'hitl' ? 'dagHitl' : n.type === 'source' ? 'dagSource' : 'dagProcess',
    position: n.position,
    data: { label: n.label, icon: n.icon, state: n.state, status_label: n.status_label },
  }))

  const rfEdges: Edge[] = snapshot.edges.map(e => {
    const isActive = activeSet.has(e.source) || activeSet.has(e.target)
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      selected: isActive,
      style: isActive
        ? { stroke: '#7C2D2D', strokeWidth: 2.5, strokeDasharray: '6 3', animation: 'dash-flow 0.8s linear infinite' }
        : { stroke: '#D6D0C4', strokeWidth: 1.5, opacity: 0.6 },
    }
  })

  return { nodes: rfNodes, edges: rfEdges }
}

// ── Main Component ──

export default function TaskMonitor() {
  const { id: projectId, tid: taskId } = useParams<{ id: string; tid: string }>()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'url' | 'trending' | 'twitter'>('trending')
  const [url, setUrl] = useState('')
  const [logs, setLogs] = useState<string[]>([])
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
  const logContainerRef = useRef<HTMLDivElement>(null)
  const justStartedRef = useRef(false)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [showDag, setShowDag] = useState(true)
  const [showTerminal, setShowTerminal] = useState(true)
  const [showHitl, setShowHitl] = useState(false)

  const scrollToBottom = useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [])

  // Scroll log panel to bottom when new logs arrive (doesn't scroll the page)
  useEffect(() => { scrollToBottom() }, [logs, scrollToBottom])

  useEffect(() => {
    return () => { wsRef.current?.close(); resumeWsRef.current?.close() }
  }, [])

  const nodeTypes = useMemo(() => ({
    dagProcess: DagProcessNode,
    dagHitl: DagHitlNode,
    dagSource: DagSourceNode,
  }), [])

  const edgeTypes = useMemo(() => ({ default: GlowEdge }), [])

  // ── Apply DAG snapshot to ReactFlow ──
  const applyDagSnapshot = useCallback((snapshot: DagSnapshot) => {
    const { nodes, edges } = dagSnapshotToReactFlow(snapshot)
    setRfNodes(nodes)
    setRfEdges(edges)
    setPipelineStatus(snapshot.pipeline_status)
    setSourceType(snapshot.source_type)
  }, [setRfNodes, setRfEdges])

  // ── Load default DAG when no taskId (entry page, all idle) ──
  useEffect(() => {
    if (taskId) return
    fetchDefaultDag().then(applyDagSnapshot).catch(() => {})
  }, [taskId, applyDagSnapshot])

  // ── Restore task state from backend on mount / taskId change ──
  useEffect(() => {
    if (!taskId) return
    if (justStartedRef.current) { justStartedRef.current = false; return }

    ;(async () => {
      try {
        // Fetch DAG snapshot first (includes progress state)
        const dag = await fetchTaskDag(taskId)
        applyDagSnapshot(dag)
        setCurrentTaskId(taskId)

        // Fetch full task details for HITL/data restoration
        const data = await getTaskStatus(taskId)
        const status: string = (data.status as string) || 'pending'

        const repoUrl: string = (data.repo_url as string) || ''
        const detectedType = repoUrl === 'trending' ? 'github_trending'
          : (repoUrl.includes('twitter.com') || repoUrl.includes('x.com')) ? 'twitter'
          : 'github_url'

        if (detectedType === 'github_trending') setActiveTab('trending')
        else if (detectedType === 'twitter') { setActiveTab('twitter'); setUrl(repoUrl) }
        else { setActiveTab('url'); setUrl(repoUrl) }

        // Build restore logs from DAG snapshot (already applied above)
        const restoreLogs: string[] = [`Task restored (status: ${status})`]
        for (const n of dag.nodes) {
          if (n.state === 'completed') restoreLogs.push(`[✓] ${n.label}`)
          else if (n.state === 'active') restoreLogs.push(`[→] ${n.label}`)
          else if (n.state === 'error') restoreLogs.push(`[✗] ${n.label}`)
          else if (n.state === 'hitl') restoreLogs.push(`[⏸] ${n.label} — WAITING`)
        }
        if (status === 'completed') restoreLogs.push('--- PIPELINE COMPLETED ---')
        if (status === 'error') restoreLogs.push('--- PIPELINE FAILED ---')
        setLogs(restoreLogs)

        // Restore HITL state
        if (status === 'hitl_trending' && data.trending_repos) {
          const repos = data.trending_repos as (TrendingRepo & { one_liner?: string })[]
          setTrendingRepos(repos.map(r => ({
            owner: r.owner, name: r.name, url: r.url, description: r.description,
            stars: r.stars, forks: r.forks || 0, language: r.language,
            final_score: r.final_score, one_liner: r.one_liner || r.description || '',
            recent_stars_7d: r.recent_stars_7d,
          })))
        } else if (status === 'hitl_script_review' && data.script) {
          const s = data.script as ScriptData
          setHitlEvent({ reason: 'script_review', message: 'Review the script.', script: s })
        } else if (status === 'hitl_blueprint_review' && data.blueprint) {
          setHitlEvent({ reason: 'blueprint_review', message: 'Review the blueprint.' })
        }

        // Only connect WS for tasks that have no progress at all (fresh pending).
        // Active, HITL, terminal tasks should NOT reconnect — their state comes from DB.
        if (status === 'pending' && !dag.nodes.some(n => n.state === 'completed') && taskId) {
          connectWebSocket(taskId, repoUrl)
        }
      } catch {
        setLogs(['Failed to restore task state.'])
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
    setLogs([`Starting pipeline for: ${repoUrl === 'trending' ? 'GitHub Trending' : repoUrl}`])
    setHitlEvent(null)
    setTrendingRepos(null)

    try {
      const res = await submitTaskInProject(projectId, { repo_url: repoUrl })
      if (res.task_id) {
        setCurrentTaskId(res.task_id)
        justStartedRef.current = true
        // Fetch initial DAG immediately so it shows progress right away
        fetchTaskDag(res.task_id).then(applyDagSnapshot).catch(() => {})
        navigate(`/project/${projectId}/pipeline/${res.task_id}`, { replace: true })
        connectWebSocket(res.task_id, repoUrl)
      }
    } catch {
      setLogs(prev => [...prev, `Error: Could not connect to backend.`])
    }
  }

  // ── Unified WebSocket handler ──
  const handleWsMessage = useCallback((msg: { type: string; dag_snapshot?: DagSnapshot; [key: string]: unknown }) => {
    // Apply DAG snapshot from backend — single source of truth for all state
    if (msg.dag_snapshot) {
      applyDagSnapshot(msg.dag_snapshot)
    }

    if (msg.type === 'node_event') {
      const node = msg.node as string
      const status = msg.status as string
      const detail = msg.detail as string | undefined
      const errorMsg = msg.error as string | undefined

      const dag = msg.dag_snapshot
      const nodeLabel = dag?.nodes?.find(n => n.id === node)?.label || node
      const logDetail = detail || errorMsg || ''
      const logLine = logDetail ? `[${nodeLabel}] ${status.toUpperCase()} — ${logDetail}` : `[${nodeLabel}] ${status.toUpperCase()}`
      setLogs(prev => [...prev, logLine])

    } else if (msg.type === 'hitl_event') {
      const reason = msg.reason as string
      const eventData = (msg.data || {}) as Record<string, unknown>
      const message = (eventData.message as string) || 'Awaiting review'

      setLogs(prev => [...prev, `⏸ PAUSED: ${message}`])

      if (reason === 'trending_review') {
        const repos = (eventData.repos || []) as (TrendingRepo & { url?: string; one_liner?: string })[]
        setTrendingRepos(repos.map(r => ({
          owner: r.owner, name: r.name, url: r.url, description: r.description,
          stars: r.stars, forks: r.forks || 0, language: r.language,
          final_score: r.final_score, one_liner: r.one_liner || r.description || '',
        })))
      } else if (reason === 'script_review') {
        const s = eventData.script as ScriptData | undefined
        setHitlEvent({ reason: 'script_review', message,
          script: s ? { full_text: s.full_text || '', total_duration_est: s.total_duration_est || 0, segments: s.segments || [] } : undefined })
      } else if (reason === 'blueprint_review') {
        setHitlEvent({ reason: 'blueprint_review', message: 'Review the blueprint.',
          preview_url: eventData.preview_url as string | undefined,
          scene_count: eventData.scene_count as number | undefined,
          total_duration_frames: eventData.total_duration_frames as number | undefined,
          total_duration_seconds: eventData.total_duration_seconds as number | undefined })
      } else {
        setHitlEvent({ reason, message })
      }

    } else if (msg.type === 'pipeline_event') {
      const finalStatus = msg.status as string
      if (finalStatus === 'completed') setLogs(prev => [...prev, '--- PIPELINE COMPLETED ---'])
      else if (finalStatus === 'error') setLogs(prev => [...prev, '--- PIPELINE FAILED ---'])
    }
  }, [applyDagSnapshot])

  const connectWebSocket = (tid: string, repoUrl: string) => {
    // Close any existing connection before opening a new one
    wsRef.current?.close()
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/stream/${tid}?repo_url=${encodeURIComponent(repoUrl)}`)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, 'Connection closed.'])
  }

  const handleRetry = (nodeId?: string) => {
    if (!currentTaskId) return
    const nodeLabel = nodeId ? (rfNodes.find(n => n.id === nodeId)?.data?.label || nodeId) : 'pipeline'
    setLogs(prev => [...prev, `⟳ Retrying ${nodeLabel}...`])
    wsRef.current?.close()
    const wsUrl = nodeId
      ? `ws://localhost:18274/api/v1/task/retry/${currentTaskId}?node=${encodeURIComponent(nodeId)}`
      : `ws://localhost:18274/api/v1/task/retry/${currentTaskId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, 'Retry connection closed.'])
    ws.onerror = () => setLogs(prev => [...prev, 'Retry connection failed.'])
  }

  const confirmAndSendHitl = useCallback((action: string, feedback?: string, repoUrl?: string) => {
    const confirmMap: Record<string, string> = {
      select: `Confirm select this repo?\n\n${repoUrl}`,
      approve: 'Confirm approve?',
      reject: 'Confirm reject and retry?',
      abort: 'Confirm abort entire pipeline? This cannot be undone.',
    }
    const msg = confirmMap[action]
    if (msg && !confirm(msg)) return
    if (!currentTaskId) return
    setHitlEvent(null); setFeedbackText('')
    if (action === 'select') { setTrendingRepos(null); setLogs(prev => [...prev, `✓ Selected: ${repoUrl}`]) }
    else if (action === 'approve') setLogs(prev => [...prev, '✓ Approved'])
    else if (action === 'reject') { setTrendingRepos(null); setLogs(prev => [...prev, '✗ Rejected — retrying']) }
    else if (action === 'abort') setLogs(prev => [...prev, '✗ Aborted.'])
    resumeWsRef.current?.close()
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/resume/${currentTaskId}`)
    resumeWsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ action, feedback, repo_url: repoUrl }))
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onerror = () => setLogs(prev => [...prev, 'Resume connection failed.'])
  }, [currentTaskId, handleWsMessage])

  const hasHitl = !!(hitlEvent || trendingRepos)

  // Auto-expand HITL panel when content becomes available
  useEffect(() => { if (hasHitl) setShowHitl(true) }, [hasHitl])

  const isRestoredTerminal = !!taskId && !restoring
  const totalNodes = rfNodes.length
  const completedCount = rfNodes.filter(n => n.data.state === 'completed').length
  const progressPct = totalNodes > 0 ? Math.round((completedCount / 13) * 100) : 0  // 13 = total DAG nodes

  const statusBadge = () => {
    if (pipelineStatus === 'completed') return { label: 'Completed', cls: 'bg-[#F0FDF4] text-[#166534] border-[#166534]/20' }
    if (pipelineStatus === 'error') return { label: 'Failed', cls: 'bg-[#FEF2F2] text-[#991B1B] border-[#991B1B]/20' }
    if (hasHitl) return { label: 'Awaiting Input', cls: 'bg-[#FDF8EC] text-[#8B6914] border-[#8B6914]/20' }
    if (completedCount > 0) return { label: 'Running', cls: 'bg-[#FBF1F1] text-[#7C2D2D] border-[#7C2D2D]/20' }
    return { label: 'Idle', cls: 'bg-[#FAF9F6] text-[#A8A29E] border-[#D6D0C4]' }
  }
  const badge = statusBadge()

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F5F2EB]">
      <style>{`
        @keyframes dash-flow { to { stroke-dashoffset: -18; } }
        .react-flow__attribution { display: none !important; }
      `}</style>

      {/* Header — compact */}
      <header className="z-20 bg-white/80 backdrop-blur-sm border-b border-[#E2DED6] shrink-0">
        <div className="max-w-[1800px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/project/${projectId}`)}
              className="flex items-center gap-1.5 text-sm text-[#57534E] hover:text-[#1C1917] transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-xs text-[#A8A29E]">|</span>
            <span className="text-sm font-medium text-[#1C1917] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7C2D2D]" />
              Pipeline Monitor
            </span>
            {currentTaskId && (
              <span className="text-[11px] text-[#A8A29E] font-mono">#{currentTaskId.slice(0, 8)}</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            {currentTaskId && (
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.cls}`}>
                  {badge.label}
                </span>
                <div className="w-28 h-1.5 bg-[#E2DED6] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${
                    pipelineStatus === 'error' ? 'bg-[#991B1B]' :
                    pipelineStatus === 'completed' ? 'bg-[#166534]' : 'bg-[#7C2D2D]'
                  }`} style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-[10px] text-[#57534E] font-mono tabular-nums w-7">{progressPct}%</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-[1800px] mx-auto w-full px-4 py-3 space-y-3 overflow-y-auto">
        {/* Source Selection */}
        {!isRestoredTerminal && (
          <section className="paper p-3">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(
                [
                  { tab: 'trending' as const, icon: Flame, title: 'GitHub Trending', desc: 'Fetch top repos from GitHub trending.', color: '#7C2D2D' },
                  { tab: 'url' as const, icon: Link2, title: 'GitHub URL', desc: 'Input a GitHub repository link to analyze.', color: '#1E3A5F' },
                  { tab: 'twitter' as const, icon: MessageSquare, title: 'Twitter URL', desc: 'Input a Twitter/X thread to extract insights.', color: '#1DA1F2' },
                ] as const
              ).map(({ tab, icon: Icon, title, desc, color }) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`relative p-2.5 rounded-md border-2 transition-all text-left ${
                    activeTab === tab ? 'border-[#7C2D2D] bg-[#FBF1F1]' : 'border-[#E2DED6] bg-white hover:border-[#CCC7BD]'
                  }`}>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded transition-colors"
                      style={{ backgroundColor: activeTab === tab ? color : '#F5F2EB', color: activeTab === tab ? '#fff' : '#A8A29E' }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-xs font-semibold ${activeTab === tab ? 'text-[#7C2D2D]' : 'text-[#1C1917]'}`}>{title}</span>
                  </div>
                  <p className="text-[10px] text-[#A8A29E] mt-1 line-clamp-1">{desc}</p>
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 bg-[#FAF9F6] rounded-md border border-[#E2DED6]">
              {activeTab === 'trending' ? (
                <>
                  <Flame className="w-4 h-4 text-[#7C2D2D] shrink-0" />
                  <input type="text" value={trendingInterest} onChange={e => setTrendingInterest(e.target.value)}
                    placeholder="Optional topic (e.g. AI Agents, Web3)..."
                    className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]" />
                  <button type="submit"
                    className="bg-[#7C2D2D] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#652424] transition-colors flex items-center gap-1">
                    <Play className="w-3 h-3" /> Fetch
                  </button>
                </>
              ) : activeTab === 'url' ? (
                <>
                  <Link2 className="w-4 h-4 text-[#1E3A5F] shrink-0" />
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://github.com/owner/repo"
                    className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]" />
                  <button type="submit" disabled={!url.trim()}
                    className="bg-[#1E3A5F] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#162D4A] disabled:opacity-30 transition-colors flex items-center gap-1">
                    <Play className="w-3 h-3" /> Analyze
                  </button>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 text-[#1DA1F2] shrink-0" />
                  <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://x.com/username/status/..."
                    className="flex-1 min-w-0 bg-transparent text-xs focus:outline-none text-[#1C1917] placeholder:text-[#A8A29E]" />
                  <button type="submit" disabled={!url.trim()}
                    className="bg-[#1DA1F2] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#1A91DA] disabled:opacity-30 transition-colors flex items-center gap-1">
                    <Play className="w-3 h-3" /> Analyze
                  </button>
                </>
              )}
            </form>
          </section>
        )}

        {/* Restored terminal banner */}
        {isRestoredTerminal && (
          <section className="paper p-2 flex items-center gap-3">
            <span className="text-xs font-medium text-[#A8A29E] uppercase tracking-wider">Source</span>
            <span className="text-sm font-mono text-[#1C1917]">
              {url || (sourceType === 'github_trending' ? 'GitHub Trending' : 'Unknown')}
            </span>
          </section>
        )}

        {/* HITL Panel — always visible, collapsed by default, auto-expands when active */}
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
                {/* Header stats */}
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

                {/* Segment timeline */}
                <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                  {segments.map((seg, i) => (
                    <div key={i}
                      className="flex gap-3 p-3 bg-white rounded-lg border border-[#E2DED6] hover:border-[#CCC7BD] transition-colors">
                      {/* Left: index + time */}
                      <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 44 }}>
                        <span className="w-7 h-7 rounded-full bg-[#7C2D2D] text-white text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-[10px] font-mono text-[#A8A29E] tabular-nums">
                          {seg.duration_est?.toFixed(0) || '?'}s
                        </span>
                      </div>

                      {/* Center: script text + visual hook */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#1C1917] leading-relaxed mb-1.5">
                          {seg.text}
                        </p>
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

                      {/* Right: time bar */}
                      <div className="shrink-0 flex items-end">
                        <div
                          className="w-1 rounded-full bg-[#7C2D2D]/20"
                          style={{ height: `${Math.max(8, Math.min(48, (seg.duration_est || 1) / Math.max(1, totalDur) * 48))}px` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Full text preview (collapsed by default) */}
                <details className="text-[11px]">
                  <summary className="text-[#A8A29E] cursor-pointer hover:text-[#57534E]">
                    View full script text
                  </summary>
                  <pre className="mt-2 p-2 bg-[#FAF9F6] rounded text-[#57534E] whitespace-pre-wrap text-[11px] leading-relaxed max-h-[120px] overflow-y-auto border border-[#E2DED6]">
                    {hitlEvent.script.full_text}
                  </pre>
                </details>

                {/* Action buttons */}
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

        {/* DAG Visualizer */}
        <section className="paper overflow-hidden">
          <button onClick={() => setShowDag(!showDag)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FAF9F6] transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#7C2D2D] text-white text-[11px] font-bold flex items-center justify-center">1</span>
              <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wider">Pipeline Execution DAG</h2>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#A8A29E] transition-transform ${showDag ? '' : '-rotate-90'}`} />
          </button>
          {showDag && (
            <div className="border-t border-[#E2DED6]" style={{ height: 'clamp(320px, 48vh, 520px)' }}>
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.4}
                maxZoom={2}
                panOnDrag
                zoomOnScroll
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
              >
                <Background color="#E2DED6" gap={24} size={1} />
                <Controls showInteractive={false}
                  className="[&>button]:bg-white [&>button]:border-[#E2DED6] [&>button]:text-[#57534E] [&>button]:rounded-md [&>button]:shadow-sm" />
              </ReactFlow>
            </div>
          )}
        </section>

        {/* Terminal / Stream Logs */}
        <section className="paper overflow-hidden">
          <button onClick={() => setShowTerminal(!showTerminal)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FAF9F6] transition-colors">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#7C2D2D] text-white text-[11px] font-bold flex items-center justify-center">2</span>
              <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wider">Stream Logs (WebSocket)</h2>
              {pipelineStatus !== 'completed' && pipelineStatus !== 'error' && pipelineStatus !== 'pending' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FBF1F1] text-[#7C2D2D] font-medium animate-pulse">LIVE</span>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-[#A8A29E] transition-transform ${showTerminal ? '' : '-rotate-90'}`} />
          </button>
          {showTerminal && (
            <div className="border-t border-[#E2DED6]">
              <div ref={logContainerRef} className="h-[200px] overflow-y-auto p-3 font-mono text-[12px] leading-relaxed bg-[#FAF9F6]">
                {restoring ? (
                  <p className="text-[#A8A29E] italic">Restoring task state...</p>
                ) : logs.length === 0 ? (
                  <p className="text-[#A8A29E] italic">Waiting for WebSocket pipeline output...</p>
                ) : (
                  logs.slice(-500).map((log, i) => (
                    <div key={i} className={`mb-0.5 ${
                      log.includes('ERROR') || log.includes('FAILED') ? 'text-[#991B1B] font-semibold' :
                      log.includes('PAUSED') ? 'text-[#8B6914] font-medium' :
                      log.includes('COMPLETED') || log.includes('Approved') || log.startsWith('[✓]') ? 'text-[#166534]' :
                      log.includes('---') ? 'text-[#A8A29E]' :
                      'text-[#57534E]'
                    }`}>{log.startsWith('> ') ? log : `  ${log}`}</div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
