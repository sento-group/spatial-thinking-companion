import { z } from "zod";

import {
  thinkingEdgeSchema,
  thinkingChallengeSchema,
  thinkingGraphDraftSchema,
  thinkingGraphSchema,
  thinkingNodeSchema,
  sourceFragmentSchema,
  viewKindSchema,
  parseThinkingGraph,
} from "@/domain/schema";

export const graphCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("source.add"), source: sourceFragmentSchema }),
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
  z.object({ type: z.literal("challenge.add"), challenge: thinkingChallengeSchema }),
  z.object({
    type: z.literal("challenge.update"),
    id: z.string(),
    changes: thinkingChallengeSchema.omit({ id: true }).partial(),
  }),
  z.object({ type: z.literal("challenge.remove"), id: z.string() }),
  z.object({ type: z.literal("branch.activate"), id: z.string() }),
  z.object({ type: z.literal("graph.promote"), nodeId: z.string(), reason: z.string() }),
]);

export const initialMapResponseSchema = z.object({
  reply: z.string(),
  recommendedView: viewKindSchema,
  recommendationReason: z.string(),
  graph: thinkingGraphSchema,
  degraded: z.boolean().default(false),
});

export const initialMapDraftResponseSchema = initialMapResponseSchema.extend({
  graph: thinkingGraphDraftSchema,
});

export const patchResponseSchema = z.object({
  reply: z.string().default("回答に基づく構造変更案を作成しました。"),
  commands: z.array(graphCommandSchema).max(20),
  requiresApproval: z.boolean().default(true),
  restructureProposal: z.string().nullable().default(null),
  degraded: z.boolean().default(false),
});

export type InitialMapResponse = z.infer<typeof initialMapResponseSchema>;
export type PatchResponse = z.infer<typeof patchResponseSchema>;

export function normalizeInitialMapResponse(
  input: z.input<typeof initialMapDraftResponseSchema>,
  authoritativeSources?: Array<z.infer<typeof sourceFragmentSchema>>,
): InitialMapResponse {
  const draft = initialMapDraftResponseSchema.parse(input);
  const graph = structuredClone(draft.graph);
  graph.sources = structuredClone(authoritativeSources ?? draft.graph.sources);
  const sourceIds = new Set(graph.sources.map((source) => source.id));
  const uniqueNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  graph.nodes = [...uniqueNodes.values()];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    node.sourceIds = node.sourceIds.filter((sourceId) => sourceIds.has(sourceId));
    if (node.sourceIds.length === 0 && graph.sources.length === 1) {
      node.sourceIds = [graph.sources[0].id];
    }
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

  const challengeIds = new Set<string>();
  graph.challenges = graph.challenges
    .filter((challenge) => nodeIds.has(challenge.targetNodeId))
    .map((challenge, index) => {
      let id = challenge.id;
      while (challengeIds.has(id)) id = `${challenge.id}-${index}`;
      challengeIds.add(id);
      return { ...challenge, id };
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

  return initialMapResponseSchema.parse({ ...draft, graph: parseThinkingGraph(graph) });
}
