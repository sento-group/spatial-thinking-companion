"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { memo, type CSSProperties } from "react";

import type { ThinkingNode as ThinkingNodeData } from "@/domain/schema";
import { useWorkspaceStore } from "@/store/workspace-store";

export type ThinkingFlowNode = Node<{
  item: ThinkingNodeData;
  challengeCount: number;
  relationRole?: "source" | "target";
  depth: number;
  clusterColor?: string;
  hasChildren: boolean;
  collapsed: boolean;
  hiddenDescendantCount: number;
}, "thinking">;

const typeMeta: Record<ThinkingNodeData["type"], { glyph: string; label: string }> = {
  fact: { glyph: "·", label: "事実" },
  question: { glyph: "?", label: "問い" },
  hypothesis: { glyph: "△", label: "仮説" },
  decision: { glyph: "★", label: "決定" },
  action: { glyph: "→", label: "行動" },
  risk: { glyph: "!", label: "リスク" },
};

export const ThinkingNode = memo(function ThinkingNode({ data, selected }: NodeProps<ThinkingFlowNode>) {
  const { item, challengeCount, relationRole, depth, clusterColor, hasChildren, collapsed, hiddenDescendantCount } = data;
  const toggleCollapsed = useWorkspaceStore((state) => state.toggleCollapsed);
  const meta = typeMeta[item.type];
  return (
    <article
      className={`thinking-node thinking-node--${item.type}${selected ? " is-selected" : ""}${item.userLocked ? " is-locked" : ""}${clusterColor ? " is-clustered" : ""}${relationRole ? ` is-relation-${relationRole}` : ""}`}
      style={clusterColor ? ({ "--cluster-color": clusterColor } as CSSProperties) : undefined}
      aria-label={`${meta.label}: ${item.statement}${challengeCount > 0 ? `。未解決の検証 ${challengeCount}件` : "。検証済み"}`}
    >
      <Handle className="thinking-handle" position={Position.Left} type="target" />
      <header>
        <span aria-hidden="true" className="thinking-node__glyph">{meta.glyph}</span>
        <span>{meta.label}</span>
        {depth === 1 ? <span className="thinking-node__cluster">枝</span> : null}
        {item.userLocked ? <span className="thinking-node__lock">固定</span> : null}
        {hasChildren ? (
          <button
            type="button"
            className="thinking-node__collapse nodrag nopan"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              toggleCollapsed(item.id);
            }}
            aria-label={collapsed ? "枝を展開" : "枝を折り畳む"}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            {hiddenDescendantCount > 0 ? `+${hiddenDescendantCount}` : null}
          </button>
        ) : null}
      </header>
      <p>{item.statement}</p>
      <footer>
        <span>確度 {Math.round(item.certainty * 100)}%</span>
        <span>{item.sourceIds.length > 0 ? `原文 ${item.sourceIds.length}` : "原文なし"}</span>
        {challengeCount > 0 ? <strong className="thinking-node__challenge">検証 {challengeCount}</strong> : <span>検証済み</span>}
      </footer>
      <Handle className="thinking-handle" position={Position.Right} type="source" />
    </article>
  );
});
