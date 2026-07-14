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
  depth: number;
  clusterId: string | null;
  hasChildren: boolean;
  hiddenDescendantCount: number;
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

type BaseProjectedNode = Omit<ProjectedNode, "depth" | "clusterId" | "hasChildren" | "hiddenDescendantCount">;

function projectRoadmap(graph: ThinkingGraph): BaseProjectedNode[] {
  const children = new Map<string | null, ThinkingNode[]>();
  for (const node of graph.nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => {
      const orderDelta = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);
      return orderDelta || a.statement.localeCompare(b.statement, "ja");
    });
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
): BaseProjectedNode[] {
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
  if (view === "relation") {
    const seen = new Set<string>();
    return [...hierarchyEdges, ...crossEdges].filter((edge) => {
      const signature = `${edge.source}:${edge.target}:${edge.relation}`;
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }
  return crossEdges.length ? crossEdges : hierarchyEdges;
}

export function projectGraph(
  graph: ThinkingGraph,
  view: ViewKind,
  viewState: ViewState,
  collapsedNodeIds: string[] = [],
): GraphProjection {
  const children = new Map<string, ThinkingNode[]>();
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  for (const node of graph.nodes) {
    if (!node.parentId) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }

  function descendantsOf(id: string): string[] {
    return (children.get(id) ?? []).flatMap((child) => [child.id, ...descendantsOf(child.id)]);
  }

  const hidden = new Set(collapsedNodeIds.flatMap(descendantsOf));
  const visibleIds = new Set(graph.nodes.filter((node) => !hidden.has(node.id)).map((node) => node.id));
  const visibleGraph: ThinkingGraph = {
    ...graph,
    nodes: graph.nodes.filter((node) => visibleIds.has(node.id)),
    edges: graph.edges.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
    challenges: graph.challenges.filter((challenge) => visibleIds.has(challenge.targetNodeId)),
  };

  function nodeMeta(node: ThinkingNode) {
    let depth = 0;
    let current = node;
    let clusterId: string | null = null;
    const seen = new Set<string>();
    while (current.parentId && !seen.has(current.id)) {
      seen.add(current.id);
      const parent = byId.get(current.parentId);
      if (!parent) break;
      depth += 1;
      clusterId = current.id;
      current = parent;
    }
    return {
      depth,
      clusterId: depth === 0 ? null : clusterId,
      hasChildren: (children.get(node.id)?.length ?? 0) > 0,
      hiddenDescendantCount: collapsedNodeIds.includes(node.id) ? descendantsOf(node.id).length : 0,
    };
  }

  let baseNodes: BaseProjectedNode[];
  if (view === "roadmap") baseNodes = projectRoadmap(visibleGraph);
  else if (view === "relation") baseNodes = projectRoadmap(visibleGraph);
  else baseNodes = projectSpatial(visibleGraph, view);
  const nodes: ProjectedNode[] = baseNodes.map((item) => ({ ...item, ...nodeMeta(item.node) }));

  return {
    nodes: applyLockedPositions(nodes, view, viewState),
    edges: projectEdges(visibleGraph, view),
  };
}
