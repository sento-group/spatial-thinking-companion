import type { InitialMapResponse, PatchResponse } from "@/ai/schemas";
import type { ThinkingGraph, ThinkingNode } from "@/domain/schema";
import { recommendMapping } from "@/mapping/recommend";

function compact(text: string, max = 34): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

function extractStatements(input: string): string[] {
  return input
    .split(/(?:\n+|。|！|!|？|\?)/)
    .map((line) => line.replace(/^[-*・\d.)\s]+/, "").trim())
    .filter((line) => line.length >= 3)
    .slice(0, 6);
}

export function createLocalInitialMap(input: string): InitialMapResponse {
  const recommendation = recommendMapping(input);
  const extracted = extractStatements(input);
  const statements =
    extracted.length >= 2
      ? extracted
      : ["現在地を具体化する", "構造と前提を見つける", "次の一歩を決める"];
  const rootStatement = compact(extracted[0] ?? input, 46);
  const root: ThinkingNode = {
    id: "root",
    statement: rootStatement,
    type: "decision",
    time: "future",
    abstraction: "abstract",
    socialReach: "organization",
    certainty: 0.7,
    status: "active",
    parentId: null,
    facts: [compact(input, 100)],
    userLocked: true,
  };
  const nodes: ThinkingNode[] = [
    root,
    ...statements.map((statement, index): ThinkingNode => ({
      id: `node-${index + 1}`,
      statement: compact(statement),
      type: index === statements.length - 1 ? "action" : index === 0 ? "fact" : "hypothesis",
      time: index === 0 ? "present" : "future",
      abstraction: index === statements.length - 1 ? "concrete" : "structure",
      socialReach: "organization",
      certainty: index === 0 ? 0.8 : 0.55,
      status: "active",
      parentId: "root",
      facts: [],
      userLocked: false,
    })),
  ];
  const graph: ThinkingGraph = {
    schemaVersion: 1,
    northStar: { statement: rootStatement, successCondition: "行動可能な次の一歩が決まる" },
    activeBranchId: nodes.at(-1)?.id ?? "root",
    recommendedView: recommendation.kind,
    nodes,
    edges: nodes.slice(1).map((node, index) => ({
      id: `edge-${index + 1}`,
      from: node.id,
      to: "root",
      relation: index === nodes.length - 2 ? "means" : "supports",
    })),
    unresolvedQuestions: ["この地図でまだ扱っていない前提は何か"],
    contradictions: [],
    blindSpots: ["地図の外にいる関係者"],
    promotionQueue: [],
    parkingLot: [],
  };

  return {
    reply: `**${recommendation.kind}** を入口にしました。まず初期地図を置いたので、違うと感じるノードを動かすか書き換えてください。`,
    recommendedView: recommendation.kind,
    recommendationReason: recommendation.reason,
    graph,
  };
}

export function createLocalPatch(message: string, activeBranchId: string | null): PatchResponse {
  const id = `local-${Date.now()}`;
  return {
    reply:
      "ローカル補助モードで、発言を現在枝の下へ追加しました。AI Gateway接続後は、前提・矛盾・上位への戻りまで自動判定します。",
    commands: [
      {
        type: "node.add",
        node: {
          id,
          statement: compact(message),
          type: "question",
          time: "present",
          abstraction: "concrete",
          socialReach: "organization",
          certainty: 0.5,
          status: "active",
          parentId: activeBranchId ?? "root",
          facts: [],
          userLocked: false,
        },
      },
      { type: "branch.activate", id },
    ],
    requiresApproval: false,
    restructureProposal: null,
  };
}
