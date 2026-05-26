import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { createProject } from '../lib/api'

export default function NewProject() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    try {
      const project = await createProject({ name: name.trim() })
      navigate(`/project/${project.id}`)
    } catch {
      alert('Failed to create project. Is the backend running?')
    }
    setCreating(false)
  }

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-sm text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)] mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
        New Project
      </h1>
      <p className="text-sm text-[var(--color-ink-secondary)] mb-8">
        Name your project. You'll pick a source repo in the next step.
      </p>

      <form onSubmit={handleCreate} className="space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="project-name" className="block text-xs font-medium text-[var(--color-ink-secondary)] uppercase tracking-wider mb-1.5">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. LangChain Promo"
            required
            className="w-full border border-[var(--color-border)] rounded-md px-3 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="w-full bg-[var(--color-accent)] text-white font-semibold py-2.5 rounded-md hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-40"
        >
          {creating ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  )
}
