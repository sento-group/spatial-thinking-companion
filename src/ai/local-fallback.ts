import type { InitialMapResponse, PatchResponse } from "@/ai/schemas";
import type {
  SourceFragment,
  ThinkingChallenge,
  ThinkingGraph,
  ThinkingNode,
} from "@/domain/schema";
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

export function createLocalInitialMap(input: string, source: SourceFragment): InitialMapResponse {
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
    order: 0,
    facts: [compact(input, 100)],
    sourceIds: [source.id],
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
      order: index,
      facts: [],
      sourceIds: [source.id],
      userLocked: false,
    })),
  ];
  const graph: ThinkingGraph = {
    schemaVersion: 1,
    northStar: { statement: rootStatement, successCondition: "行動可能な次の一歩が決まる" },
    sources: [source],
    activeBranchId: nodes.at(-1)?.id ?? "root",
    recommendedView: "relation",
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
    challenges: [
      {
        id: "challenge-hidden-stakeholder",
        targetNodeId: "root",
        kind: "blind_spot",
        statement: "この判断で地図の外に置かれている関係者は誰か",
        status: "open",
        response: null,
        impactSummary: null,
      },
      {
        id: "challenge-key-assumption",
        targetNodeId: nodes.at(-1)?.id ?? "root",
        kind: "assumption",
        statement: "この行動が成果につながるために必要な前提は何か",
        status: "open",
        response: null,
        impactSummary: null,
      },
    ],
    promotionQueue: [],
    parkingLot: [],
  };

  return {
    reply: `AIへ接続できなかったため、原文を保持した**簡易思考マップ**を置きました。再試行するとSonnet 5で再構成できます。`,
    recommendedView: "relation",
    recommendationReason: recommendation.reason,
    graph,
    degraded: true,
  };
}

export function createLocalPatch(
  message: string,
  activeBranchId: string | null,
  challenge?: ThinkingChallenge,
  source?: SourceFragment,
): PatchResponse {
  const id = `local-${Date.now()}`;
  if (challenge) {
    const response = challenge.response?.trim() || compact(message, 60);
    return {
      reply: "回答を対象ノードの根拠として追加し、関係線で接続する案です。",
      commands: [
        ...(source ? [{ type: "source.add" as const, source }] : []),
        {
          type: "node.add",
          node: {
            id,
            statement: compact(response),
            type: "fact",
            time: "present",
            abstraction: "concrete",
            socialReach: "organization",
            certainty: 0.7,
            status: "active",
            parentId: challenge.targetNodeId,
            order: 999,
            facts: [response],
            sourceIds: source ? [source.id] : [],
            userLocked: true,
          },
        },
        {
          type: "edge.add",
          edge: {
            id: `edge-${id}`,
            from: id,
            to: challenge.targetNodeId,
            relation: "affects",
          },
        },
      ],
      requiresApproval: true,
      restructureProposal: "回答を新しい根拠ノードとして追加し、対象ノードへの影響関係を明示します。",
      degraded: true,
    };
  }
  return {
    reply:
      "ローカル補助モードで、発言を現在枝の下へ追加しました。AI Gateway接続後は、前提・矛盾・上位への戻りまで自動判定します。",
    commands: [
      ...(source ? [{ type: "source.add" as const, source }] : []),
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
          order: 999,
          facts: [],
          sourceIds: source ? [source.id] : [],
          userLocked: false,
        },
      },
      { type: "branch.activate", id },
    ],
    requiresApproval: false,
    restructureProposal: null,
    degraded: true,
  };
}
