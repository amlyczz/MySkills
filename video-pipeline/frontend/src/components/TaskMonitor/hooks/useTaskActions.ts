import { useCallback } from 'react'

interface UseTaskActionsOptions {
  currentTaskId: string | null
  connectResumeWebSocket: (taskId: string, action: string, feedback?: string, repoUrl?: string) => void
}

export function useTaskActions({ currentTaskId, connectResumeWebSocket }: UseTaskActionsOptions) {
  const confirmAndSendHitl = useCallback((action: string, feedback?: string, repoUrl?: string) => {
    const confirmMap: Record<string, string> = {
      select: `Confirm select this repo?\n\n${repoUrl}`,
      approve: 'Confirm approve?',
      reject: 'Confirm reject and retry?',
      abort: 'Confirm abort entire pipeline? This cannot be undone.',
    }
    const msg = confirmMap[action]
    if (msg && !confirm(msg)) return
    if (!currentTaskId) return

    connectResumeWebSocket(currentTaskId, action, feedback, repoUrl)
  }, [currentTaskId, connectResumeWebSocket])

  return { confirmAndSendHitl }
}
