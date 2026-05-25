const API_BASE = 'http://localhost:18274/api/v1'

// ── Types ──

export interface ProjectData {
  id: string
  name: string
  source_type: string
  repo_url: string | null
  description: string | null
  language: string | null
  stars: number | null
  thumbnail_url: string | null
  task_count: number
  created_at: string | null
  updated_at: string | null
}

export interface ProjectListResponse {
  projects: ProjectData[]
  total: number
  page: number
  page_size: number
}

// ── API calls ──

export async function listProjects(page = 1, search?: string): Promise<ProjectListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: '20' })
  if (search) params.set('search', search)
  const res = await fetch(`${API_BASE}/projects?${params}`)
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`)
  return res.json()
}

export async function getProject(id: string): Promise<ProjectData> {
  const res = await fetch(`${API_BASE}/projects/${id}`)
  if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`)
  return res.json()
}

export async function createProject(data: {
  name: string
  source_type: string
  repo_url?: string
}): Promise<ProjectData> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to create project: ${res.status}`)
  return res.json()
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete project: ${res.status}`)
}

export async function submitTaskInProject(
  projectId: string,
  data: { repo_url?: string; project_type?: string }
): Promise<{ task_id: string; project_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Failed to submit task: ${res.status}`)
  return res.json()
}

export async function deleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/task/${taskId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`)
}
