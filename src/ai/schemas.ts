import { z } from "zod";

import {
  thinkingEdgeSchema,
  thinkingGraphDraftSchema,
  thinkingGraphSchema,
  thinkingNodeSchema,
  viewKindSchema,
} from "@/domain/schema";

export const graphCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("node.add"), node: thinkingNodeSchema }),
  z.object({
    type: z.literal("node.update"),
    id: z.string(),
    changes: thinkingNodeSchema.omit({ id: true }).partial(),
  }),
  z.object({ type: z.literal("node.remove"), id: z.string() }),
  z.object({
    type: z.literal("node.merge"),
    sourceIds: z.array(z.string()),
    targetId: z.string(),
  }),
  z.object({ type: z.literal("edge.add"), edge: thinkingEdgeSchema }),
  z.object({
    type: z.literal("edge.update"),
    id: z.string(),
    changes: thinkingEdgeSchema.omit({ id: true }).partial(),
  }),
  z.object({ type: z.literal("edge.remove"), id: z.string() }),
  z.object({ type: z.literal("branch.activate"), id: z.string() }),
  z.object({ type: z.literal("graph.promote"), nodeId: z.string(), reason: z.string() }),
]);

export const initialMapResponseSchema = z.object({
  reply: z.string(),
  recommendedView: viewKindSchema,
  recommendationReason: z.string(),
  graph: thinkingGraphSchema,
});

export const initialMapDraftResponseSchema = initialMapResponseSchema.extend({
  graph: thinkingGraphDraftSchema,
});

export const patchResponseSchema = z.object({
  reply: z.string(),
  commands: z.array(graphCommandSchema).max(20),
  requiresApproval: z.boolean(),
  restructureProposal: z.string().nullable(),
});

export type InitialMapResponse = z.infer<typeof initialMapResponseSchema>;
export type PatchResponse = z.infer<typeof patchResponseSchema>;

export function normalizeInitialMapResponse(
  draft: z.infer<typeof initialMapDraftResponseSchema>,
): InitialMapResponse {
  const graph = structuredClone(draft.graph);
  const uniqueNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  graph.nodes = [...uniqueNodes.values()];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) node.parentId = null;
    const visited = new Set<string>();
    let current: string | null = node.id;
    while (current) {
      if (visited.has(current)) {
        node.parentId = null;
        break;
      }
      visited.add(current);
      current = graph.nodes.find((candidate) => candidate.id === current)?.parentId ?? null;
    }
  }

  const edgeIds = new Set<string>();
  graph.edges = graph.edges
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to)
    .map((edge, index) => {
      let id = edge.id;
      while (edgeIds.has(id)) id = `${edge.id}-${index}`;
      edgeIds.add(id);
      return { ...edge, id };
    });

  if (!graph.activeBranchId || !nodeIds.has(graph.activeBranchId)) {
    graph.activeBranchId = graph.nodes.find((node) => node.type === "action" && node.status === "active")?.id
      ?? graph.nodes[0]?.id
      ?? null;
  }

  const root = graph.nodes.find((node) => node.parentId === null && node.type === "decision")
    ?? graph.nodes.find((node) => node.parentId === null)
    ?? graph.nodes[0];
  if (root) root.userLocked = true;

  return initialMapResponseSchema.parse({ ...draft, graph });
}
