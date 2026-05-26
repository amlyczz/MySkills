import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, FolderOpen, Globe } from 'lucide-react'
import { listProjects, deleteProject, type ProjectData } from '../lib/api'

export default function ProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listProjects(page, search || undefined)
      setProjects(res.projects)
      setTotal(res.total)
    } catch {
      setError('Failed to load projects. Is the backend running?')
    }
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (page === 1) {
      // Already on page 1, useEffect won't fire — fetch directly
      fetchProjects()
    } else {
      setPage(1) // Triggers fetchProjects via useEffect
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete project "${name}" and all its tasks?`)) return
    try {
      await deleteProject(id)
      fetchProjects()
    } catch { /* ignore */ }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
            Video Pipeline
          </h1>
          <p className="text-sm text-[var(--color-ink-secondary)] mt-1">Manage your video generation projects</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 bg-[var(--color-accent)] text-white font-semibold px-4 py-2 rounded-md hover:bg-[var(--color-accent-hover)] transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> New Project
        </button>
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md pl-10 pr-4 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="paper p-6 text-center">
          <p className="text-[var(--color-status-error)] text-sm">{error}</p>
          <button onClick={fetchProjects} className="mt-2 text-sm text-[var(--color-accent)] hover:underline">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading projects">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 bg-[var(--color-surface)] animate-pulse rounded-md border border-[var(--color-border)]" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && projects.length === 0 && (
        <div className="paper p-12 text-center" role="status">
          <FolderOpen className="w-10 h-10 text-[var(--color-ink-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-ink-secondary)] mb-2">No projects yet</p>
          <button
            onClick={() => navigate('/projects/new')}
            className="text-sm text-[var(--color-accent)] hover:underline"
          >
            Create your first project
          </button>
        </div>
      )}

      {/* Project list */}
      {!loading && !error && projects.length > 0 && (
        <div className="space-y-2">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/project/${p.id}`)}
              className="paper p-4 cursor-pointer transition-all hover:border-[var(--color-border-strong)] group relative"
            >
              <button
                onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                className="absolute top-3 right-3 text-[var(--color-ink-muted)] hover:text-[var(--color-status-error)] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete ${p.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <h3 className="font-semibold text-[var(--color-ink)] flex items-center gap-2 truncate pr-8">
                <Globe className="w-4 h-4 text-[var(--color-ink-muted)] shrink-0" />
                {p.name}
              </h3>

              <p className="text-sm text-[var(--color-ink-secondary)] mt-0.5 line-clamp-1">
                {p.description || 'No description'}
              </p>

              <div className="flex items-center gap-3 mt-2 text-xs text-[var(--color-ink-muted)]">
                <span>{p.task_count} task{p.task_count !== 1 ? 's' : ''}</span>
                <span className="ml-auto">
                  {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-3">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors"
          >
            Prev
          </button>
          <span className="text-sm text-[var(--color-ink-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-md hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
