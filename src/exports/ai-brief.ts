import type { ThinkingGraph } from "@/domain/schema";

function list(items: string[], empty = "なし"): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}

export function createAiBrief(graph: ThinkingGraph, request = "この思考状態を引き継いでください"): string {
  const active = graph.nodes.find((node) => node.id === graph.activeBranchId);
  const decisions = graph.nodes.filter((node) => node.type === "decision").map((node) => node.statement);
  const facts = graph.nodes.flatMap((node) => node.facts.map((fact) => `${node.statement}: ${fact}`));
  const assumptions = graph.edges
    .filter((edge) => edge.relation === "assumes")
    .map((edge) => {
      const from = graph.nodes.find((node) => node.id === edge.from)?.statement ?? edge.from;
      const to = graph.nodes.find((node) => node.id === edge.to)?.statement ?? edge.to;
      return `${from} は ${to} を前提とする`;
    });
  const relations = graph.edges.map((edge) => {
    const from = graph.nodes.find((node) => node.id === edge.from)?.statement ?? edge.from;
    const to = graph.nodes.find((node) => node.id === edge.to)?.statement ?? edge.to;
    return `${from} —${edge.relation}→ ${to}`;
  });
  const actions = graph.nodes
    .filter((node) => node.type === "action" && node.status !== "resolved")
    .map((node) => node.statement);

  return [
    "# 本筋",
    graph.northStar.statement,
    "",
    "# 現在地",
    active ? `- 現在枝: ${active.statement}` : "- 現在枝: 未選択",
    `- 推奨ビュー: ${graph.recommendedView}`,
    "",
    "# 決定済み",
    list(decisions),
    "",
    "# 根拠・前提",
    list([...facts, ...assumptions]),
    "",
    "# 未解決の問い",
    list(graph.unresolvedQuestions),
    "",
    "# Parking Lot",
    list(graph.parkingLot),
    "",
    "# 関係・依存",
    list(relations),
    "",
    "# 次の一歩",
    list(actions),
    "",
    "# AIへの依頼",
    request,
  ].join("\n");
}
