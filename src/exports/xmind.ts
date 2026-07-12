import JSZip from "jszip";

import type { ThinkingGraph, ThinkingNode } from "@/domain/schema";

const glyphs: Record<ThinkingNode["type"], string> = {
  fact: "·",
  question: "?",
  hypothesis: "△",
  decision: "★",
  action: "→",
  risk: "!",
};

export async function createXMindBlob(graph: ThinkingGraph): Promise<Blob> {
  const children = new Map<string | null, ThinkingNode[]>();
  for (const node of graph.nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }

  function topic(node: ThinkingNode): Record<string, unknown> {
    const descendants = (children.get(node.id) ?? []).map(topic);
    const notes = [
      ...node.facts.map((fact) => `· ${fact}`),
      `type: ${node.type}`,
      `time: ${node.time}`,
      `abstraction: ${node.abstraction}`,
      `socialReach: ${node.socialReach}`,
    ].join("\n");
    return {
      id: node.id,
      class: "topic",
      title: `${glyphs[node.type]} ${node.statement}`,
      notes: { plain: { content: notes } },
      ...(descendants.length > 0 ? { children: { attached: descendants } } : {}),
    };
  }

  const root = graph.nodes.find((node) => node.parentId === null) ?? graph.nodes[0];
  const crossEdges = graph.edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
  }));
  const content = [
    {
      id: "sheet1",
      class: "sheet",
      title: graph.northStar.statement,
      rootTopic: topic(root),
      notes: { plain: { content: JSON.stringify({ crossEdges }, null, 2) } },
    },
  ];
  const zip = new JSZip();
  zip.file("content.json", JSON.stringify(content));
  zip.file(
    "metadata.json",
    JSON.stringify({ creator: { name: "spatial-thinking-companion", version: "0.1.0" } }),
  );
  zip.file(
    "manifest.json",
    JSON.stringify({ "file-entries": { "content.json": {}, "metadata.json": {} } }),
  );
  return zip.generateAsync({ type: "blob", mimeType: "application/octet-stream" });
}
