"use client";

import { Redo2, RotateCcw, Undo2 } from "lucide-react";

import type { ViewKind } from "@/domain/schema";
import { useWorkspaceStore } from "@/store/workspace-store";

const views: Array<{ value: ViewKind; short: string; label: string }> = [
  { value: "roadmap", short: "A", label: "ロードマップ" },
  { value: "time_abstraction", short: "B", label: "時間 × 抽象度" },
  { value: "time_social_reach", short: "C", label: "時間 × 対象範囲" },
  { value: "relation", short: "D", label: "関係グラフ" },
];

export function ViewToolbar() {
  const view = useWorkspaceStore((state) => state.view);
  const setView = useWorkspaceStore((state) => state.setView);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
  const reset = useWorkspaceStore((state) => state.reset);
  const canUndo = useWorkspaceStore((state) => state.past.length > 0);
  const canRedo = useWorkspaceStore((state) => state.future.length > 0);

  return (
    <div className="view-toolbar" role="toolbar" aria-label="盤面ビュー">
      <div className="view-tabs" role="tablist" aria-label="マッピング手法">
        {views.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={view === item.value}
            className={view === item.value ? "is-active" : undefined}
            onClick={() => setView(item.value)}
          >
            <span className="font-data">{item.short}</span>
            {item.label}
          </button>
        ))}
      </div>
      <div className="history-controls">
        <button type="button" onClick={undo} disabled={!canUndo} aria-label="元に戻す"><Undo2 size={15} /></button>
        <button type="button" onClick={redo} disabled={!canRedo} aria-label="やり直す"><Redo2 size={15} /></button>
        <button type="button" onClick={reset} aria-label="初期状態へ戻す"><RotateCcw size={15} /></button>
      </div>
    </div>
  );
}
