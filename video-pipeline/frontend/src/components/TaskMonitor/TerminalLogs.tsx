import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown } from 'lucide-react'

interface TerminalLogsProps {
  logs: string[]
  pipelineStatus: string
  restoring: boolean
}

export function TerminalLogs({ logs, pipelineStatus, restoring }: TerminalLogsProps) {
  const [showTerminal, setShowTerminal] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => { scrollToBottom() }, [logs, scrollToBottom])

  return (
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
  )
}
