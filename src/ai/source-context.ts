import type { GraphCommand } from "@/domain/commands";
import type { SourceFragment, ThinkingNode } from "@/domain/schema";

export function createSourceFragment(
  text: string,
  kind: SourceFragment["kind"],
): SourceFragment {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id: `source-${suffix}`, kind, text: text.trim() };
}

export function attachSourceToCommands(
  commands: GraphCommand[],
  source: SourceFragment,
  currentNodes: ThinkingNode[],
): GraphCommand[] {
  const nodes = new Map(currentNodes.map((node) => [node.id, node]));
  const sourced = commands.map((command): GraphCommand => {
    if (command.type === "node.add") {
      return {
        ...command,
        node: {
          ...command.node,
          sourceIds: [...new Set([...command.node.sourceIds, source.id])],
        },
      };
    }
    if (command.type === "node.update") {
      const existing = nodes.get(command.id);
      const sourceIds = command.changes.sourceIds ?? existing?.sourceIds ?? [];
      return {
        ...command,
        changes: {
          ...command.changes,
          sourceIds: [...new Set([...sourceIds, source.id])],
        },
      };
    }
    return command;
  });
  return [{ type: "source.add", source }, ...sourced];
}
