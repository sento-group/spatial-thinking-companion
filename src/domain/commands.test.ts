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
            sourceIds: ["source-fixture"],
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
    expect(graph.challenges.some((challenge) => challenge.targetNodeId === "software")).toBe(false);
  });

  it("検証課題への回答を履歴として保持する", () => {
    const { graph } = applyCommands(
      cloneFixture(),
      [{
        type: "challenge.update",
        id: "challenge-adoption",
        changes: {
          status: "resolved",
          response: "週次会議で必ず開く",
          impactSummary: "利用習慣を導入条件へ追加",
        },
      }],
      { source: "human" },
    );

    expect(graph.challenges.find((challenge) => challenge.id === "challenge-adoption"))
      .toMatchObject({ status: "resolved", response: "週次会議で必ず開く" });
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
    expect(graph.challenges.find((challenge) => challenge.id === "challenge-adoption")?.targetNodeId)
      .toBe("repeatability");
    expect(graph.nodes.find((node) => node.id === "repeatability")?.sourceIds)
      .toContain("source-fixture");
  });

  it("追加入力をsourceとして原文のまま保持する", () => {
    const source = { id: "source-follow-up", kind: "message" as const, text: "まず社内で試す" };
    const { graph } = applyCommands(
      cloneFixture(),
      [{ type: "source.add", source }],
      { source: "human" },
    );

    expect(graph.sources).toContainEqual(source);
  });
});
