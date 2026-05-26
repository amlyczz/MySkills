const API_BASE = 'http://localhost:18274/api/v1'

// ── Types ──

export interface ProjectData {
  id: string
  name: string
  description: string | null
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

// ── API calls (all support AbortSignal for request cancellation) ──

export async function listProjects(
  page = 1, search?: string, signal?: AbortSignal,
): Promise<ProjectListResponse> {
  const params = new URLSearchParams({ page: String(page), page_size: '20' })
  if (search) params.set('search', search)
  const res = await fetch(`${API_BASE}/projects?${params}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`)
  return res.json()
}

export async function getProject(id: string, signal?: AbortSignal): Promise<ProjectData> {
  const res = await fetch(`${API_BASE}/projects/${id}`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`)
  return res.json()
}

export async function createProject(data: { name: string }): Promise<ProjectData> {
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
  data: { repo_url?: string; twitter_url?: string },
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

export interface TaskItem {
  task_id: string
  repo_url: string
  status: string
  created_at: string | null
  updated_at: string | null
}

export async function listProjectTasks(
  projectId: string, signal?: AbortSignal,
): Promise<TaskItem[]> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/tasks`, { signal })
  if (!res.ok) throw new Error(`Failed to list tasks: ${res.status}`)
  return res.json()
}

export async function getTaskStatus(
  taskId: string, signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/task/${taskId}`, { signal })
  if (!res.ok) throw new Error(`Failed to get task: ${res.status}`)
  return res.json()
}

// ── DAG Types ──

export interface DagNodeSnapshot {
  id: string
  label: string
  icon: string
  type: string
  position: { x: number; y: number }
  state: string
  status_label: string
}

export interface DagEdgeSnapshot {
  id: string
  source: string
  target: string
}

export interface DagSnapshot {
  task_id: string
  nodes: DagNodeSnapshot[]
  edges: DagEdgeSnapshot[]
  active_path_nodes: string[]
  pipeline_status: string
  source_type: string
}

export async function fetchTaskDag(
  taskId: string, signal?: AbortSignal,
): Promise<DagSnapshot> {
  const res = await fetch(`${API_BASE}/task/${taskId}/dag`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch DAG: ${res.status}`)
  return res.json()
}

export async function fetchDefaultDag(signal?: AbortSignal): Promise<DagSnapshot> {
  const res = await fetch(`${API_BASE}/task/dag`, { signal })
  if (!res.ok) throw new Error(`Failed to fetch default DAG: ${res.status}`)
  return res.json()
}
