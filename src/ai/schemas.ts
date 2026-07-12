import { z } from "zod";

import {
  thinkingEdgeSchema,
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

export const patchResponseSchema = z.object({
  reply: z.string(),
  commands: z.array(graphCommandSchema).max(20),
  requiresApproval: z.boolean(),
  restructureProposal: z.string().nullable(),
});

export type InitialMapResponse = z.infer<typeof initialMapResponseSchema>;
export type PatchResponse = z.infer<typeof patchResponseSchema>;
