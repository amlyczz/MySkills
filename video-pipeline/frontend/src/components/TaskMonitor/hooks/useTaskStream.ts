import { useState, useRef, useCallback, useEffect } from 'react'
import type { DagSnapshot } from '../../../lib/api'
import type { HitlEvent, TrendingRepo, ScriptData, AnalysisSummary } from '../types'

interface UseTaskStreamOptions {
  onDagSnapshot: (snapshot: DagSnapshot) => void
  setPipelineStatus: (status: string) => void
  setSourceType: (type: string) => void
}

export function useTaskStream({ onDagSnapshot, setPipelineStatus, setSourceType }: UseTaskStreamOptions) {
  const [logs, setLogs] = useState<string[]>([])
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null)
  const [trendingRepos, setTrendingRepos] = useState<TrendingRepo[] | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const resumeWsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    return () => {
      wsRef.current?.close()
      resumeWsRef.current?.close()
    }
  }, [])

  const handleWsMessage = useCallback((msg: { type: string; dag_snapshot?: DagSnapshot; active_nodes?: string[]; [key: string]: unknown }) => {
    if (msg.dag_snapshot) {
      onDagSnapshot(msg.dag_snapshot)
      setPipelineStatus(msg.dag_snapshot.pipeline_status)
      setSourceType(msg.dag_snapshot.source_type)
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
      } else if (reason === 'analyze_review') {
        setHitlEvent({ reason: 'analyze_review', message,
          analysis: eventData.analysis as AnalysisSummary | undefined,
          error: eventData.error as string | undefined })
      } else {
        setHitlEvent({ reason, message })
      }

    } else if (msg.type === 'pipeline_event') {
      const finalStatus = msg.status as string
      if (finalStatus === 'completed') setLogs(prev => [...prev, '--- PIPELINE COMPLETED ---'])
      else if (finalStatus === 'error') setLogs(prev => [...prev, '--- PIPELINE FAILED ---'])
    }
  }, [onDagSnapshot, setPipelineStatus, setSourceType])

  const connectWebSocket = useCallback((tid: string, repoUrl: string) => {
    wsRef.current?.close()
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/stream/${tid}?repo_url=${encodeURIComponent(repoUrl)}`)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, 'Connection closed.'])
  }, [handleWsMessage])

  const connectRetryWebSocket = useCallback((taskId: string, nodeId?: string, nodeLabel?: string) => {
    setLogs(prev => [...prev, `⟳ Retrying ${nodeLabel || 'pipeline'}...`])
    wsRef.current?.close()
    const wsUrl = nodeId
      ? `ws://localhost:18274/api/v1/task/retry/${taskId}?node=${encodeURIComponent(nodeId)}`
      : `ws://localhost:18274/api/v1/task/retry/${taskId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onclose = () => setLogs(prev => [...prev, 'Retry connection closed.'])
    ws.onerror = () => setLogs(prev => [...prev, 'Retry connection failed.'])
  }, [handleWsMessage])

  const connectResumeWebSocket = useCallback((taskId: string, action: string, feedback?: string, repoUrl?: string) => {
    setHitlEvent(null)
    if (action === 'select') { setTrendingRepos(null); setLogs(prev => [...prev, `✓ Selected: ${repoUrl}`]) }
    else if (action === 'approve') setLogs(prev => [...prev, '✓ Approved'])
    else if (action === 'reject') { setTrendingRepos(null); setLogs(prev => [...prev, '✗ Rejected — retrying']) }
    else if (action === 'abort') setLogs(prev => [...prev, '✗ Aborted.'])
    
    resumeWsRef.current?.close()
    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/resume/${taskId}`)
    resumeWsRef.current = ws
    ws.onopen = () => ws.send(JSON.stringify({ action, feedback, repo_url: repoUrl }))
    ws.onmessage = (event) => handleWsMessage(JSON.parse(event.data))
    ws.onerror = () => setLogs(prev => [...prev, 'Resume connection failed.'])
  }, [handleWsMessage])

  return {
    logs,
    setLogs,
    hitlEvent,
    setHitlEvent,
    trendingRepos,
    setTrendingRepos,
    connectWebSocket,
    connectRetryWebSocket,
    connectResumeWebSocket,
  }
}
