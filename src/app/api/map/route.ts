import { gateway, generateText, Output } from "ai";
import { z } from "zod";

import { createLocalInitialMap } from "@/ai/local-fallback";
import { allowAiRequest } from "@/ai/rate-limit";
import {
  initialMapDraftResponseSchema,
  normalizeInitialMapResponse,
} from "@/ai/schemas";
import { SPATIAL_THINKING_SYSTEM } from "@/ai/prompt";

const requestSchema = z.object({ input: z.string().min(1).max(12_000) });

export async function POST(request: Request): Promise<Response> {
  if (!allowAiRequest(request)) return Response.json({ error: "少し時間をおいてください" }, { status: 429 });
  const body = requestSchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "入力を確認してください" }, { status: 400 });

  try {
    const { output } = await generateText({
      model: gateway(process.env.AI_MODEL ?? "anthropic/claude-haiku-4.5"),
      system: SPATIAL_THINKING_SYSTEM,
      output: Output.object({ schema: initialMapDraftResponseSchema }),
      prompt: `次の入力から初期思考グラフを生成してください。\n\n${body.data.input}`,
      providerOptions: {
        gateway: {
          models: ["google/gemini-2.5-flash-lite"],
          tags: ["feature:initial-map", "product:spatial-thinking"],
        },
      },
    });
    return Response.json(normalizeInitialMapResponse(output));
  } catch (error) {
    console.error("AI Gateway initial map failed; using local fallback", error);
    return Response.json(createLocalInitialMap(body.data.input));
  }
}
