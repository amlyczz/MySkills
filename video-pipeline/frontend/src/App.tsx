import { useState, useRef, useEffect, useCallback } from 'react'
import { Play, Activity, CheckCircle2, AlertTriangle, Flame, Link2, XCircle, TerminalSquare } from 'lucide-react'

interface QAScorecard {
  score: number
  reasoning: string
  retry_count: number
}

interface HitlEvent {
  reason: string
  scorecard?: QAScorecard
  message: string
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
  'github_trending', 'analyze_repo', 'compose_script', 'qa_script',
  'generate_blueprint', 'qa_blueprint',
  'hitl_script_review', 'hitl_blueprint_review', 'agentic_code_gen',
  'audio_design', 'render_compose',
] as const

const NODE_LABELS: Record<string, string> = {
  github_trending: 'GitHub Trending',
  analyze_repo: 'Analyze Repo',
  compose_script: 'Compose Script',
  qa_script: 'QA Script',
  generate_blueprint: 'Blueprint',
  qa_blueprint: 'QA Blueprint',
  hitl_script_review: 'HITL Script',
  hitl_blueprint_review: 'HITL Blueprint',
  agentic_code_gen: 'Code Gen',
  audio_design: 'Audio Design',
  render_compose: 'Render + Mix',
}

function App() {
  const [activeTab, setActiveTab] = useState<'url' | 'trending'>('trending')
  const [url, setUrl] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const [hitlEvent, setHitlEvent] = useState<HitlEvent | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  
  const [trendingRepos, setTrendingRepos] = useState<TrendingRepo[] | null>(null)
  const [isFetchingTrending, setIsFetchingTrending] = useState(false)
  
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
    try {
      const res = await fetch('http://localhost:18274/api/v1/trending?limit=10')
      const data = await res.json()
      setTrendingRepos(data)
    } catch (e) {
      setLogs(prev => [...prev, `> Error fetching trending repos: ${e}`])
    }
    setIsFetchingTrending(false)
  }

  useEffect(() => {
    if (activeTab === 'trending' && !trendingRepos && !isFetchingTrending) {
      fetchTrending()
    }
  }, [activeTab, trendingRepos, isFetchingTrending])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'url') {
      submitTask(url)
    } else {
      submitTask('trending')
    }
  }

  const submitTask = async (targetUrl: string) => {
    setLogs(prev => [...prev, `> Initiating synthesis for: ${targetUrl}`])
    if (activeTab === 'url') {
      setCompletedNodes(new Set())
    }
    setCurrentNode('analyze_repo')
    setHitlEvent(null)

    try {
      const res = await fetch('http://localhost:18274/api/v1/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: targetUrl, project_type: 'educational' }),
      })
      const data = await res.json()

      if (data.task_id) {
        setTaskId(data.task_id)
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
        // Fetch task details to see if it's trending hitl
        fetch(`http://localhost:18274/api/v1/task/${tid}`)
          .then(res => res.json())
          .then(taskData => {
            if (taskData.status === 'hitl_trending') {
              setTrendingRepos(taskData.trending_repos)
            } else {
              setHitlEvent({ reason: taskData.status, message: 'Pipeline paused for QA review.' })
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
    if (!taskId) return
    setHitlEvent(null)
    if (action === 'select') {
      setTrendingRepos(null)
      setLogs(prev => [...prev, `> Selected Trending Repo: ${repoUrl}`])
    } else {
      setLogs(prev => [...prev, `> HITL Decision: ${action.toUpperCase()}`])
    }

    const ws = new WebSocket(`ws://localhost:18274/api/v1/task/resume/${taskId}`)
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
        fetch(`http://localhost:18274/api/v1/task/${taskId}`)
          .then(res => res.json())
          .then(taskData => {
            if (taskData.status === 'hitl_trending') {
              setTrendingRepos(taskData.trending_repos)
            } else {
              setHitlEvent({ reason: taskData.status, message: 'Pipeline paused for QA review.' })
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

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto flex flex-col font-sans">
      {/* Header */}
      <header className="mb-10 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center p-3 glass-panel rounded-full mb-4">
          <Activity className="w-8 h-8 text-[var(--color-accent)] animate-pulse" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] bg-clip-text text-transparent">
          Video Pipeline AI
        </h1>
        <p className="text-[var(--color-text-secondary)] text-lg">Fully Autonomous Multi-Source Video Generation</p>
      </header>

      {/* HITL Modal */}
      {hitlEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-700"></div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              Human Intervention
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm uppercase tracking-wider">{hitlEvent.reason.replace(/_/g, ' ')}</p>
            <p className="text-white mb-6 text-lg">{hitlEvent.message}</p>

            {hitlEvent.scorecard && (
              <div className="bg-black/30 rounded-lg p-5 mb-6 border border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[var(--color-text-secondary)] uppercase tracking-wider text-xs">QA Score</span>
                  <span className={`text-4xl font-bold ${hitlEvent.scorecard.score >= 80 ? 'text-green-400' : 'text-red-400'}`}>
                    {hitlEvent.scorecard.score}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">{hitlEvent.scorecard.reasoning}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleHitlDecision('skip')}
                className="bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium transition-all"
              >
                Skip & Continue
              </button>
              <button
                onClick={() => handleHitlDecision('retry')}
                className="bg-[var(--color-accent)]/20 hover:bg-[var(--color-accent)]/30 text-[var(--color-accent)] border border-[var(--color-accent)]/50 py-3 rounded-lg font-medium transition-all"
              >
                Retry Step
              </button>
              {hitlEvent.reason.includes('blueprint') && (
                <button
                  onClick={() => handleHitlDecision('code_gen')}
                  className="col-span-2 bg-[var(--color-accent-purple)]/20 hover:bg-[var(--color-accent-purple)]/30 text-[var(--color-accent-purple)] border border-[var(--color-accent-purple)]/50 py-3 rounded-lg font-medium transition-all"
                >
                  Trigger Code Generation
                </button>
              )}
              <button
                onClick={() => handleHitlDecision('abort')}
                className="col-span-2 text-[var(--color-text-muted)] hover:text-white py-2 text-sm transition-colors mt-2"
              >
                Abort Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        
        {/* Left Column: Commission & DAG */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Task Commission Panel */}
          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Play className="w-5 h-5 text-[var(--color-accent)]" />
              Task Commission
            </h2>
            
            {/* Tabs */}
            <div className="flex bg-black/40 rounded-lg p-1 mb-6">
              <button 
                onClick={() => setActiveTab('trending')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'trending' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <Flame className="w-4 h-4" /> Trending
              </button>
              <button 
                onClick={() => setActiveTab('url')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'url' ? 'bg-white/10 text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                <Link2 className="w-4 h-4" /> Manual URL
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'url' ? (
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Repository URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
                  />
                  <button 
                    type="submit" 
                    className="w-full mt-4 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" /> Commence Synthesis
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentNode === 'github_trending' && !trendingRepos ? (
                    <div className="flex flex-col items-center justify-center py-8 text-[var(--color-text-secondary)] gap-3 bg-black/30 rounded-lg border border-white/5">
                      <Activity className="w-6 h-6 animate-spin text-[var(--color-accent)]" />
                      <span>Agent is scraping and scoring GitHub repositories...</span>
                    </div>
                  ) : trendingRepos ? (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="feedbackInput"
                          placeholder="Not satisfied? e.g. 'I want Python AI agents'"
                          className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-[var(--color-accent)] text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('feedbackInput') as HTMLInputElement
                            if (input.value) {
                              handleHitlDecision('retry', input.value)
                              setTrendingRepos(null)
                            }
                          }}
                          className="bg-white/10 hover:bg-white/20 text-white px-4 rounded-lg text-sm transition-all"
                        >
                          Retry Search
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        {trendingRepos.map((repo) => (
                          <div 
                            key={repo.url}
                            onClick={() => handleHitlDecision('select', undefined, repo.url)}
                            className="bg-black/40 border border-white/10 hover:border-[var(--color-accent)]/50 rounded-lg p-4 cursor-pointer transition-all hover:bg-[var(--color-accent)]/10 group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-white font-semibold group-hover:text-[var(--color-accent)] transition-colors text-base truncate pr-2">
                                {repo.owner} / <span className="text-[var(--color-accent)]">{repo.name}</span>
                              </h3>
                              <span className="shrink-0 bg-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs px-2 py-0.5 rounded font-bold border border-[var(--color-accent)]/30">
                                ⭐ {repo.final_score.toFixed(1)}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-2 leading-relaxed">
                              {repo.one_liner}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-[var(--color-text-muted)] font-mono">
                              <span className="flex items-center gap-1 text-yellow-500/80">★ {repo.stars.toLocaleString()}</span>
                              {repo.language && <span className="text-[var(--color-accent-purple)]/80">{repo.language}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="submit" 
                      className="w-full mt-4 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" /> Find Trending Projects
                    </button>
                  )}
                </div>
              )}
            </form>
          </section>

          {/* Pipeline DAG Visualization */}
          <section className="glass-panel p-6 flex-1">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--color-accent-purple)]" />
              Pipeline DAG
            </h2>
            <div className="relative">
              {/* Vertical line connecting nodes */}
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-white/5 rounded-full"></div>
              
              <div className="space-y-4 relative z-10">
                {DAG_NODES.map(node => {
                  const isActive = currentNode === node
                  const isDone = completedNodes.has(node)
                  const isHITL = node.startsWith('hitl_') || node === 'agentic_code_gen'
                  
                  return (
                    <div key={node} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                        ${isActive ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 shadow-[0_0_10px_var(--color-accent)]' : 
                          isDone ? 'border-green-500 bg-green-500/20' : 
                          isHITL ? 'border-amber-500/30 bg-black/40' : 
                          'border-white/10 bg-black/40'}
                      `}>
                        {isDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : 
                         isActive ? <Activity className="w-4 h-4 text-[var(--color-accent)] animate-spin-slow" /> : 
                         isHITL ? <AlertTriangle className="w-3 h-3 text-amber-500/50" /> : 
                         <div className="w-2 h-2 rounded-full bg-white/20"></div>}
                      </div>
                      
                      <div className={`flex-1 p-3 rounded-lg border transition-all duration-300
                        ${isActive ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5' : 
                          isDone ? 'border-green-500/30 bg-green-500/5' : 
                          isHITL ? 'border-amber-500/20 bg-amber-500/5' : 
                          'border-white/5 bg-black/20'}
                      `}>
                        <h3 className={`font-medium text-sm
                          ${isActive ? 'text-[var(--color-accent)] glow-text' : 
                            isDone ? 'text-green-400' : 
                            isHITL ? 'text-amber-400' : 
                            'text-[var(--color-text-secondary)]'}
                        `}>
                          {NODE_LABELS[node]}
                        </h3>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Log Viewer */}
        <div className="lg:col-span-7 h-[85vh]">
          <section className="glass-panel h-full flex flex-col overflow-hidden">
            <div className="bg-black/60 border-b border-white/10 p-4 flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-[var(--color-text-secondary)]" />
              <h2 className="text-sm font-mono text-[var(--color-text-secondary)] flex-1">System Synthesis Output</h2>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 font-mono text-sm bg-[#0B0E14]/80">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--color-text-muted)] italic">
                  Awaiting synthesis initiation...
                </div>
              ) : (
                logs.map((log, i) => (
                  <p key={i} className={`mb-1.5 leading-relaxed break-words
                    ${log.includes('ERROR') || log.includes('⚠') ? 'text-red-400' :
                      log.includes('PAUSED') ? 'text-amber-400' :
                      log.includes('COMPLETED') ? 'text-green-400' : 
                      log.startsWith('>') ? 'text-[var(--color-accent)]' : 'text-[#A0A8B8]'}
                  `}>
                    {log}
                  </p>
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

export default App
