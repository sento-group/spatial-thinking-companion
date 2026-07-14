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
  type OnNodeDrag,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { projectGraph } from "@/mapping/project";
import { useWorkspaceStore } from "@/store/workspace-store";
import { ThinkingNode, type ThinkingFlowNode } from "@/components/workspace/thinking-node";

const nodeTypes = { thinking: ThinkingNode };
const clusterColors = ["#0d7c86", "#8c5f2d", "#6d5478", "#446b43", "#9b4b3f", "#4c648c"];

function clusterColor(id: string | null): string | undefined {
  if (!id) return undefined;
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return clusterColors[hash % clusterColors.length];
}

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
  const edgeScope = useWorkspaceStore((state) => state.edgeScope);
  const relationDraft = useWorkspaceStore((state) => state.relationDraft);
  const collapsedNodeIds = useWorkspaceStore((state) => state.collapsedNodeIds);
  const setRelationTarget = useWorkspaceStore((state) => state.setRelationTarget);
  const projection = useMemo(
    () => projectGraph(graph, view, viewState, collapsedNodeIds),
    [collapsedNodeIds, graph, view, viewState],
  );
  const canvasRef = useRef<HTMLDivElement>(null);

  const projectedNodes = useMemo<ThinkingFlowNode[]>(
    () =>
      projection.nodes.map((item) => {
        const relationRole = relationDraft?.from === item.id
          ? "source" as const
          : relationDraft?.to === item.id
            ? "target" as const
            : undefined;
        return {
          id: item.id,
          type: "thinking",
          position: item.position,
          data: {
            item: item.node,
            challengeCount: graph.challenges.filter(
              (challenge) => challenge.targetNodeId === item.id
                && challenge.status !== "resolved"
                && challenge.status !== "parked",
            ).length,
            relationRole,
            depth: item.depth,
            clusterColor: clusterColor(item.clusterId),
            hasChildren: item.hasChildren,
            collapsed: collapsedNodeIds.includes(item.id),
            hiddenDescendantCount: item.hiddenDescendantCount,
          },
          selected: item.id === selectedNodeId,
        };
      }),
    [collapsedNodeIds, graph.challenges, projection.nodes, relationDraft, selectedNodeId],
  );
  const projectedEdges = useMemo<Edge[]>(
    () =>
      projection.edges
        .filter((edge) => edgeScope === "all" || edge.hierarchy)
        .map((edge) => ({
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
    [edgeScope, projection.edges],
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

  const focusCanvas = useCallback(() => canvasRef.current?.focus({ preventScroll: true }), []);
  const handleNodeClick: NodeMouseHandler<ThinkingFlowNode> = useCallback((_, node) => {
    focusCanvas();
    if (relationDraft && !relationDraft.to && relationDraft.from !== node.id) {
      setRelationTarget(node.id);
      return;
    }
    selectNode(node.id);
  }, [focusCanvas, relationDraft, selectNode, setRelationTarget]);
  const handleNodeDragStop: OnNodeDrag<ThinkingFlowNode> = useCallback(
    (_, node) => moveNode(node.id, node.position),
    [moveNode],
  );
  const handlePaneClick = useCallback(() => {
    focusCanvas();
    selectNode(null);
  }, [focusCanvas, selectNode]);

  return (
    <div ref={canvasRef} className={`paper-grid h-full w-full${relationDraft ? " is-connecting" : ""}`} aria-label="思考の盤面" tabIndex={0}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setFlow}
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
        onPaneClick={handlePaneClick}
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
