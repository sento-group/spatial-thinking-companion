"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Link2,
  LoaderCircle,
  Lock,
  Plus,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import { useState } from "react";

import type { PatchResponse } from "@/ai/schemas";
import { buildPatchContext } from "@/ai/context";
import type { GraphCommand } from "@/domain/commands";
import type { Relation, ThinkingChallenge, ThinkingGraph, ThinkingNode } from "@/domain/schema";
import { createAiBrief } from "@/exports/ai-brief";
import { exportGraphJson } from "@/exports/json";
import { createGraphMarkdown } from "@/exports/markdown";
import { createXMindBlob } from "@/exports/xmind";
import { useWorkspaceStore } from "@/store/workspace-store";

const challengeLabels: Record<ThinkingChallenge["kind"], string> = {
  blind_spot: "盲点",
  objection: "反論",
  assumption: "前提",
  question: "未解決",
  contradiction: "矛盾",
};

const relationOptions: Array<{ value: Relation; label: string }> = [
  { value: "supports", label: "支持する" },
  { value: "requires", label: "必要とする" },
  { value: "means", label: "手段である" },
  { value: "causes", label: "引き起こす" },
  { value: "assumes", label: "前提とする" },
  { value: "contradicts", label: "矛盾する" },
  { value: "invalidates", label: "無効にする" },
  { value: "affects", label: "影響する" },
  { value: "replaces", label: "置き換える" },
  { value: "includes", label: "含む" },
  { value: "example_of", label: "具体例である" },
];

function download(value: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function commandLabel(command: GraphCommand, graph: ThinkingGraph): string {
  switch (command.type) {
    case "source.add": return "今回の原文を保持";
    case "node.add": return `ノード「${command.node.statement}」を追加`;
    case "node.update": return `ノード「${graph.nodes.find((node) => node.id === command.id)?.statement ?? command.id}」を更新`;
    case "node.remove": return `ノード「${graph.nodes.find((node) => node.id === command.id)?.statement ?? command.id}」を削除`;
    case "node.merge": return `${command.sourceIds.length}件のノードを統合`;
    case "edge.add": return `関係線「${command.edge.relation}」を追加`;
    case "edge.update": return `関係線を更新`;
    case "edge.remove": return `関係線を削除`;
    case "challenge.add": return `検証課題「${command.challenge.statement}」を追加`;
    case "challenge.update": return `検証課題を更新`;
    case "challenge.remove": return `検証課題を削除`;
    case "branch.activate": return `現在枝を変更`;
    case "graph.promote": return `論点を本筋へ戻す`;
  }
}

export function InsightPanel() {
  const graph = useWorkspaceStore((state) => state.graph);
  const messages = useWorkspaceStore((state) => state.messages);
  const selectedNodeId = useWorkspaceStore((state) => state.selectedNodeId);
  const editingNodeId = useWorkspaceStore((state) => state.editingNodeId);
  const applyHumanCommands = useWorkspaceStore((state) => state.applyHumanCommands);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const addChild = useWorkspaceStore((state) => state.addChild);
  const addSibling = useWorkspaceStore((state) => state.addSibling);
  const deleteSelected = useWorkspaceStore((state) => state.deleteSelected);
  const finishEditing = useWorkspaceStore((state) => state.finishEditing);
  const pendingProposal = useWorkspaceStore((state) => state.pendingProposal);
  const stageChallengeProposal = useWorkspaceStore((state) => state.stageChallengeProposal);
  const approvePending = useWorkspaceStore((state) => state.approvePending);
  const rejectPending = useWorkspaceStore((state) => state.rejectPending);
  const relationDraft = useWorkspaceStore((state) => state.relationDraft);
  const commitRelation = useWorkspaceStore((state) => state.commitRelation);
  const cancelRelation = useWorkspaceStore((state) => state.cancelRelation);
  const selected = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedSources = selected
    ? graph.sources.filter((source) => selected.sourceIds.includes(source.id))
    : [];
  const [drafts, setDrafts] = useState<Record<string, ThinkingNode>>({});
  const [copied, setCopied] = useState(false);
  const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
  const [challengeResponses, setChallengeResponses] = useState<Record<string, string>>({});
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [relationType, setRelationType] = useState<Relation>("supports");
  const draft = selected ? (drafts[selected.id] ?? selected) : null;
  const selectedChallenges = graph.challenges.filter(
    (challenge) => challenge.targetNodeId === selectedNodeId && challenge.status !== "parked",
  );
  const unresolvedChallenges = selectedChallenges.filter((challenge) => challenge.status !== "resolved");
  const activeChallenge = unresolvedChallenges.find((challenge) => challenge.id === activeChallengeId)
    ?? unresolvedChallenges[0]
    ?? null;
  const relationSource = graph.nodes.find((node) => node.id === relationDraft?.from);
  const relationTarget = graph.nodes.find((node) => node.id === relationDraft?.to);

  function setDraft(next: ThinkingNode) {
    setDrafts((current) => ({ ...current, [next.id]: next }));
  }

  function saveNode() {
    if (!draft) return;
    const { id, ...changes } = draft;
    applyHumanCommands([{ type: "node.update", id, changes }]);
  }

  async function copyBrief() {
    await navigator.clipboard.writeText(createAiBrief(graph));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function answerChallenge(challenge: ThinkingChallenge) {
    const response = (challengeResponses[challenge.id] ?? challenge.response ?? "").trim();
    if (!response || challengeBusy) return;
    setChallengeError(null);
    setChallengeBusy(true);
    applyHumanCommands([{
      type: "challenge.update",
      id: challenge.id,
      changes: { response, status: "answered" },
    }]);
    try {
      const apiResponse = await fetch("/api/patch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `検証課題への回答を構造へ反映してください。\n課題: ${challenge.statement}\n回答: ${response}`,
          context: {
            ...buildPatchContext(graph, messages, challenge.targetNodeId),
            challenge: { ...challenge, response },
          },
        }),
      });
      if (!apiResponse.ok) throw new Error("構造への影響を生成できませんでした");
      const data = (await apiResponse.json()) as PatchResponse;
      stageChallengeProposal({
        commands: data.commands,
        reply: data.reply,
        summary: data.restructureProposal,
        challengeId: challenge.id,
        response,
      });
    } catch (error) {
      setChallengeError(error instanceof Error ? error.message : "予期しないエラーが発生しました");
    } finally {
      setChallengeBusy(false);
    }
  }

  return (
    <aside className="insight-panel scrollbar-thin" aria-label="検証と編集">
      {pendingProposal ? (
        <section className="approval-strip">
          <div className="approval-title"><AlertTriangle size={14} /><strong>構造の変更案</strong></div>
          <p>{pendingProposal.summary ?? pendingProposal.reply ?? "回答に基づく変更を確認してください。"}</p>
          <ul>{pendingProposal.commands.map((command, index) => <li key={`${command.type}-${index}`}>{commandLabel(command, graph)}</li>)}</ul>
          <div><button onClick={approvePending}><Check size={13} />適用</button><button onClick={rejectPending}><X size={13} />構造変更しない</button></div>
        </section>
      ) : null}

      <section className="north-star-block">
        <div className="panel-kicker">NORTH STAR / 本筋</div>
        <h2 className="font-heading">{graph.northStar.statement}</h2>
        <p>{graph.northStar.successCondition}</p>
      </section>

      {relationDraft ? (
        <section className="relation-composer" aria-label="関係線を追加">
          <div className="section-heading"><span><Link2 size={13} /> 関係線</span><button type="button" onClick={cancelRelation}><X size={13} />中止</button></div>
          <p><strong>{relationSource?.statement}</strong> から</p>
          {relationTarget ? (
            <>
              <p><strong>{relationTarget.statement}</strong> へ</p>
              <label>関係の意味<select value={relationType} onChange={(event) => setRelationType(event.target.value as Relation)}>
                {relationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select></label>
              <button type="button" className="primary-action" onClick={() => commitRelation(relationType)}><Check size={13} />線を確定</button>
            </>
          ) : <p className="relation-instruction">接続先のノードをクリックしてください。</p>}
        </section>
      ) : null}

      <section className="inspector-block">
        <div className="section-heading"><span>選択ノード</span><button type="button" onClick={addChild}><Plus size={14} /> 子を追加</button></div>
        {draft ? (
          <div className="node-editor">
            <textarea
              key={draft.id}
              autoFocus={editingNodeId === draft.id}
              value={draft.statement}
              onFocus={() => { if (editingNodeId === draft.id) finishEditing(); }}
              onKeyDown={(event) => {
                if (event.key === "Tab") {
                  event.preventDefault();
                  saveNode();
                  addChild();
                } else if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  saveNode();
                  addSibling();
                }
              }}
              onChange={(event) => setDraft({ ...draft, statement: event.target.value })}
            />
            <div className="editor-grid">
              <label>型<select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ThinkingNode["type"] })}>
                <option value="fact">事実</option><option value="question">問い</option><option value="hypothesis">仮説</option><option value="decision">決定</option><option value="action">行動</option><option value="risk">リスク</option>
              </select></label>
              <label>確度<input type="number" min="0" max="100" value={Math.round(draft.certainty * 100)} onChange={(event) => setDraft({ ...draft, certainty: Number(event.target.value) / 100 })} /></label>
            </div>
            <div className="editor-actions">
              <button type="button" onClick={() => setDraft({ ...draft, userLocked: !draft.userLocked })}>{draft.userLocked ? <Lock size={14} /> : <Unlock size={14} />}{draft.userLocked ? "固定中" : "AI編集可"}</button>
              <button type="button" className="primary" onClick={saveNode}><Check size={14} />保存</button>
              {draft.parentId !== null ? <button type="button" className="danger" onClick={() => { deleteSelected(); selectNode(draft.parentId); }}><Trash2 size={14} /></button> : null}
            </div>
          </div>
        ) : <p className="empty-copy">盤面のノードを選ぶと、編集と検証ができます。</p>}
        {selectedSources.length > 0 ? (
          <details className="source-fragments">
            <summary>原文 {selectedSources.length}件</summary>
            {selectedSources.map((source) => (
              <blockquote key={source.id}>{source.text}</blockquote>
            ))}
          </details>
        ) : null}
      </section>

      <section className="challenge-block">
        <div className="section-heading"><span>このノードを検証</span><span className="challenge-count">{unresolvedChallenges.length}</span></div>
        {!selected ? <p className="empty-copy">検証したいノードを選んでください。</p> : null}
        {selected && unresolvedChallenges.length === 0 ? <p className="challenge-clear"><Check size={14} /> このノードの検証は完了しています。</p> : null}
        {unresolvedChallenges.length > 0 ? (
          <div className="challenge-list">
            {unresolvedChallenges.map((challenge, index) => (
              <button key={challenge.id} type="button" className={activeChallenge?.id === challenge.id ? "is-active" : undefined} onClick={() => setActiveChallengeId(challenge.id)}>
                <span className="challenge-index">{index + 1}</span>
                <span><small>{challengeLabels[challenge.kind]}{challenge.status === "answered" ? "・回答済み" : ""}</small>{challenge.statement}</span>
              </button>
            ))}
          </div>
        ) : null}
        {activeChallenge ? (
          <div className="challenge-answer">
            <label htmlFor={`challenge-${activeChallenge.id}`}>あなたの回答</label>
            <textarea
              id={`challenge-${activeChallenge.id}`}
              value={challengeResponses[activeChallenge.id] ?? activeChallenge.response ?? ""}
              onChange={(event) => setChallengeResponses((current) => ({ ...current, [activeChallenge.id]: event.target.value }))}
              placeholder="事実・判断・条件を短く回答してください"
              rows={4}
            />
            {challengeError ? <p className="challenge-error">{challengeError}</p> : null}
            <button type="button" className="primary-action" disabled={challengeBusy || !(challengeResponses[activeChallenge.id] ?? activeChallenge.response ?? "").trim()} onClick={() => void answerChallenge(activeChallenge)}>
              {challengeBusy ? <LoaderCircle size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              構造への影響を確認
            </button>
          </div>
        ) : null}
        {selectedChallenges.some((challenge) => challenge.status === "resolved") ? (
          <details className="resolved-challenges"><summary>解決済み {selectedChallenges.filter((challenge) => challenge.status === "resolved").length}件</summary>
            <ul>{selectedChallenges.filter((challenge) => challenge.status === "resolved").map((challenge) => <li key={challenge.id}>{challenge.statement}</li>)}</ul>
          </details>
        ) : null}
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
