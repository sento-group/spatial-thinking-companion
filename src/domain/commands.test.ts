import { describe, expect, it } from "vitest";

import { applyCommands, ProtectedCommandError } from "@/domain/commands";
import { cloneFixture } from "@/domain/fixtures";

describe("applyCommands", () => {
  it("複数commandをatomicに適用する", () => {
    const result = applyCommands(
      cloneFixture(),
      [
        {
          type: "node.add",
          node: {
            id: "brief",
            statement: "AIブリーフへ変換する",
            type: "action",
            time: "future",
            abstraction: "concrete",
            socialReach: "organization",
            certainty: 0.8,
            status: "active",
            parentId: "software",
            facts: [],
            userLocked: false,
          },
        },
        {
          type: "edge.add",
          edge: {
            id: "brief-software",
            from: "brief",
            to: "software",
            relation: "includes",
          },
        },
      ],
      { source: "human" },
    );

    expect(result.graph.nodes.some((node) => node.id === "brief")).toBe(true);
    expect(result.graph.edges.some((edge) => edge.id === "brief-software")).toBe(true);
  });

  it("途中で失敗した場合は入力graphを変更しない", () => {
    const graph = cloneFixture();

    expect(() =>
      applyCommands(
        graph,
        [
          { type: "node.remove", id: "software" },
          {
            type: "edge.add",
            edge: {
              id: "broken",
              from: "missing",
              to: "root",
              relation: "supports",
            },
          },
        ],
        { source: "human" },
      ),
    ).toThrow();

    expect(graph.nodes.some((node) => node.id === "software")).toBe(true);
  });

  it("AIがlocked nodeを更新する場合は承認を要求する", () => {
    expect(() =>
      applyCommands(
        cloneFixture(),
        [
          {
            type: "node.update",
            id: "root",
            changes: { statement: "別の本筋" },
          },
        ],
        { source: "ai" },
      ),
    ).toThrow(ProtectedCommandError);
  });

  it("node削除時に接続edgeも削除する", () => {
    const { graph } = applyCommands(
      cloneFixture(),
      [{ type: "node.remove", id: "software" }],
      { source: "human" },
    );

    expect(graph.nodes.some((node) => node.id === "software")).toBe(false);
    expect(graph.edges.some((edge) => edge.from === "software" || edge.to === "software")).toBe(false);
  });

  it("node統合でedgeをtargetへ付け替える", () => {
    const { graph } = applyCommands(
      cloneFixture(),
      [
        {
          type: "node.merge",
          sourceIds: ["software"],
          targetId: "repeatability",
        },
      ],
      { source: "human" },
    );

    expect(graph.nodes.some((node) => node.id === "software")).toBe(false);
    expect(graph.edges.every((edge) => edge.from !== "software" && edge.to !== "software")).toBe(true);
  });
});
