import type { ThinkingGraph } from "@/domain/schema";

export const strategyFixture: ThinkingGraph = {
  schemaVersion: 1,
  northStar: {
    statement: "メンバーが同じ地図を見ながら判断できる",
    successCondition: "実課題から次の一歩が決まる",
  },
  sources: [
    {
      id: "source-fixture",
      kind: "initial_input",
      text: "空間視覚思考をメンバーへ移植し、同じ地図で判断できるようにする。",
    },
  ],
  activeBranchId: "software",
  recommendedView: "roadmap",
  nodes: [
    {
      id: "root",
      statement: "同じ地図で考える組織をつくる",
      type: "decision",
      time: "future",
      abstraction: "abstract",
      socialReach: "organization",
      certainty: 0.9,
      status: "active",
      parentId: null,
      order: 0,
      facts: ["空間視覚思考をメンバーへ移植する"],
      sourceIds: ["source-fixture"],
      userLocked: true,
    },
    {
      id: "repeatability",
      statement: "チームの再現性を高める",
      type: "hypothesis",
      time: "future",
      abstraction: "structure",
      socialReach: "organization",
      certainty: 0.75,
      status: "active",
      parentId: "root",
      order: 0,
      facts: [],
      sourceIds: ["source-fixture"],
      userLocked: false,
    },
    {
      id: "software",
      statement: "思考マッピングエンジンを作る",
      type: "action",
      time: "future",
      abstraction: "concrete",
      socialReach: "organization",
      certainty: 0.7,
      status: "active",
      parentId: "repeatability",
      order: 0,
      facts: [],
      sourceIds: ["source-fixture"],
      userLocked: false,
    },
  ],
  edges: [
    {
      id: "repeatability-root",
      from: "repeatability",
      to: "root",
      relation: "supports",
    },
    {
      id: "software-repeatability",
      from: "software",
      to: "repeatability",
      relation: "means",
    },
  ],
  unresolvedQuestions: ["どの描画エンジンが最適か"],
  contradictions: [],
  blindSpots: ["メンバーが日常的に使う動機"],
  challenges: [
    {
      id: "challenge-adoption",
      targetNodeId: "software",
      kind: "blind_spot",
      statement: "メンバーが日常的に使う動機は十分か",
      status: "open",
      response: null,
      impactSummary: null,
    },
    {
      id: "challenge-engine",
      targetNodeId: "repeatability",
      kind: "question",
      statement: "描画エンジンの選択が再現性を左右しすぎないか",
      status: "open",
      response: null,
      impactSummary: null,
    },
  ],
  promotionQueue: [],
  parkingLot: ["顧客向け課金"],
};

export function cloneFixture(): ThinkingGraph {
  return structuredClone(strategyFixture);
}
