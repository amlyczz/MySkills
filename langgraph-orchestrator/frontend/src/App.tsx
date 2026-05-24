import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('')
  const [showHitl, setShowHitl] = useState(false)

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <header className="mb-12 border-b border-ink pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-4xl text-ink">Dialectic Engine</h1>
          <p className="text-graphite mt-2 font-serif italic">LangGraph Orchestration Control Panel</p>
        </div>
        <button 
          onClick={() => setShowHitl(true)}
          className="px-4 py-2 bg-marx-red text-white font-serif hover:bg-ink transition-colors"
        >
          Simulate HITL Interrupt
        </button>
      </header>

      <main className="grid grid-cols-12 gap-8">
        {/* Dashboard Submission */}
        <section className="col-span-12 lg:col-span-4 philosophical-panel p-6">
          <h2 className="text-2xl mb-6">Task Commission</h2>
          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
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
            <button className="w-full bg-ink text-white py-3 font-serif uppercase tracking-widest hover:bg-graphite transition-colors">
              Commence Synthesis
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-lg mb-4 font-serif">Historical Records</h3>
            <ul className="space-y-3">
              <li className="flex justify-between items-center text-sm">
                <span className="font-mono">karpathy/minGPT</span>
                <span className="text-marx-red font-bold">QA FAILED</span>
              </li>
              <li className="flex justify-between items-center text-sm">
                <span className="font-mono">facebook/react</span>
                <span className="text-green-700 font-bold">COMPLETED</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Live Graph & Logs */}
        <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="philosophical-panel p-6 flex-1 min-h-[300px] flex flex-col">
            <h2 className="text-2xl mb-4">Live Directed Acyclic Graph</h2>
            <div className="flex-1 border border-border bg-parchment flex items-center justify-center relative overflow-hidden">
              <div className="text-graphite font-mono text-sm opacity-50 absolute">
                {/* Placeholder for actual DAG visualization */}
                [ analyze_repo ] ---&gt; [ compose_script ] ---&gt; [ <span className="text-marx-red animate-pulse font-bold">qa_script</span> ]
              </div>
            </div>
          </div>

          <div className="philosophical-panel p-6 bg-ink text-parchment font-mono text-sm h-64 overflow-y-auto">
            <div className="text-graphite mb-2"># WebSocket Streaming Output</div>
            <p className="mb-1">&gt; Initiating synthesis for: https://github.com/example...</p>
            <p className="mb-1">&gt; RepoAnalysisModel extracted.</p>
            <p className="mb-1 text-yellow-400">&gt; qa_script evaluating logic coherence...</p>
            <p className="mb-1 text-marx-red">&gt; [WARN] qa_script score: 72/100. Reasoning: Lacks deep technical hooks.</p>
            <p className="mb-1">&gt; Retrying compose_script (Attempt 1/3)...</p>
          </div>
        </section>
      </main>

      {/* HITL Modal */}
      {showHitl && (
        <div className="fixed inset-0 bg-ink/80 flex items-center justify-center z-50 p-4">
          <div className="bg-parchment max-w-2xl w-full p-8 border-2 border-marx-red shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-3xl text-marx-red">Human Intervention Required</h2>
              <button onClick={() => setShowHitl(false)} className="text-graphite hover:text-ink text-2xl">&times;</button>
            </div>
            
            <div className="prose mb-8 text-ink">
              <p className="font-mono text-sm bg-gray-200 p-3 border border-border">
                [SYSTEM HALT] qa_blueprint failed 3 times. The current template lacks a suitable component to visualize AST node traversal.
              </p>
              <p className="mt-4 font-serif">
                The Dialectic Engine has requested assistance. Would you like to summon the <strong>Agentic Code Generator</strong> to write a new React component, or manually adjust the script?
              </p>
            </div>

            <div className="flex gap-4">
              <button className="flex-1 bg-marx-red text-white py-3 font-bold hover:bg-ink transition-colors border border-marx-red">
                SUMMON CODE AGENT
              </button>
              <button className="flex-1 bg-transparent text-ink border border-ink py-3 font-bold hover:bg-gray-100 transition-colors">
                EDIT SCRIPT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
