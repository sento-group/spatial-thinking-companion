import {
  parseThinkingGraph,
  type ThinkingEdge,
  type ThinkingGraph,
  type ThinkingNode,
} from "@/domain/schema";

export type GraphCommand =
  | { type: "node.add"; node: ThinkingNode }
  | { type: "node.update"; id: string; changes: Partial<Omit<ThinkingNode, "id">> }
  | { type: "node.remove"; id: string }
  | { type: "node.merge"; sourceIds: string[]; targetId: string }
  | { type: "edge.add"; edge: ThinkingEdge }
  | { type: "edge.update"; id: string; changes: Partial<Omit<ThinkingEdge, "id">> }
  | { type: "edge.remove"; id: string }
  | { type: "branch.activate"; id: string }
  | { type: "graph.promote"; nodeId: string; reason: string };

export type CommandSource = "human" | "ai";

export interface ApplyCommandsOptions {
  source: CommandSource;
  approved?: boolean;
}

export interface ApplyCommandsResult {
  graph: ThinkingGraph;
  appliedCommands: GraphCommand[];
}

export class ProtectedCommandError extends Error {
  readonly commands: GraphCommand[];

  constructor(commands: GraphCommand[]) {
    super("人間が固定した構造への変更には承認が必要です");
    this.name = "ProtectedCommandError";
    this.commands = commands;
  }
}

function findNode(graph: ThinkingGraph, id: string): ThinkingNode {
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (!node) {
    throw new Error(`ノードが存在しません: ${id}`);
  }
  return node;
}

function commandTouchesLockedNode(graph: ThinkingGraph, command: GraphCommand): boolean {
  if (command.type === "node.update" || command.type === "node.remove") {
    return findNode(graph, command.id).userLocked;
  }
  if (command.type === "node.merge") {
    return command.sourceIds.some((id) => findNode(graph, id).userLocked);
  }
  return false;
}

function deduplicateEdges(edges: ThinkingEdge[]): ThinkingEdge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    if (edge.from === edge.to) return false;
    const signature = `${edge.from}:${edge.to}:${edge.relation}`;
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function applyCommand(graph: ThinkingGraph, command: GraphCommand): void {
  switch (command.type) {
    case "node.add": {
      if (graph.nodes.some((node) => node.id === command.node.id)) {
        throw new Error(`ノードIDが重複しています: ${command.node.id}`);
      }
      graph.nodes.push(structuredClone(command.node));
      return;
    }
    case "node.update": {
      const node = findNode(graph, command.id);
      Object.assign(node, structuredClone(command.changes));
      return;
    }
    case "node.remove": {
      findNode(graph, command.id);
      graph.nodes = graph.nodes.filter((node) => node.id !== command.id);
      graph.edges = graph.edges.filter(
        (edge) => edge.from !== command.id && edge.to !== command.id,
      );
      for (const node of graph.nodes) {
        if (node.parentId === command.id) node.parentId = null;
      }
      if (graph.activeBranchId === command.id) graph.activeBranchId = null;
      return;
    }
    case "node.merge": {
      const target = findNode(graph, command.targetId);
      const sourceIds = new Set(command.sourceIds.filter((id) => id !== target.id));
      for (const sourceId of sourceIds) findNode(graph, sourceId);
      graph.edges = deduplicateEdges(
        graph.edges.map((edge) => ({
          ...edge,
          from: sourceIds.has(edge.from) ? target.id : edge.from,
          to: sourceIds.has(edge.to) ? target.id : edge.to,
        })),
      );
      for (const node of graph.nodes) {
        if (node.parentId && sourceIds.has(node.parentId)) node.parentId = target.id;
      }
      graph.nodes = graph.nodes.filter((node) => !sourceIds.has(node.id));
      if (graph.activeBranchId && sourceIds.has(graph.activeBranchId)) {
        graph.activeBranchId = target.id;
      }
      return;
    }
    case "edge.add": {
      if (graph.edges.some((edge) => edge.id === command.edge.id)) {
        throw new Error(`エッジIDが重複しています: ${command.edge.id}`);
      }
      graph.edges.push(structuredClone(command.edge));
      return;
    }
    case "edge.update": {
      const edge = graph.edges.find((candidate) => candidate.id === command.id);
      if (!edge) throw new Error(`エッジが存在しません: ${command.id}`);
      Object.assign(edge, structuredClone(command.changes));
      return;
    }
    case "edge.remove": {
      if (!graph.edges.some((edge) => edge.id === command.id)) {
        throw new Error(`エッジが存在しません: ${command.id}`);
      }
      graph.edges = graph.edges.filter((edge) => edge.id !== command.id);
      return;
    }
    case "branch.activate": {
      findNode(graph, command.id);
      graph.activeBranchId = command.id;
      return;
    }
    case "graph.promote": {
      findNode(graph, command.nodeId);
      if (!graph.promotionQueue.includes(command.reason)) {
        graph.promotionQueue.push(command.reason);
      }
    }
  }
}

export function applyCommands(
  input: ThinkingGraph,
  commands: GraphCommand[],
  options: ApplyCommandsOptions,
): ApplyCommandsResult {
  const protectedCommands =
    options.source === "ai"
      ? commands.filter((command) => commandTouchesLockedNode(input, command))
      : [];

  if (protectedCommands.length > 0 && !options.approved) {
    throw new ProtectedCommandError(protectedCommands);
  }

  const next = structuredClone(input);
  for (const command of commands) applyCommand(next, command);

  return {
    graph: parseThinkingGraph(next),
    appliedCommands: structuredClone(commands),
  };
}
