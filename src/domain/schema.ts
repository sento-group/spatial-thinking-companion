import { z } from "zod";

export const nodeTypeSchema = z.enum([
  "fact",
  "question",
  "hypothesis",
  "decision",
  "action",
  "risk",
]);

export const timeSchema = z.enum(["past", "present", "future", "timeless"]);
export const abstractionSchema = z.enum(["concrete", "structure", "abstract"]);
export const socialReachSchema = z.enum([
  "self",
  "close_group",
  "organization",
  "market",
  "society",
  "future_generations",
]);
export const nodeStatusSchema = z.enum(["active", "resolved", "parked"]);
export const sourceKindSchema = z.enum(["initial_input", "message", "challenge_response"]);
export const challengeKindSchema = z.enum([
  "blind_spot",
  "objection",
  "assumption",
  "question",
  "contradiction",
]);
export const challengeStatusSchema = z.enum(["open", "answered", "resolved", "parked"]);
export const viewKindSchema = z.enum([
  "roadmap",
  "time_abstraction",
  "time_social_reach",
  "relation",
]);
export const relationSchema = z.enum([
  "causes",
  "requires",
  "means",
  "supports",
  "replaces",
  "assumes",
  "contradicts",
  "includes",
  "invalidates",
  "affects",
  "example_of",
]);

export const sourceFragmentSchema = z.object({
  id: z.string().min(1),
  kind: sourceKindSchema,
  text: z.string().min(1),
});

export const thinkingNodeSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  type: nodeTypeSchema,
  time: timeSchema,
  abstraction: abstractionSchema,
  socialReach: socialReachSchema,
  certainty: z.number().min(0).max(1),
  status: nodeStatusSchema,
  parentId: z.string().min(1).nullable(),
  order: z.number().int().nonnegative().optional(),
  facts: z.array(z.string()),
  sourceIds: z.array(z.string()).default([]),
  userLocked: z.boolean(),
});

export const thinkingEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  relation: relationSchema,
});

export const thinkingChallengeSchema = z.object({
  id: z.string().min(1),
  targetNodeId: z.string().min(1),
  kind: challengeKindSchema,
  statement: z.string().min(1),
  status: challengeStatusSchema,
  response: z.string().nullable(),
  impactSummary: z.string().nullable(),
});

export const thinkingGraphDraftSchema = z.object({
  schemaVersion: z.literal(1),
  northStar: z.object({
    statement: z.string().min(1),
    successCondition: z.string(),
  }),
  sources: z.array(sourceFragmentSchema).default([]),
  activeBranchId: z.string().min(1).nullable(),
  recommendedView: viewKindSchema,
  nodes: z.array(thinkingNodeSchema).min(1),
  edges: z.array(thinkingEdgeSchema),
  unresolvedQuestions: z.array(z.string()),
  contradictions: z.array(z.string()),
  blindSpots: z.array(z.string()),
  challenges: z.array(thinkingChallengeSchema).default([]),
  promotionQueue: z.array(z.string()),
  parkingLot: z.array(z.string()),
});

export const thinkingGraphSchema = thinkingGraphDraftSchema.superRefine((graph, context) => {
  const nodeIds = new Set<string>();
  const sourceIds = new Set<string>();
  for (const source of graph.sources) {
    if (sourceIds.has(source.id)) {
      context.addIssue({
        code: "custom",
        message: `重複した原文IDです: ${source.id}`,
        path: ["sources"],
      });
    }
    sourceIds.add(source.id);
  }
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      context.addIssue({
        code: "custom",
        message: `重複したノードIDです: ${node.id}`,
        path: ["nodes"],
      });
    }
    nodeIds.add(node.id);
    for (const sourceId of node.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        context.addIssue({
          code: "custom",
          message: `存在しない原文を参照しています: ${node.id} -> ${sourceId}`,
          path: ["nodes"],
        });
      }
    }
  }

  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      context.addIssue({
        code: "custom",
        message: `重複したエッジIDです: ${edge.id}`,
        path: ["edges"],
      });
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      context.addIssue({
        code: "custom",
        message: `存在しないノードを参照するエッジです: ${edge.id}`,
        path: ["edges"],
      });
    }
  }

  const challengeIds = new Set<string>();
  for (const challenge of graph.challenges) {
    if (challengeIds.has(challenge.id)) {
      context.addIssue({
        code: "custom",
        message: `重複した検証課題IDです: ${challenge.id}`,
        path: ["challenges"],
      });
    }
    challengeIds.add(challenge.id);
    if (!nodeIds.has(challenge.targetNodeId)) {
      context.addIssue({
        code: "custom",
        message: `存在しないノードを参照する検証課題です: ${challenge.id}`,
        path: ["challenges"],
      });
    }
  }

  if (graph.activeBranchId && !nodeIds.has(graph.activeBranchId)) {
    context.addIssue({
      code: "custom",
      message: "現在枝が存在しないノードを参照しています",
      path: ["activeBranchId"],
    });
  }

  const parents = new Map(graph.nodes.map((node) => [node.id, node.parentId]));
  for (const node of graph.nodes) {
    if (node.parentId && !nodeIds.has(node.parentId)) {
      context.addIssue({
        code: "custom",
        message: `存在しない親ノードを参照しています: ${node.id}`,
        path: ["nodes"],
      });
      continue;
    }

    const visited = new Set<string>();
    let current: string | null = node.id;
    while (current) {
      if (visited.has(current)) {
        context.addIssue({
          code: "custom",
          message: `親子関係に循環があります: ${node.id}`,
          path: ["nodes"],
        });
        break;
      }
      visited.add(current);
      current = parents.get(current) ?? null;
    }
  }
});

export type ThinkingNode = z.infer<typeof thinkingNodeSchema>;
export type ThinkingEdge = z.infer<typeof thinkingEdgeSchema>;
export type ThinkingChallenge = z.infer<typeof thinkingChallengeSchema>;
export type SourceFragment = z.infer<typeof sourceFragmentSchema>;
export type ThinkingGraph = z.infer<typeof thinkingGraphDraftSchema>;
export type ViewKind = z.infer<typeof viewKindSchema>;
export type Relation = z.infer<typeof relationSchema>;

export function parseThinkingGraph(input: unknown): ThinkingGraph {
  const graph = thinkingGraphSchema.parse(input);
  if (graph.challenges.length > 0) return graph;

  const targetNodeId = graph.activeBranchId ?? graph.nodes[0]?.id;
  if (!targetNodeId) return graph;

  graph.challenges = [
    ...graph.unresolvedQuestions.map((statement, index): ThinkingChallenge => ({
      id: `legacy-question-${index + 1}`,
      targetNodeId,
      kind: "question",
      statement,
      status: "open",
      response: null,
      impactSummary: null,
    })),
    ...graph.blindSpots.map((statement, index): ThinkingChallenge => ({
      id: `legacy-blind-spot-${index + 1}`,
      targetNodeId,
      kind: "blind_spot",
      statement,
      status: "open",
      response: null,
      impactSummary: null,
    })),
    ...graph.contradictions.map((statement, index): ThinkingChallenge => ({
      id: `legacy-contradiction-${index + 1}`,
      targetNodeId,
      kind: "contradiction",
      statement,
      status: "open",
      response: null,
      impactSummary: null,
    })),
  ];
  return graph;
}
