"use client";

import { GitBranch, Link2, Redo2, RotateCcw, Undo2, X } from "lucide-react";

import { useWorkspaceStore } from "@/store/workspace-store";

export function ViewToolbar() {
  const graph = useWorkspaceStore((state) => state.graph);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const edgeScope = useWorkspaceStore((state) => state.edgeScope);
  const setEdgeScope = useWorkspaceStore((state) => state.setEdgeScope);
  const relationDraft = useWorkspaceStore((state) => state.relationDraft);
  const beginRelation = useWorkspaceStore((state) => state.beginRelation);
  const cancelRelation = useWorkspaceStore((state) => state.cancelRelation);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const reset = useWorkspaceStore((state) => state.reset);
  const canUndo = useWorkspaceStore((state) => state.past.length > 0);
  const canRedo = useWorkspaceStore((state) => state.future.length > 0);
  const relationSource = graph.nodes.find((node) => node.id === relationDraft?.from);

  return (
    <div className="view-toolbar" role="toolbar" aria-label="盤面ビュー">
      <div className="map-toolbar-main">
        <div className="map-title"><GitBranch size={14} /><span>思考マップ</span></div>
        <div className="map-layer-toggle" aria-label="表示する関係">
          <button type="button" className={edgeScope === "main" ? "is-active" : undefined} aria-pressed={edgeScope === "main"} onClick={() => setEdgeScope("main")}>主ルート</button>
          <button type="button" className={edgeScope === "all" ? "is-active" : undefined} aria-pressed={edgeScope === "all"} onClick={() => setEdgeScope("all")}>全関係</button>
        </div>
        {relationDraft ? (
          <div className="relation-mode-status" role="status">
            <span>「{relationSource?.statement ?? "選択ノード"}」から接続</span>
            <button type="button" onClick={cancelRelation} aria-label="線の追加を中止"><X size={13} /></button>
          </div>
        ) : (
          <button type="button" className="relation-mode-button" onClick={beginRelation} disabled={!selectedNodeId} title="Shift + R">
            <Link2 size={14} />線を追加 <kbd>⇧R</kbd>
          </button>
        )}
      </div>
      <div className="history-controls">
        <span className="shortcut-hint"><kbd>Tab</kbd> 子　<kbd>Enter</kbd> 分岐</span>
        <button type="button" onClick={undo} disabled={!canUndo} aria-label="元に戻す"><Undo2 size={15} /></button>
        <button type="button" onClick={redo} disabled={!canRedo} aria-label="やり直す"><Redo2 size={15} /></button>
        <button type="button" onClick={reset} aria-label="初期状態へ戻す"><RotateCcw size={15} /></button>
      </div>
    </div>
  );
}
