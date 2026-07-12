import { parseThinkingGraph, type ThinkingGraph } from "@/domain/schema";

export function exportGraphJson(graph: ThinkingGraph): string {
  return JSON.stringify(graph, null, 2);
}

export function importGraphJson(input: string): ThinkingGraph {
  return parseThinkingGraph(JSON.parse(input) as unknown);
}
