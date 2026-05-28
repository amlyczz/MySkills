import { useCallback } from 'react'
import { type Node, type Edge, useNodesState, useEdgesState } from '@xyflow/react'
import type { DagSnapshot } from '../../../lib/api'

export function dagSnapshotToReactFlow(snapshot: DagSnapshot): { nodes: Node[]; edges: Edge[] } {
  const activeSet = new Set(snapshot.active_path_nodes)

  const rfNodes: Node[] = snapshot.nodes.map(n => ({
    id: n.id,
    type: n.type === 'hitl' ? 'dagHitl' : n.type === 'source' ? 'dagSource' : 'dagProcess',
    position: n.position,
    data: { label: n.label, icon: n.icon, state: n.state, status_label: n.status_label },
  }))

  const rfEdges: Edge[] = snapshot.edges.map(e => {
    const isActive = activeSet.has(e.source) || activeSet.has(e.target)
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      selected: isActive,
      style: isActive
        ? { stroke: '#7C2D2D', strokeWidth: 2.5, strokeDasharray: '6 3', animation: 'dash-flow 0.8s linear infinite' }
        : { stroke: '#D6D0C4', strokeWidth: 1.5, opacity: 0.6 },
    }
  })

  return { nodes: rfNodes, edges: rfEdges }
}

export function useDagGraph() {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  const applyDagSnapshot = useCallback((snapshot: DagSnapshot) => {
    const { nodes, edges } = dagSnapshotToReactFlow(snapshot)
    setRfNodes(nodes)
    setRfEdges(edges)
  }, [setRfNodes, setRfEdges])

  return {
    rfNodes,
    rfEdges,
    onNodesChange,
    onEdgesChange,
    applyDagSnapshot,
  }
}
