"use client";

import { ArrowUp, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import type { InitialMapResponse, PatchResponse } from "@/ai/schemas";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { useWorkspaceStore } from "@/store/workspace-store";

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const graph = useWorkspaceStore((state) => state.graph);
  const messages = useWorkspaceStore((state) => state.messages);
  const addMessage = useWorkspaceStore((state) => state.addMessage);
  const setGraph = useWorkspaceStore((state) => state.setGraph);
  const applyAiCommands = useWorkspaceStore((state) => state.applyAiCommands);
  const hasUserMessage = messages.some((message) => message.role === "user");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    addMessage({ role: "user", content: message });
    setBusy(true);
    try {
      if (!hasUserMessage) {
        const response = await fetch("/api/map", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: message }),
        });
        if (!response.ok) throw new Error("初期地図を生成できませんでした");
        const data = (await response.json()) as InitialMapResponse;
        setGraph({ ...data.graph, recommendedView: data.recommendedView }, `${data.reply}\n\n_${data.recommendationReason}_`);
      } else {
        const active = graph.nodes.find((node) => node.id === graph.activeBranchId);
        const activeNodes = graph.nodes.filter(
          (node) => node.id === graph.activeBranchId || node.parentId === graph.activeBranchId || node.id === active?.parentId,
        );
        const response = await fetch("/api/patch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            context: {
              northStar: graph.northStar.statement,
              activeBranchId: graph.activeBranchId,
              activeNodes,
              unresolvedQuestions: graph.unresolvedQuestions,
              contradictions: graph.contradictions,
              promotionQueue: graph.promotionQueue,
            },
          }),
        });
        if (!response.ok) throw new Error("盤面を更新できませんでした");
        const data = (await response.json()) as PatchResponse;
        applyAiCommands(data.commands, data.reply);
      }
    } catch (error) {
      addMessage({
        role: "system",
        content: error instanceof Error ? error.message : "予期しないエラーが発生しました",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat-panel" aria-label="思考チャット">
      <div className="panel-kicker">DIALOGUE / 探究の構造</div>
      <div className="chat-messages scrollbar-thin" aria-live="polite">
        {messages.map((message) => (
          <Message key={message.id} from={message.role === "system" ? "assistant" : message.role}>
            <MessageContent className={message.role === "system" ? "system-message" : undefined}>
              <MessageResponse>{message.content}</MessageResponse>
            </MessageContent>
          </Message>
        ))}
        {busy ? (
          <div className="thinking-indicator"><LoaderCircle size={14} className="animate-spin" /> 地図を読み替えています</div>
        ) : null}
      </div>
      <form className="chat-input" onSubmit={submit}>
        <label htmlFor="thinking-input">本筋・違和感・次に考えたいこと</label>
        <textarea
          id="thinking-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
          }}
          placeholder="例：この事業を誰でも再現できる形にしたい。何から考える？"
          rows={4}
        />
        <button type="submit" disabled={busy || input.trim().length === 0}>
          <span>地図へ反映</span><ArrowUp size={16} />
        </button>
      </form>
    </section>
  );
}
