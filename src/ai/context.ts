import type { ThinkingGraph, ThinkingNode } from "@/domain/schema";

interface ContextMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

function pathToRoot(graph: ThinkingGraph, nodeId: string | null): ThinkingNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const path: ThinkingNode[] = [];
  const seen = new Set<string>();
  let current = nodeId ? byId.get(nodeId) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function buildPatchContext(
  graph: ThinkingGraph,
  messages: ContextMessage[],
  focusNodeId = graph.activeBranchId,
) {
  const focus = graph.nodes.find((node) => node.id === focusNodeId);
  const activePath = pathToRoot(graph, focusNodeId);
  const activeNodes = graph.nodes.filter(
    (node) => node.id === focusNodeId || node.parentId === focusNodeId || node.id === focus?.parentId,
  );
  const relevantIds = new Set([...activePath, ...activeNodes].map((node) => node.id));
  return {
    northStar: graph.northStar,
    activeBranchId: focusNodeId,
    sourceTurns: graph.sources,
    humanTurns: messages
      .filter((message) => message.role === "user")
      .slice(-40)
      .map((message) => ({ id: message.id, text: message.content })),
    activePath,
    activeNodes,
    relevantEdges: graph.edges.filter(
      (edge) => relevantIds.has(edge.from) || relevantIds.has(edge.to),
    ),
    lockedNodes: graph.nodes.filter((node) => node.userLocked),
    unresolvedQuestions: graph.unresolvedQuestions,
    contradictions: graph.contradictions,
    promotionQueue: graph.promotionQueue,
    challenges: graph.challenges.filter(
      (challenge) => relevantIds.has(challenge.targetNodeId),
    ),
  };
}
