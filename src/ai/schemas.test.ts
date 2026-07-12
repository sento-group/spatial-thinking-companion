import { describe, expect, it } from "vitest";

import { normalizeInitialMapResponse } from "@/ai/schemas";
import { cloneFixture } from "@/domain/fixtures";

describe("normalizeInitialMapResponse", () => {
  it("AIが返した壊れた参照を修復してから厳格検証する", () => {
    const graph = cloneFixture();
    graph.activeBranchId = "missing-active";
    graph.nodes[1].parentId = "missing-parent";
    graph.edges.push({
      id: "dangling",
      from: "missing-node",
      to: "root",
      relation: "requires",
    });

    const normalized = normalizeInitialMapResponse({
      reply: "初期地図を生成しました",
      recommendedView: "roadmap",
      recommendationReason: "目的から行動へ並べるため",
      graph,
    });

    expect(normalized.graph.nodes.some((node) => node.id === normalized.graph.activeBranchId)).toBe(true);
    expect(normalized.graph.nodes[1].parentId).toBeNull();
    expect(normalized.graph.edges.some((edge) => edge.id === "dangling")).toBe(false);
    expect(normalized.graph.nodes.find((node) => node.id === "root")?.userLocked).toBe(true);
  });
});
