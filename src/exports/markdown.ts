import type { ThinkingGraph } from "@/domain/schema";

const glyphs: Record<string, string> = {
  question: "?",
  decision: "★",
  risk: "!",
  hypothesis: "△",
  action: "→",
  fact: "·",
};

export function createGraphMarkdown(graph: ThinkingGraph): string {
  const children = new Map<string | null, ThinkingGraph["nodes"]>();
  for (const node of graph.nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  }

  const lines = [`# ${graph.northStar.statement}`, ""];
  const visited = new Set<string>();

  function walk(parentId: string | null, depth: number): void {
    for (const node of children.get(parentId) ?? []) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      lines.push(`${"  ".repeat(depth)}- ${glyphs[node.type]} **${node.statement}**`);
      for (const fact of node.facts) lines.push(`${"  ".repeat(depth + 1)}- ${fact}`);
      for (const sourceId of node.sourceIds) {
        const source = graph.sources.find((candidate) => candidate.id === sourceId);
        if (source) lines.push(`${"  ".repeat(depth + 1)}- 原文: ${source.text}`);
      }
      walk(node.id, depth + 1);
    }
  }

  walk(null, 0);
  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      lines.push(`- ${glyphs[node.type]} **${node.statement}**（未接続）`);
    }
  }

  if (graph.edges.length > 0) {
    lines.push("", "## 関係（クロスエッジ）");
    for (const edge of graph.edges) {
      const from = graph.nodes.find((node) => node.id === edge.from)?.statement ?? edge.from;
      const to = graph.nodes.find((node) => node.id === edge.to)?.statement ?? edge.to;
      lines.push(`- ${from} —${edge.relation}→ ${to}`);
    }
  }

  const challenges = graph.challenges.filter((challenge) => challenge.status !== "parked");
  if (challenges.length > 0) {
    lines.push("", "## 検証課題");
    for (const challenge of challenges) {
      const target = graph.nodes.find((node) => node.id === challenge.targetNodeId)?.statement ?? challenge.targetNodeId;
      lines.push(`- [${challenge.status}] ${target}: ${challenge.statement}${challenge.response ? ` — 回答: ${challenge.response}` : ""}`);
    }
  }

  return lines.join("\n");
}
