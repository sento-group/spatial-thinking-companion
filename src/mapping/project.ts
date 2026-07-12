import dagre from "@dagrejs/dagre";

import type { ThinkingGraph, ThinkingNode, ViewKind } from "@/domain/schema";

export interface Position {
  x: number;
  y: number;
}

export interface SavedPosition extends Position {
  locked?: boolean;
}

export type ViewState = Partial<Record<ViewKind, Record<string, SavedPosition>>>;

export interface ProjectedNode {
  id: string;
  position: Position;
  node: ThinkingNode;
}

export interface ProjectedEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  hierarchy: boolean;
}

export interface GraphProjection {
  nodes: ProjectedNode[];
  edges: ProjectedEdge[];
}

const TIME_X: Record<ThinkingNode["time"], number> = {
  past: 80,
  present: 480,
  future: 880,
  timeless: 480,
};

const ABSTRACTION_Y: Record<ThinkingNode["abstraction"], number> = {
  abstract: 70,
  structure: 340,
  concrete: 610,
};

const SOCIAL_Y: Record<ThinkingNode["socialReach"], number> = {
  future_generations: 60,
  society: 170,
  market: 280,
  organization: 390,
  close_group: 500,
  self: 610,
};

function applyLockedPositions(
  nodes: ProjectedNode[],
  view: ViewKind,
  viewState: ViewState,
): ProjectedNode[] {
  const saved = viewState[view] ?? {};
  return nodes.map((item) => {
    const position = saved[item.id];
    return position?.locked
      ? { ...item, position: { x: position.x, y: position.y } }
      : item;
  });
}

function projectRoadmap(graph: ThinkingGraph): ProjectedNode[] {
  const children = new Map<string | null, ThinkingNode[]>();
  for (const node of graph.nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => a.statement.localeCompare(b.statement, "ja"));
  }

  let row = 0;
  const positions = new Map<string, Position>();
  const visited = new Set<string>();

  function layout(node: ThinkingNode, depth: number): number {
    if (visited.has(node.id)) return row;
    visited.add(node.id);
    const descendants = children.get(node.id) ?? [];
    let logicalY: number;
    if (descendants.length === 0) {
      logicalY = row;
      row += 1;
    } else {
      const childRows = descendants.map((child) => layout(child, depth + 1));
      logicalY = (childRows[0] + childRows.at(-1)!) / 2;
    }
    positions.set(node.id, { x: 70 + depth * 300, y: 70 + logicalY * 176 });
    return logicalY;
  }

  const roots = children.get(null) ?? [];
  for (const root of roots) layout(root, 0);
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) layout(node, 0);
  }

  return graph.nodes.map((node) => ({ id: node.id, node, position: positions.get(node.id)! }));
}

function projectSpatial(
  graph: ThinkingGraph,
  view: "time_abstraction" | "time_social_reach",
): ProjectedNode[] {
  const buckets = new Map<string, number>();
  return graph.nodes.map((node) => {
    const y = view === "time_abstraction" ? ABSTRACTION_Y[node.abstraction] : SOCIAL_Y[node.socialReach];
    const bucket = `${TIME_X[node.time]}:${y}`;
    const offset = buckets.get(bucket) ?? 0;
    buckets.set(bucket, offset + 1);
    return {
      id: node.id,
      node,
      position: {
        x: TIME_X[node.time] + (offset % 3) * 34,
        y: y + Math.floor(offset / 3) * 68,
      },
    };
  });
}

function projectRelation(graph: ThinkingGraph): ProjectedNode[] {
  const layout = new dagre.graphlib.Graph();
  layout.setGraph({ rankdir: "LR", nodesep: 54, ranksep: 130, marginx: 40, marginy: 40 });
  layout.setDefaultEdgeLabel(() => ({}));
  for (const node of graph.nodes) layout.setNode(node.id, { width: 210, height: 72 });
  for (const edge of graph.edges) layout.setEdge(edge.from, edge.to);
  dagre.layout(layout);

  return graph.nodes.map((node) => {
    const position = layout.node(node.id) as { x: number; y: number };
    return {
      id: node.id,
      node,
      position: { x: position.x - 105, y: position.y - 36 },
    };
  });
}

function projectEdges(graph: ThinkingGraph, view: ViewKind): ProjectedEdge[] {
  const hierarchyEdges: ProjectedEdge[] = graph.nodes
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `parent:${node.parentId}:${node.id}`,
      source: node.parentId!,
      target: node.id,
      relation: "includes",
      hierarchy: true,
    }));
  const crossEdges = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    relation: edge.relation,
    hierarchy: false,
  }));
  if (view === "roadmap") return hierarchyEdges;
  if (view === "relation") return crossEdges;
  return crossEdges.length ? crossEdges : hierarchyEdges;
}

export function projectGraph(
  graph: ThinkingGraph,
  view: ViewKind,
  viewState: ViewState,
): GraphProjection {
  let nodes: ProjectedNode[];
  if (view === "roadmap") nodes = projectRoadmap(graph);
  else if (view === "relation") nodes = projectRelation(graph);
  else nodes = projectSpatial(graph, view);

  return {
    nodes: applyLockedPositions(nodes, view, viewState),
    edges: projectEdges(graph, view),
  };
}
