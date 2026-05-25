import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trash2, ExternalLink, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { getProject, deleteProject, type ProjectData } from '../lib/api'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProject = async () => {
    if (!id) return
    try {
      const data = await getProject(id)
      setProject(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { fetchProject() }, [id])

  const handleDelete = async () => {
    if (!id || !project) return
    if (!confirm(`Delete "${project.name}" and all its tasks?`)) return
    await deleteProject(id)
    navigate('/')
  }

  if (loading) return <div className="min-h-screen p-8 text-[var(--color-text-secondary)]">Loading...</div>
  if (!project) return <div className="min-h-screen p-8 text-[var(--color-text-secondary)]">Project not found.</div>

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Projects
      </button>

      {/* Project header */}
      <div className="glass-panel p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white mb-1">{project.name}</h1>
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-accent)] hover:underline flex items-center gap-1"
              >
                {project.repo_url} <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {project.description && (
              <p className="text-[var(--color-text-secondary)] text-sm mt-2">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-text-muted)]">
          <span className="bg-[var(--color-accent)]/10 text-[var(--color-accent)] px-2 py-0.5 rounded border border-[var(--color-accent)]/30">
            {project.source_type}
          </span>
          {project.language && <span>{project.language}</span>}
          {project.stars !== null && <span>★ {project.stars?.toLocaleString()}</span>}
          <span className="ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Tasks</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{project.task_count} total</p>
      </div>

      {/* Empty state */}
      {project.task_count === 0 && (
        <div className="glass-panel p-12 text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">No tasks yet. Start your first generation.</p>
        </div>
      )}

      {/* Placeholder — tasks list will come from GET /task endpoint */}
      <div className="glass-panel p-8 text-center text-[var(--color-text-muted)]">
        <p>Task history will appear here once the task list API is connected.</p>
      </div>
    </div>
  )
}
