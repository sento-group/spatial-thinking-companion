import { gateway } from "ai";

export const REASONING_MODEL = process.env.AI_REASONING_MODEL ?? "anthropic/claude-sonnet-5";
export const REASONING_FALLBACK_MODEL = process.env.AI_REASONING_FALLBACK_MODEL
  ?? "anthropic/claude-sonnet-4.6";

// 意味を変更しない補助処理だけに使用する。初期マップや差分判断には使わない。
export const UTILITY_MODEL = process.env.AI_UTILITY_MODEL ?? "google/gemini-3.1-flash-lite";

export function reasoningModel() {
  return gateway(REASONING_MODEL);
}

export function reasoningProviderOptions(
  feature: "initial-map" | "graph-patch",
  effort: "medium" | "high",
) {
  return {
    anthropic: {
      thinking: { type: "adaptive" as const },
      effort,
    },
    gateway: {
      models: [REASONING_FALLBACK_MODEL],
      tags: [
        `feature:${feature}`,
        "product:spatial-thinking",
        "role:semantic-reasoning",
      ],
    },
  };
}
