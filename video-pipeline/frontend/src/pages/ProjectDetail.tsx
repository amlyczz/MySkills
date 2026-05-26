import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Clock } from 'lucide-react'
import { getProject, deleteProject, deleteTask, listProjectTasks, type ProjectData, type TaskItem } from '../lib/api'

type StatusCategory = 'completed' | 'error' | 'hitl' | 'active' | 'pending'

const STATUS_CONFIG: Record<string, { label: string; category: StatusCategory }> = {
  pending:                 { label: 'Pending',          category: 'pending' },
  fetching_trending:       { label: 'Fetching Trending', category: 'active' },
  hitl_trending:           { label: 'Trending Review',  category: 'hitl' },
  analyzing:               { label: 'Analyzing',        category: 'active' },
  composing:               { label: 'Composing',        category: 'active' },
  hitl_script_review:      { label: 'Script Review',    category: 'hitl' },
  generating_diagrams:     { label: 'Gen. Diagrams',    category: 'active' },
  blueprinting:            { label: 'Blueprinting',     category: 'active' },
  hitl_blueprint_review:   { label: 'Blueprint Review', category: 'hitl' },
  generate_media:          { label: 'Generating Media', category: 'active' },
  rendering:               { label: 'Rendering',        category: 'active' },
  completed:               { label: 'Completed',        category: 'completed' },
  error:                   { label: 'Error',            category: 'error' },
}

const CATEGORY_STYLES: Record<StatusCategory, { dot: string; bg: string; text: string }> = {
  completed: { dot: 'bg-green-500',    bg: 'bg-green-50',     text: 'text-green-700' },
  error:     { dot: 'bg-red-500',      bg: 'bg-red-50',       text: 'text-red-700' },
  hitl:      { dot: 'bg-amber-500',    bg: 'bg-amber-50',     text: 'text-amber-700' },
  active:    { dot: 'bg-[var(--color-accent)]', bg: 'bg-[var(--color-accent-light)]', text: 'text-[var(--color-accent)]' },
  pending:   { dot: 'bg-[var(--color-ink-muted)]', bg: 'bg-[var(--color-bg)]', text: 'text-[var(--color-ink-muted)]' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, category: 'pending' as StatusCategory }
  const style = CATEGORY_STYLES[cfg.category]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${cfg.category === 'active' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  )
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!id) return
    try {
      const [proj, taskList] = await Promise.all([
        getProject(id),
        listProjectTasks(id),
      ])
      setProject(proj)
      setTasks(taskList)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const handleNewTask = () => {
    if (!id) return
    navigate(`/project/${id}/pipeline`)
  }

  const handleDelete = async () => {
    if (!id || !project) return
    if (!confirm(`Delete "${project.name}" and all its tasks?`)) return
    await deleteProject(id)
    navigate('/')
  }

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation()
    if (!confirm('Delete this task?')) return
    try {
      await deleteTask(taskId)
      setTasks(prev => prev.filter(t => t.task_id !== taskId))
    } catch { /* ignore */ }
  }

  if (loading) return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-3" aria-busy="true">
        <div className="h-24 bg-[var(--color-surface)] animate-pulse rounded-md border border-[var(--color-border)]" />
      </div>
    </div>
  )

  if (!project) return (
    <div className="min-h-screen p-8 text-[var(--color-ink-secondary)]">Project not found.</div>
  )

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-4xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All Projects
      </button>

      {/* Header */}
      <div className="paper p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)] truncate" style={{ fontFamily: 'var(--font-serif)' }}>
              {project.name}
            </h1>
            {project.description && (
              <p className="text-sm text-[var(--color-ink-secondary)] mt-2">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleNewTask}
              className="flex items-center gap-1.5 bg-[var(--color-accent)] text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-accent-hover)] transition-colors">
              <Plus className="w-3.5 h-3.5" /> New Task
            </button>
            <button onClick={handleDelete}
              className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-error)] transition-colors p-1.5"
              aria-label="Delete project">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-4 text-xs text-[var(--color-ink-muted)]">
          <span className="ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}
          </span>
        </div>
      </div>

      {/* Tasks section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--color-ink)]">Tasks</h2>
        <span className="text-xs text-[var(--color-ink-muted)]">{tasks.length} total</span>
      </div>

      {tasks.length === 0 ? (
        <div className="paper p-10 text-center">
          <p className="text-sm text-[var(--color-ink-secondary)]">
            No tasks yet. Click "New Task" to begin.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map(task => {
            const repoName = task.repo_url && task.repo_url !== 'trending' && task.repo_url !== 'pending'
              ? task.repo_url.replace('https://github.com/', '')
              : task.repo_url === 'trending' ? 'GitHub Trending' : 'Manual'
            return (
              <div key={task.task_id}
                onClick={() => navigate(`/project/${id}/task/${task.task_id}`)}
                className="paper p-3 flex items-center gap-3 text-left hover:border-[var(--color-accent)] transition-colors cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-[var(--color-ink)] truncate">{repoName}</span>
                    <span className="text-[10px] text-[var(--color-ink-muted)] font-mono shrink-0">{task.task_id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={task.status} />
                  </div>
                </div>
                <div className="text-[10px] text-[var(--color-ink-muted)] shrink-0">
                  {timeAgo(task.updated_at || task.created_at)}
                </div>
                <button onClick={(e) => handleDeleteTask(e, task.task_id)}
                  className="opacity-0 group-hover:opacity-100 text-[var(--color-ink-muted)] hover:text-[var(--color-status-error)] transition-all p-1 shrink-0"
                  aria-label="Delete task">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
