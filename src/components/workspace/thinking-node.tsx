"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { memo } from "react";

import type { ThinkingNode as ThinkingNodeData } from "@/domain/schema";

export type ThinkingFlowNode = Node<{ item: ThinkingNodeData }, "thinking">;

const typeMeta: Record<ThinkingNodeData["type"], { glyph: string; label: string }> = {
  fact: { glyph: "·", label: "事実" },
  question: { glyph: "?", label: "問い" },
  hypothesis: { glyph: "△", label: "仮説" },
  decision: { glyph: "★", label: "決定" },
  action: { glyph: "→", label: "行動" },
  risk: { glyph: "!", label: "リスク" },
};

export const ThinkingNode = memo(function ThinkingNode({ data, selected }: NodeProps<ThinkingFlowNode>) {
  const { item } = data;
  const meta = typeMeta[item.type];
  return (
    <article
      className={`thinking-node thinking-node--${item.type}${selected ? " is-selected" : ""}${item.userLocked ? " is-locked" : ""}`}
      aria-label={`${meta.label}: ${item.statement}`}
    >
      <Handle className="thinking-handle" position={Position.Left} type="target" />
      <header>
        <span aria-hidden="true" className="thinking-node__glyph">{meta.glyph}</span>
        <span>{meta.label}</span>
        {item.userLocked ? <span className="thinking-node__lock">固定</span> : null}
      </header>
      <p>{item.statement}</p>
      <footer>
        <span>{item.time}</span>
        <span>{item.abstraction}</span>
        <span>{Math.round(item.certainty * 100)}%</span>
      </footer>
      <Handle className="thinking-handle" position={Position.Right} type="source" />
    </article>
  );
});
