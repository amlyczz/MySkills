import { ArrowLeft, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface TaskHeaderProps {
  projectId?: string
  currentTaskId: string | null
  pipelineStatus: string
  hasHitl: boolean
  progressPct: number
}

export function TaskHeader({ projectId, currentTaskId, pipelineStatus, hasHitl, progressPct }: TaskHeaderProps) {
  const navigate = useNavigate()

  const statusBadge = () => {
    if (pipelineStatus === 'completed') return { label: 'Completed', cls: 'bg-[#F0FDF4] text-[#166534] border-[#166534]/20' }
    if (pipelineStatus === 'error') return { label: 'Failed', cls: 'bg-[#FEF2F2] text-[#991B1B] border-[#991B1B]/20' }
    if (hasHitl) return { label: 'Awaiting Input', cls: 'bg-[#FDF8EC] text-[#8B6914] border-[#8B6914]/20' }
    if (progressPct > 0) return { label: 'Running', cls: 'bg-[#FBF1F1] text-[#7C2D2D] border-[#7C2D2D]/20' }
    return { label: 'Idle', cls: 'bg-[#FAF9F6] text-[#A8A29E] border-[#D6D0C4]' }
  }
  const badge = statusBadge()

  return (
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
  )
}
