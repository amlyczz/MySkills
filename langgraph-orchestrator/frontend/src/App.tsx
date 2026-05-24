import { useState, useRef, useEffect } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [showHitl, setShowHitl] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [currentNode, setCurrentNode] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLogs(prev => [...prev, `> Initiating synthesis for: ${url}`])
    
    try {
      const res = await fetch('http://localhost:8000/api/v1/task/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: url, project_type: 'educational' })
      })
      const data = await res.json()
      
      if (data.task_id) {
        connectWebSocket(data.task_id, url)
      }
    } catch (err) {
      setLogs(prev => [...prev, `> Error: Could not connect to backend.`])
    }
  }

  const connectWebSocket = (taskId: string, repoUrl: string) => {
    const ws = new WebSocket(`ws://localhost:8000/api/v1/task/stream/${taskId}?repo_url=${encodeURIComponent(repoUrl)}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'state_change') {
        setCurrentNode(data.node)
        setLogs(prev => [...prev, `> [${data.node}] ${data.status.toUpperCase()}`])
      } else if (data.type === 'log') {
        setLogs(prev => {
          const lastLog = prev[prev.length - 1]
          if (lastLog && lastLog.startsWith(`> [${data.node}] STREAM:`)) {
            // Append to existing stream line
            const newLogs = [...prev]
            newLogs[newLogs.length - 1] += data.content
            return newLogs
          } else {
            return [...prev, `> [${data.node}] STREAM: ${data.content}`]
          }
        })
      } else if (data.type === 'pipeline_end') {
        setLogs(prev => [...prev, `> PIPELINE COMPLETED.`])
        setCurrentNode(null)
      } else if (data.type === 'error') {
        setLogs(prev => [...prev, `> ERROR: ${data.content}`])
      }
    }

    ws.onclose = () => {
      setLogs(prev => [...prev, `> WebSocket connection closed.`])
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-12 border-b border-ink pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl text-ink">Dialectic Engine</h1>
          <p className="text-graphite mt-2 font-serif italic">LangGraph Orchestration Control Panel</p>
        </div>
      </header>

      <main className="grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-4 philosophical-panel p-6">
          <h2 className="text-2xl mb-6">Task Commission</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase tracking-widest text-graphite">Target Repository</label>
              <input 
                type="text" 
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://github.com/..." 
                className="w-full border border-border p-3 focus:outline-none focus:border-ink bg-parchment"
              />
            </div>
            <button type="submit" className="w-full bg-ink text-white py-3 font-serif uppercase tracking-widest hover:bg-graphite transition-colors">
              Commence Synthesis
            </button>
          </form>
        </section>

        <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="philosophical-panel p-6 flex-1 min-h-[300px] flex flex-col">
            <h2 className="text-2xl mb-4">Live Directed Acyclic Graph</h2>
            <div className="flex-1 border border-border bg-parchment flex items-center justify-center relative overflow-hidden">
              <div className="text-graphite font-mono text-sm opacity-50 absolute flex gap-4 flex-wrap justify-center max-w-lg">
                {['analyze_repo', 'compose_script', 'qa_script', 'generate_blueprint'].map(node => (
                  <span key={node} className={currentNode === node ? "text-marx-red font-bold animate-pulse" : ""}>
                    [ {node} ]
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="philosophical-panel p-6 bg-ink text-parchment font-mono text-sm h-64 overflow-y-auto flex flex-col justify-end">
            <div className="text-graphite mb-2"># WebSocket Streaming Output</div>
            <div className="overflow-y-auto flex-1">
              {logs.map((log, i) => (
                <p key={i} className={`mb-1 ${log.includes('ERROR') ? 'text-marx-red' : ''}`}>{log}</p>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
