import { generateText, Output } from "ai";
import { z } from "zod";

import { createLocalInitialMap } from "@/ai/local-fallback";
import { allowAiRequest } from "@/ai/rate-limit";
import {
  initialMapDraftResponseSchema,
  normalizeInitialMapResponse,
} from "@/ai/schemas";
import { SPATIAL_THINKING_SYSTEM } from "@/ai/prompt";
import { reasoningModel, reasoningProviderOptions } from "@/ai/models";
import { createSourceFragment } from "@/ai/source-context";

const requestSchema = z.object({ input: z.string().min(1).max(12_000) });

export async function POST(request: Request): Promise<Response> {
  if (!allowAiRequest(request)) return Response.json({ error: "少し時間をおいてください" }, { status: 429 });
  const body = requestSchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "入力を確認してください" }, { status: 400 });

  const source = createSourceFragment(body.data.input, "initial_input");
  try {
    const { output } = await generateText({
      model: reasoningModel(),
      system: SPATIAL_THINKING_SYSTEM,
      output: Output.object({ schema: initialMapDraftResponseSchema }),
      prompt: `次の逐語入力から初期思考グラフを生成してください。
この原文が正本です。内容を落とさず、本筋・制約・保留・不確実性を保持してください。
生成する全ノードのsourceIdsへ、根拠となるsource IDを入れてください。

sourceTurns:
${JSON.stringify([source])}

逐語入力:
${body.data.input}`,
      providerOptions: reasoningProviderOptions("initial-map", "high"),
    });
    return Response.json({ ...normalizeInitialMapResponse(output, [source]), degraded: false });
  } catch (error) {
    console.error("AI Gateway initial map failed; using local fallback", error);
    return Response.json(createLocalInitialMap(body.data.input, source));
  }
}
