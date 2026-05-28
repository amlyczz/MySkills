import { useState } from 'react'
import { ChevronDown, Pause } from 'lucide-react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  BaseEdge,
  getBezierPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// ── Custom Edge ──
function GlowEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  return (
    <BaseEdge
      path={edgePath}
      markerEnd={MarkerType.ArrowClosed}
      style={{
        stroke: selected ? '#7C2D2D' : '#D6D0C4',
        strokeWidth: selected ? 2.5 : 1.5,
        strokeDasharray: selected ? '6 3' : undefined,
        animation: selected ? 'dash-flow 0.8s linear infinite' : undefined,
      }}
    />
  )
}

// ── Custom Node Components ──
function DagProcessNode({ data }: NodeProps) {
  const { state, label, icon, status_label } = data as {
    state: string; label: string; icon: string; status_label: string
  }

  let containerCls = 'border-[#D6D0C4] bg-white'
  let accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#D6D0C4]" />

  if (state === 'completed') {
    containerCls = 'border-[#166534] bg-[#F0FDF4]'
    accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
  } else if (state === 'active') {
    containerCls = 'node-active'
    accentNode = (
      <div className="radar-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
      </div>
    )
  } else if (state === 'error') {
    containerCls = 'node-error'
    accentNode = <span className="alarm-blink w-1.5 h-1.5 rounded-full" />
  }

  const statusCls = state === 'completed' ? 'text-[#166534]' :
    state === 'active' ? 'text-[#2563EB] font-bold' :
    state === 'error' ? 'text-[#DC2626] font-extrabold' : 'text-[#A8A29E]'

  return (
    <div className={`relative rounded-lg border-2 ${containerCls} min-w-[130px] transition-all duration-500`}>
      <Handle type="target" position={Position.Left} className="!bg-[#7C2D2D] !w-2.5 !h-2.5 !border-2 !border-white !left-[-5px]" />
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm">{icon}</span>
          <span className="text-[11px] font-semibold text-[#1C1917]">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {accentNode}
          <span className={`text-[9px] font-bold tracking-wider ${statusCls}`}>{status_label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#7C2D2D] !w-2.5 !h-2.5 !border-2 !border-white !right-[-5px]" />
    </div>
  )
}

function DagHitlNode({ data }: NodeProps) {
  const { state, label, status_label } = data as {
    state: string; label: string; status_label: string
  }

  let containerCls = 'border-[#D6D0C4] border-dashed bg-white'
  let accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#D6D0C4]" />

  if (state === 'hitl') {
    containerCls = 'node-hitl'
    accentNode = <span className="alarm-blink w-1.5 h-1.5 rounded-full bg-[#D97706]" />
  } else if (state === 'completed') {
    containerCls = 'border-[#166534] border-solid bg-[#F0FDF4]'
    accentNode = <span className="w-1.5 h-1.5 rounded-full bg-[#166534]" />
  }

  const statusCls = state === 'hitl' ? 'text-[#D97706] font-bold' :
    state === 'completed' ? 'text-[#166534]' : 'text-[#A8A29E]'

  return (
    <div className={`relative rounded-full border-2 ${containerCls} min-w-[90px] transition-all duration-500`}>
      <Handle type="target" position={Position.Left} className="!bg-[#8B6914] !w-2.5 !h-2.5 !border-2 !border-white !left-[-5px]" />
      <div className="px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Pause className="w-3 h-3" />
          <span className="text-[10px] font-semibold text-[#1C1917]">{label}</span>
          {accentNode}
          <span className={`text-[8px] font-bold tracking-wider ${statusCls}`}>{status_label}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-[#8B6914] !w-2.5 !h-2.5 !border-2 !border-white !right-[-5px]" />
    </div>
  )
}

function DagSourceNode({ data }: NodeProps) {
  const { state, label, icon, status_label } = data as {
    state: string; label: string; icon: string; status_label: string
  }

  let containerCls = 'opacity-50 border-[#D6D0C4] bg-[#FAF9F6]'

  if (state === 'completed') {
    containerCls = 'opacity-100 border-[#166534] bg-[#F0FDF4]'
  } else if (state === 'active') {
    containerCls = 'opacity-100 node-active'
  }

  const statusCls = state === 'completed' ? 'text-[#166534]' :
    state === 'active' ? 'text-[#2563EB] font-bold' : 'text-[#A8A29E]'

  return (
    <div className={`relative rounded-lg border ${containerCls} min-w-[110px] transition-all duration-500`}>
      <Handle type="source" position={Position.Right} className="!bg-[#7C2D2D] !w-2.5 !h-2.5 !border-2 !border-white !right-[-5px]" />
      <div className="px-3 py-2">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xs">{icon}</span>
          <span className="text-[10px] font-semibold text-[#1C1917]">{label}</span>
        </div>
        <span className={`text-[9px] font-bold tracking-wider ${statusCls}`}>{status_label}</span>
      </div>
    </div>
  )
}

const nodeTypes = {
  dagProcess: DagProcessNode,
  dagHitl: DagHitlNode,
  dagSource: DagSourceNode,
}

const edgeTypes = {
  default: GlowEdge,
}

interface DAGViewerProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: any
  onEdgesChange: any
}

export function DAGViewer({ nodes, edges, onNodesChange, onEdgesChange }: DAGViewerProps) {
  const [showDag, setShowDag] = useState(true)

  return (
    <section className="paper overflow-hidden">
      <button onClick={() => setShowDag(!showDag)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#FAF9F6] transition-colors">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-[#7C2D2D] text-white text-[11px] font-bold flex items-center justify-center">1</span>
          <h2 className="text-sm font-semibold text-[#1C1917] uppercase tracking-wider">Pipeline Execution DAG</h2>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#A8A29E] transition-transform ${showDag ? '' : '-rotate-90'}`} />
      </button>
      {showDag && (
        <div className="border-t border-[#E2DED6]" style={{ height: 'clamp(320px, 48vh, 520px)' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.4}
            maxZoom={2}
            panOnDrag
            zoomOnScroll
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
          >
            <Background color="#E2DED6" gap={24} size={1} />
            <Controls showInteractive={false}
              className="[&>button]:bg-white [&>button]:border-[#E2DED6] [&>button]:text-[#57534E] [&>button]:rounded-md [&>button]:shadow-sm" />
          </ReactFlow>
        </div>
      )}
    </section>
  )
}
