import type { ThinkingGraph } from "@/domain/schema";

export const strategyFixture: ThinkingGraph = {
  schemaVersion: 1,
  northStar: {
    statement: "メンバーが同じ地図を見ながら判断できる",
    successCondition: "実課題から次の一歩が決まる",
  },
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
      facts: ["空間視覚思考をメンバーへ移植する"],
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
      facts: [],
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
      facts: [],
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
  promotionQueue: [],
  parkingLot: ["顧客向け課金"],
};

export function cloneFixture(): ThinkingGraph {
  return structuredClone(strategyFixture);
}
