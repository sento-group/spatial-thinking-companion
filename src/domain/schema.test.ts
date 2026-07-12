import { describe, expect, it } from "vitest";

import { parseThinkingGraph } from "@/domain/schema";

const validGraph = {
  schemaVersion: 1,
  northStar: {
    statement: "チームが同じ地図を見ながら判断できる",
    successCondition: "次の一歩が決まる",
  },
  activeBranchId: "question",
  recommendedView: "roadmap",
  nodes: [
    {
      id: "root",
      statement: "同じ地図で考える",
      type: "decision",
      time: "future",
      abstraction: "abstract",
      socialReach: "organization",
      certainty: 0.9,
      status: "active",
      parentId: null,
      facts: [],
      userLocked: true,
    },
    {
      id: "question",
      statement: "どう具現化するか",
      type: "question",
      time: "present",
      abstraction: "structure",
      socialReach: "organization",
      certainty: 0.5,
      status: "active",
      parentId: "root",
      facts: [],
      userLocked: false,
    },
  ],
  edges: [
    {
      id: "root-question",
      from: "root",
      to: "question",
      relation: "includes",
    },
  ],
  unresolvedQuestions: ["どう具現化するか"],
  contradictions: [],
  blindSpots: [],
  promotionQueue: [],
  parkingLot: [],
};

describe("parseThinkingGraph", () => {
  it("正しいThinkingGraphを受理する", () => {
    expect(parseThinkingGraph(validGraph)).toEqual(validGraph);
  });

  it("存在しないnodeを参照するedgeを拒否する", () => {
    const graph = {
      ...validGraph,
      edges: [
        {
          id: "dangling",
          from: "root",
          to: "missing",
          relation: "requires",
        },
      ],
    };

    expect(() => parseThinkingGraph(graph)).toThrow(/存在しないノード/);
  });

  it("親子関係のcycleを拒否する", () => {
    const graph = {
      ...validGraph,
      nodes: validGraph.nodes.map((node) =>
        node.id === "root" ? { ...node, parentId: "question" } : node,
      ),
    };

    expect(() => parseThinkingGraph(graph)).toThrow(/循環/);
  });

  it("確度が0から1の範囲外なら拒否する", () => {
    const graph = {
      ...validGraph,
      nodes: validGraph.nodes.map((node) =>
        node.id === "question" ? { ...node, certainty: 1.5 } : node,
      ),
    };

    expect(() => parseThinkingGraph(graph)).toThrow();
  });
});
