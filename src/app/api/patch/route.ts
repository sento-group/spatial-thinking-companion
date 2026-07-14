import { generateText, Output } from "ai";
import { z } from "zod";

import { createLocalPatch } from "@/ai/local-fallback";
import { allowAiRequest } from "@/ai/rate-limit";
import { patchResponseSchema } from "@/ai/schemas";
import { SPATIAL_THINKING_SYSTEM } from "@/ai/prompt";
import { reasoningModel, reasoningProviderOptions } from "@/ai/models";
import { attachSourceToCommands, createSourceFragment } from "@/ai/source-context";
import {
  sourceFragmentSchema,
  thinkingChallengeSchema,
  thinkingEdgeSchema,
  thinkingNodeSchema,
} from "@/domain/schema";

const requestSchema = z.object({
  message: z.string().min(1).max(8_000),
  context: z.object({
    northStar: z.object({ statement: z.string(), successCondition: z.string() }),
    activeBranchId: z.string().nullable(),
    sourceTurns: z.array(sourceFragmentSchema).max(80),
    humanTurns: z.array(z.object({ id: z.string(), text: z.string() })).max(40),
    activePath: z.array(thinkingNodeSchema).max(20),
    activeNodes: z.array(thinkingNodeSchema).max(40),
    relevantEdges: z.array(thinkingEdgeSchema).max(100),
    lockedNodes: z.array(thinkingNodeSchema).max(40),
    unresolvedQuestions: z.array(z.string()),
    contradictions: z.array(z.string()),
    promotionQueue: z.array(z.string()),
    challenges: z.array(thinkingChallengeSchema).max(20).optional(),
    challenge: thinkingChallengeSchema.optional(),
  }),
});

export async function POST(request: Request): Promise<Response> {
  if (!allowAiRequest(request)) return Response.json({ error: "少し時間をおいてください" }, { status: 429 });
  const body = requestSchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "入力を確認してください" }, { status: 400 });

  const { message, context } = body.data;
  const source = createSourceFragment(
    message,
    context.challenge ? "challenge_response" : "message",
  );
  try {
    const { output } = await generateText({
      model: reasoningModel(),
      system: SPATIAL_THINKING_SYSTEM,
      output: Output.object({ schema: patchResponseSchema }),
      prompt: `現在の思考状態へ差分commandだけを返してください。
sourceTurnsとhumanTurnsの逐語テキストが正本です。直近発言だけで本筋を上書きしないでください。
今回の発言に由来する追加・更新ノードのsourceIdsには「${source.id}」を入れてください。

状態:
${JSON.stringify({ ...context, sourceTurns: [...context.sourceTurns, source] })}

今回の逐語発言:
${message}`,
      providerOptions: reasoningProviderOptions("graph-patch", "medium"),
    });
    return Response.json({
      ...output,
      commands: attachSourceToCommands(
        output.commands,
        source,
        [...context.activeNodes, ...context.activePath, ...context.lockedNodes],
      ),
      degraded: false,
    });
  } catch (error) {
    console.error("AI Gateway graph patch failed; using local fallback", error);
    return Response.json(createLocalPatch(message, context.activeBranchId, context.challenge, source));
  }
}
