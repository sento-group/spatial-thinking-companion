import { describe, expect, it } from "vitest";

import { cloneFixture } from "@/domain/fixtures";
import { projectGraph } from "@/mapping/project";
import { recommendMapping } from "@/mapping/recommend";

describe("recommendMapping", () => {
  it("時間と抽象度の混線をtime_abstractionへ分類する", () => {
    expect(
      recommendMapping("過去の具体的な出来事と、未来の抽象的な目的を整理したい").kind,
    ).toBe("time_abstraction");
  });

  it("利害対象と将来世代をtime_social_reachへ分類する", () => {
    expect(
      recommendMapping("自分と組織、市場、社会、将来世代への影響を短期と長期で見たい").kind,
    ).toBe("time_social_reach");
  });

  it("因果と前提の検討をrelationへ分類する", () => {
    expect(recommendMapping("原因と依存関係、暗黙の前提、矛盾を見つけたい").kind).toBe(
      "relation",
    );
  });

  it("目的から行動への手順をroadmapへ分類する", () => {
    expect(recommendMapping("目標から逆算して必要な手順と次の行動を決めたい").kind).toBe(
      "roadmap",
    );
  });
});

describe("projectGraph", () => {
  it("ビューを切り替えてもnode IDを維持する", () => {
    const graph = cloneFixture();
    const roadmap = projectGraph(graph, "roadmap", {});
    const relation = projectGraph(graph, "relation", {});

    expect(roadmap.nodes.map((node) => node.id).sort()).toEqual(
      relation.nodes.map((node) => node.id).sort(),
    );
  });

  it("spatial座標を決定的に生成する", () => {
    const graph = cloneFixture();
    const first = projectGraph(graph, "time_abstraction", {});
    const second = projectGraph(graph, "time_abstraction", {});

    expect(first.nodes).toEqual(second.nodes);
  });

  it("人間が固定したpositionを自動配置で維持する", () => {
    const graph = cloneFixture();
    const projection = projectGraph(graph, "roadmap", {
      roadmap: {
        software: { x: 888, y: 444, locked: true },
      },
    });

    expect(projection.nodes.find((node) => node.id === "software")?.position).toEqual({
      x: 888,
      y: 444,
    });
  });

  it("100ノード・150関係を全ビューへ投影できる", () => {
    const graph = cloneFixture();
    graph.nodes = Array.from({ length: 100 }, (_, index) => ({
      id: `stress-${index}`,
      statement: `検証ノード ${index}`,
      type: index % 9 === 0 ? "decision" : index % 4 === 0 ? "action" : "hypothesis",
      time: (["past", "present", "future", "timeless"] as const)[index % 4],
      abstraction: (["concrete", "structure", "abstract"] as const)[index % 3],
      socialReach: (["self", "close_group", "organization", "market", "society", "future_generations"] as const)[index % 6],
      certainty: 0.6,
      status: "active",
      parentId: index === 0 ? null : `stress-${Math.floor((index - 1) / 3)}`,
      facts: [],
      userLocked: false,
    }));
    graph.edges = Array.from({ length: 150 }, (_, index) => ({
      id: `stress-edge-${index}`,
      from: `stress-${index % 100}`,
      to: `stress-${(index * 7 + 3) % 100}`,
      relation: index % 5 === 0 ? "requires" : "supports",
    }));
    graph.activeBranchId = "stress-99";

    for (const view of ["roadmap", "time_abstraction", "time_social_reach", "relation"] as const) {
      const projection = projectGraph(graph, view, {});
      expect(projection.nodes).toHaveLength(100);
      expect(projection.edges.length).toBeGreaterThanOrEqual(view === "roadmap" ? 99 : 150);
      expect(projection.nodes.every((node) => Number.isFinite(node.position.x) && Number.isFinite(node.position.y))).toBe(true);
    }
  });
});
