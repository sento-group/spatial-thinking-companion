"use client";

import { Check, Copy, Download, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { useState } from "react";

import { createAiBrief } from "@/exports/ai-brief";
import { exportGraphJson } from "@/exports/json";
import { createGraphMarkdown } from "@/exports/markdown";
import { createXMindBlob } from "@/exports/xmind";
import type { ThinkingNode } from "@/domain/schema";
import { useWorkspaceStore } from "@/store/workspace-store";

function download(value: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function InsightPanel() {
  const graph = useWorkspaceStore((state) => state.graph);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const applyHumanCommands = useWorkspaceStore((state) => state.applyHumanCommands);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const pendingCommands = useWorkspaceStore((state) => state.pendingCommands);
  const approvePending = useWorkspaceStore((state) => state.approvePending);
  const rejectPending = useWorkspaceStore((state) => state.rejectPending);
  const selected = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const [drafts, setDrafts] = useState<Record<string, ThinkingNode>>({});
  const [copied, setCopied] = useState(false);
  const draft = selected ? (drafts[selected.id] ?? selected) : null;

  function setDraft(next: ThinkingNode) {
    setDrafts((current) => ({ ...current, [next.id]: next }));
  }

  function saveNode() {
    if (!draft) return;
    const { id, ...changes } = draft;
    applyHumanCommands([{ type: "node.update", id, changes }]);
  }

  function addChild() {
    const parentId = selected?.id ?? graph.activeBranchId ?? "root";
    const id = `node-${Date.now()}`;
    applyHumanCommands([
      {
        type: "node.add",
        node: {
          id,
          statement: "新しい論点",
          type: "question",
          time: "present",
          abstraction: "concrete",
          socialReach: "organization",
          certainty: 0.5,
          status: "active",
          parentId,
          facts: [],
          userLocked: true,
        },
      },
      { type: "branch.activate", id },
    ]);
    selectNode(id);
  }

  async function copyBrief() {
    await navigator.clipboard.writeText(createAiBrief(graph));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <aside className="insight-panel scrollbar-thin" aria-label="現在地と分析">
      {pendingCommands ? (
        <section className="approval-strip">
          <strong>本筋または固定ノードへの変更</strong>
          <p>{pendingCommands.length}件のAI変更は承認待ちです。</p>
          <div><button onClick={approvePending}>適用</button><button onClick={rejectPending}>破棄</button></div>
        </section>
      ) : null}

      <section className="north-star-block">
        <div className="panel-kicker">NORTH STAR / 本筋</div>
        <h2 className="font-heading">{graph.northStar.statement}</h2>
        <p>{graph.northStar.successCondition}</p>
      </section>

      <section className="inspector-block">
        <div className="section-heading"><span>現在枝</span><button type="button" onClick={addChild}><Plus size={14} /> 子を追加</button></div>
        {draft ? (
          <div className="node-editor">
            <textarea value={draft.statement} onChange={(event) => setDraft({ ...draft, statement: event.target.value })} />
            <div className="editor-grid">
              <label>型<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ThinkingNode["type"] })}>
                <option value="fact">事実</option><option value="question">問い</option><option value="hypothesis">仮説</option><option value="decision">決定</option><option value="action">行動</option><option value="risk">リスク</option>
              </select></label>
              <label>確度<input type="number" min="0" max="100" value={Math.round(draft.certainty * 100)} onChange={(event) => setDraft({ ...draft, certainty: Number(event.target.value) / 100 })} /></label>
            </div>
            <div className="editor-actions">
              <button type="button" onClick={() => setDraft({ ...draft, userLocked: !draft.userLocked })}>{draft.userLocked ? <Lock size={14} /> : <Unlock size={14} />}{draft.userLocked ? "固定中" : "AI編集可"}</button>
              <button type="button" className="primary" onClick={saveNode}><Check size={14} />保存</button>
              {draft.id !== "root" ? <button type="button" className="danger" onClick={() => { applyHumanCommands([{ type: "node.remove", id: draft.id }]); selectNode(null); }}><Trash2 size={14} /></button> : null}
            </div>
          </div>
        ) : <p className="empty-copy">盤面のノードを選ぶと、意味と確度を編集できます。</p>}
      </section>

      <section className="analysis-block">
        <h3>未解決 <span>{graph.unresolvedQuestions.length}</span></h3>
        <ul>{graph.unresolvedQuestions.map((item) => <li key={item}>? {item}</li>)}</ul>
        <h3>盲点 <span>{graph.blindSpots.length}</span></h3>
        <ul>{graph.blindSpots.map((item) => <li key={item}>¬ {item}</li>)}</ul>
        <h3>上位へ戻す <span>{graph.promotionQueue.length}</span></h3>
        <ul>{graph.promotionQueue.length ? graph.promotionQueue.map((item) => <li key={item}>↑ {item}</li>) : <li className="muted">現在はなし</li>}</ul>
      </section>

      <section className="export-block">
        <div className="section-heading"><span>持ち出す</span></div>
        <button type="button" onClick={copyBrief}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "コピー済み" : "AIブリーフ"}</button>
        <button type="button" onClick={() => download(exportGraphJson(graph), "thinking-graph.json", "application/json")}><Download size={14} />JSON</button>
        <button type="button" onClick={() => download(createGraphMarkdown(graph), "thinking-map.md", "text/markdown")}><Download size={14} />Markdown</button>
        <button type="button" onClick={async () => download(await createXMindBlob(graph), "thinking-map.xmind", "application/octet-stream")}><Download size={14} />XMind</button>
      </section>
    </aside>
  );
}
