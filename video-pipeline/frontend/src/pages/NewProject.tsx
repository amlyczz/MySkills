import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Globe, Flame, Play } from 'lucide-react'
import { createProject } from '../lib/api'

const sourceTypes = [
  { value: 'github_repo', label: 'GitHub Repo', icon: <Globe className="w-5 h-5" />, desc: 'Generate video from a GitHub repository' },
  { value: 'trending', label: 'GitHub Trending', icon: <Flame className="w-5 h-5" />, desc: 'Pick from trending repos on GitHub' },
]

export default function NewProject() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState('github_repo')
  const [repoUrl, setRepoUrl] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const project = await createProject({
        name: name.trim(),
        source_type: sourceType,
        repo_url: repoUrl.trim() || undefined,
      })
      navigate(`/project/${project.id}`)
    } catch {
      alert('Failed to create project. Is the backend running?')
    }
    setCreating(false)
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </button>

      <h1 className="text-3xl font-extrabold text-white mb-2">Create New Project</h1>
      <p className="text-[var(--color-text-secondary)] mb-8">Choose a source type and name your project.</p>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Source type */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">Source Type</label>
          <div className="grid grid-cols-2 gap-3">
            {sourceTypes.map(st => (
              <button
                key={st.value}
                type="button"
                onClick={() => setSourceType(st.value)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  sourceType === st.value
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'border-white/10 bg-black/30 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1 text-white">
                  {st.icon}
                  <span className="font-semibold">{st.label}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{st.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Project name */}
        <div>
          <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. LangChain Promo"
            required
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Repo URL (optional) */}
        {sourceType === 'github_repo' && (
          <div>
            <label className="block text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">
              Repository URL <span className="text-[var(--color-text-muted)]">(optional — can fill later)</span>
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="w-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-purple)] text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Play className="w-5 h-5 fill-current" />
          {creating ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  )
}
