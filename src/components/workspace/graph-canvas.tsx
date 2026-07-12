"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";

import { projectGraph } from "@/mapping/project";
import { useWorkspaceStore } from "@/store/workspace-store";
import { ThinkingNode, type ThinkingFlowNode } from "@/components/workspace/thinking-node";

const nodeTypes = { thinking: ThinkingNode };

const relationLabels: Record<string, string> = {
  causes: "原因",
  requires: "必要",
  means: "手段",
  supports: "支持",
  replaces: "代替",
  assumes: "前提",
  contradicts: "矛盾",
  includes: "包含",
  invalidates: "無効化",
  affects: "影響",
  example_of: "具体例",
};

export function GraphCanvas() {
  const graph = useWorkspaceStore((state) => state.graph);
  const view = useWorkspaceStore((state) => state.view);
  const viewState = useWorkspaceStore((state) => state.viewState);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const moveNode = useWorkspaceStore((state) => state.moveNode);
  const projection = useMemo(() => projectGraph(graph, view, viewState), [graph, view, viewState]);

  const projectedNodes = useMemo<ThinkingFlowNode[]>(
    () =>
      projection.nodes.map((item) => ({
        id: item.id,
        type: "thinking",
        position: item.position,
        data: { item: item.node },
        selected: item.id === selectedNodeId,
      })),
    [projection.nodes, selectedNodeId],
  );
  const projectedEdges = useMemo<Edge[]>(
    () =>
      projection.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.hierarchy ? undefined : relationLabels[edge.relation] ?? edge.relation,
        type: edge.hierarchy ? "smoothstep" : "default",
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: {
          stroke: edge.relation === "contradicts" ? "#c2402a" : edge.hierarchy ? "#8f897c" : "#2e4b9b",
          strokeWidth: edge.hierarchy ? 1.4 : 1.8,
          strokeDasharray: edge.relation === "assumes" ? "5 4" : undefined,
        },
        labelStyle: { fill: "#556170", fontSize: 10, fontFamily: "var(--font-geist-mono)" },
      })),
    [projection.edges],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<ThinkingFlowNode>(projectedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(projectedEdges);
  const [flow, setFlow] = useState<ReactFlowInstance<ThinkingFlowNode, Edge> | null>(null);

  useEffect(() => setNodes(projectedNodes), [projectedNodes, setNodes]);
  useEffect(() => setEdges(projectedEdges), [projectedEdges, setEdges]);
  useEffect(() => {
    if (!flow) return;
    const frame = window.requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.24, duration: 260 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [flow, projection.nodes, view]);

  const handleNodeClick: NodeMouseHandler<ThinkingFlowNode> = (_, node) => selectNode(node.id);

  return (
    <div className="paper-grid h-full w-full" aria-label="思考の盤面">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setFlow}
        onNodeClick={handleNodeClick}
        onNodeDragStop={(_, node) => moveNode(node.id, node.position)}
        onPaneClick={() => selectNode(null)}
        fitView
        fitViewOptions={{ padding: 0.24 }}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} color="#8f897c" gap={20} size={0.6} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => (node.id === selectedNodeId ? "#0d7c86" : "#8f897c")}
          maskColor="rgb(244 241 232 / 72%)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
