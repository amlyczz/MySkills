import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Trash2, Film, Globe, Flame, FolderOpen } from 'lucide-react'
import { listProjects, deleteProject, type ProjectData } from '../lib/api'

const sourceIcons: Record<string, React.ReactNode> = {
  github_repo: <Globe className="w-4 h-4" />,
  trending: <Flame className="w-4 h-4" />,
}

const statusColors: Record<string, string> = {
  completed: 'text-green-400 border-green-500/30 bg-green-500/10',
  error: 'text-red-400 border-red-500/30 bg-red-500/10',
  rendering: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
  pending: 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
}

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
    } catch (e) {
      setError('Failed to load projects. Is the backend running?')
    }
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProjects()
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
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Film className="w-8 h-8 text-[var(--color-accent)]" />
            Video Pipeline
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Manage your video generation projects</p>
        </div>
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-2 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] text-white font-bold px-6 py-3 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all"
        >
          <Plus className="w-5 h-5" /> New Project
        </button>
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-black/50 border border-white/10 rounded-lg pl-11 pr-4 py-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="glass-panel p-6 text-center text-[var(--color-text-secondary)]">
          <p>{error}</p>
          <button onClick={fetchProjects} className="mt-3 text-[var(--color-accent)] hover:underline text-sm">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="glass-panel p-12 text-center text-[var(--color-text-secondary)]">
          Loading projects...
        </div>
      )}

      {/* Empty */}
      {!loading && !error && projects.length === 0 && (
        <div className="glass-panel p-12 text-center">
          <FolderOpen className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)] mb-4">No projects yet</p>
          <button
            onClick={() => navigate('/projects/new')}
            className="text-[var(--color-accent)] hover:underline"
          >
            Create your first project
          </button>
        </div>
      )}

      {/* Project grid */}
      {!loading && !error && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/project/${p.id}`)}
              className="glass-panel p-5 cursor-pointer hover:border-[var(--color-accent)]/30 transition-all group relative"
            >
              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(p.id, p.name) }}
                className="absolute top-3 right-3 text-[var(--color-text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Title */}
              <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2 truncate pr-6">
                {sourceIcons[p.source_type] || <FolderOpen className="w-4 h-4" />}
                {p.name}
              </h3>

              {/* Meta */}
              <p className="text-[var(--color-text-secondary)] text-sm mb-3 line-clamp-2">
                {p.description || p.repo_url || 'No description'}
              </p>

              {/* Tags */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--color-text-muted)]">
                  {p.task_count} task{p.task_count !== 1 ? 's' : ''}
                </span>
                {p.language && (
                  <span className="text-[var(--color-accent-purple)] bg-[var(--color-accent-purple)]/10 px-2 py-0.5 rounded">
                    {p.language}
                  </span>
                )}
                <span className="text-[var(--color-text-muted)] ml-auto">
                  {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white/10 rounded text-white disabled:opacity-30"
          >
            Prev
          </button>
          <span className="px-4 py-2 text-[var(--color-text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white/10 rounded text-white disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
