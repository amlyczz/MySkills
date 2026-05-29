import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { fetchTaskDag, fetchDefaultDag, submitTaskInProject, getTaskStatus } from '../lib/api'
import type { TrendingRepo, ScriptData, AnalysisSummary } from '../components/TaskMonitor/types'
import { useTaskStream } from '../components/TaskMonitor/hooks/useTaskStream'
import { useTaskActions } from '../components/TaskMonitor/hooks/useTaskActions'
import { useDagGraph } from '../components/TaskMonitor/hooks/useDagGraph'

import { TaskHeader } from '../components/TaskMonitor/TaskHeader'
import { SourceSelector } from '../components/TaskMonitor/SourceSelector'
import { DAGViewer } from '../components/TaskMonitor/DAGViewer'
import { TerminalLogs } from '../components/TaskMonitor/TerminalLogs'
import { HitlPanel } from '../components/TaskMonitor/HitlPanel'

export default function TaskMonitor() {
  const { id: projectId, tid: taskId } = useParams<{ id: string; tid: string }>()
  const navigate = useNavigate()

  const [url, setUrl] = useState('')
  const [pipelineStatus, setPipelineStatus] = useState<string>('pending')
  const [sourceType, setSourceType] = useState<string>('github_url')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(taskId || null)
  const [restoring, setRestoring] = useState(!!taskId)

  const justStartedRef = useRef(false)

  const { rfNodes, rfEdges, onNodesChange, onEdgesChange, applyDagSnapshot } = useDagGraph()

  const {
    logs, setLogs,
    hitlEvent, setHitlEvent,
    trendingRepos, setTrendingRepos,
    connectWebSocket, connectRetryWebSocket, connectResumeWebSocket
  } = useTaskStream({
    onDagSnapshot: applyDagSnapshot,
    setPipelineStatus,
    setSourceType
  })

  const { confirmAndSendHitl } = useTaskActions({ currentTaskId, connectResumeWebSocket })

  // ── Load default DAG when no taskId ──
  useEffect(() => {
    if (taskId) return
    fetchDefaultDag().then(applyDagSnapshot).catch(() => {})
  }, [taskId, applyDagSnapshot])

  // ── Restore task state ──
  useEffect(() => {
    if (!taskId) return
    if (justStartedRef.current) { justStartedRef.current = false; return }

    ;(async () => {
      try {
        const dag = await fetchTaskDag(taskId)
        applyDagSnapshot(dag)
        setCurrentTaskId(taskId)

        const data = await getTaskStatus(taskId)
        const status: string = (data.status as string) || 'pending'
        const repoUrl: string = (data.repo_url as string) || ''
        setUrl(repoUrl)
        setPipelineStatus(status)

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

        if (status === 'hitl_trending' && data.trending_repos) {
          const repos = data.trending_repos as (TrendingRepo & { one_liner?: string })[]
          setTrendingRepos(repos.map(r => ({ ...r, one_liner: r.one_liner || r.description || '' })))
        } else if (status === 'hitl_script_review' && data.script) {
          const s = data.script as ScriptData
          setHitlEvent({ reason: 'script_review', message: 'Review the script.', script: s })
        } else if (status === 'hitl_blueprint_review' && data.blueprint) {
          setHitlEvent({ reason: 'blueprint_review', message: 'Review the blueprint.' })
        } else if (status === 'analyzing' && (data.analysis || data.error)) {
          setHitlEvent({ reason: 'analyze_review', message: 'Review the repository analysis.',
            analysis: data.analysis as AnalysisSummary | undefined,
            error: data.error as string | undefined })
        }

        if (status === 'pending' && !dag.nodes.some(n => n.state === 'completed') && taskId) {
          connectWebSocket(taskId, repoUrl)
        }
      } catch {
        setLogs(['Failed to restore task state.'])
      }
      setRestoring(false)
    })()
  }, [taskId, applyDagSnapshot, connectWebSocket, setHitlEvent, setLogs, setTrendingRepos])

  const handleSourceSubmit = async (submittedUrl: string) => {
    if (!projectId) return
    setLogs([`Starting pipeline for: ${submittedUrl === 'trending' ? 'GitHub Trending' : submittedUrl}`])
    setHitlEvent(null)
    setTrendingRepos(null)
    setUrl(submittedUrl !== 'trending' ? submittedUrl : '')

    try {
      const res = await submitTaskInProject(projectId, { repo_url: submittedUrl })
      if (res.task_id) {
        setCurrentTaskId(res.task_id)
        justStartedRef.current = true
        fetchTaskDag(res.task_id).then(applyDagSnapshot).catch(() => {})
        navigate(`/project/${projectId}/pipeline/${res.task_id}`, { replace: true })
        connectWebSocket(res.task_id, submittedUrl)
      }
    } catch {
      setLogs(prev => [...prev, `Error: Could not connect to backend.`])
    }
  }

  const handleRetry = (nodeId?: string) => {
    if (!currentTaskId) return
    const nodeLabel = nodeId ? (rfNodes.find(n => n.id === nodeId)?.data?.label || nodeId) : 'pipeline'
    connectRetryWebSocket(currentTaskId, nodeId, String(nodeLabel))
  }

  const isRestoredTerminal = !!taskId && !restoring
  const hasHitl = !!(hitlEvent || trendingRepos)
  const totalNodes = rfNodes.length
  const completedCount = rfNodes.filter(n => n.data.state === 'completed').length
  const progressPct = totalNodes > 0 ? Math.round((completedCount / 13) * 100) : 0

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F5F2EB]">
      <style>{`
        @keyframes dash-flow { to { stroke-dashoffset: -18; } }
        .react-flow__attribution { display: none !important; }
      `}</style>

      <TaskHeader 
        projectId={projectId}
        currentTaskId={currentTaskId}
        pipelineStatus={pipelineStatus}
        hasHitl={hasHitl}
        progressPct={progressPct}
      />

      <main className="flex-1 min-h-0 max-w-[1800px] mx-auto w-full px-4 py-3 space-y-3 overflow-y-auto">
        {!isRestoredTerminal && (
          <SourceSelector onSubmit={handleSourceSubmit} />
        )}

        {isRestoredTerminal && (
          <section className="paper p-2 flex items-center gap-3">
            <span className="text-xs font-medium text-[#A8A29E] uppercase tracking-wider">Source</span>
            <span className="text-sm font-mono text-[#1C1917]">
              {url || (sourceType === 'github_trending' ? 'GitHub Trending' : 'Unknown')}
            </span>
          </section>
        )}

        <HitlPanel 
          hasHitl={hasHitl}
          trendingRepos={trendingRepos}
          hitlEvent={hitlEvent}
          pipelineStatus={pipelineStatus}
          rfNodes={rfNodes}
          handleRetry={handleRetry}
          confirmAndSendHitl={confirmAndSendHitl}
        />

        <DAGViewer
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onStartFrom={handleRetry}
        />

        <TerminalLogs 
          logs={logs}
          pipelineStatus={pipelineStatus}
          restoring={restoring}
        />
      </main>
    </div>
  )
}
