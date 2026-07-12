import { generateText, Output } from "ai";
import { z } from "zod";

import { createLocalPatch } from "@/ai/local-fallback";
import { allowAiRequest } from "@/ai/rate-limit";
import { patchResponseSchema } from "@/ai/schemas";
import { SPATIAL_THINKING_SYSTEM } from "@/ai/prompt";

const requestSchema = z.object({
  message: z.string().min(1).max(8_000),
  context: z.object({
    northStar: z.string(),
    activeBranchId: z.string().nullable(),
    activeNodes: z.array(z.unknown()).max(40),
    unresolvedQuestions: z.array(z.string()),
    contradictions: z.array(z.string()),
    promotionQueue: z.array(z.string()),
  }),
});

export async function POST(request: Request): Promise<Response> {
  if (!allowAiRequest(request)) return Response.json({ error: "少し時間をおいてください" }, { status: 429 });
  const body = requestSchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "入力を確認してください" }, { status: 400 });

  const { message, context } = body.data;
  const hasGateway = Boolean(process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY);
  if (!hasGateway) return Response.json(createLocalPatch(message, context.activeBranchId));

  try {
    const { output } = await generateText({
      model: process.env.AI_MODEL ?? "openai/gpt-5.4",
      system: SPATIAL_THINKING_SYSTEM,
      output: Output.object({ schema: patchResponseSchema }),
      prompt: `現在の思考状態へ差分commandだけを返してください。\n\n状態:\n${JSON.stringify(context)}\n\nユーザー発言:\n${message}`,
    });
    return Response.json(output);
  } catch (error) {
    console.error("AI Gateway graph patch failed; using local fallback", error);
    return Response.json(createLocalPatch(message, context.activeBranchId));
  }
}
