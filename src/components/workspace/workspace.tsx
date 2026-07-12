"use client";

import { Compass, HardDrive, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { ChatPanel } from "@/components/workspace/chat-panel";
import { GraphCanvas } from "@/components/workspace/graph-canvas";
import { InsightPanel } from "@/components/workspace/insight-panel";
import { ViewToolbar } from "@/components/workspace/view-toolbar";
import { loadCurrentSession, saveCurrentSession } from "@/storage/session-db";
import { useWorkspaceStore } from "@/store/workspace-store";

export function Workspace() {
  const graph = useWorkspaceStore((state) => state.graph);
  const view = useWorkspaceStore((state) => state.view);
  const viewState = useWorkspaceStore((state) => state.viewState);
  const messages = useWorkspaceStore((state) => state.messages);
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadCurrentSession().then((saved) => {
      if (!cancelled && saved) hydrate(saved);
      hydrated.current = true;
    });
    return () => { cancelled = true; };
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated.current) return;
    const timeout = window.setTimeout(() => {
      void saveCurrentSession({
        id: "current",
        title: graph.northStar.statement,
        graph,
        view,
        viewState,
        messages,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [graph, messages, view, viewState]);

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div className="brand-mark"><Compass size={19} /><span className="font-heading">Spatial Thinking</span></div>
        <div className="header-center"><span className="font-data">CURRENT</span>{graph.northStar.statement}</div>
        <div className="header-status"><span><HardDrive size={13} />端末保存</span><span><Sparkles size={13} />AI補助</span></div>
      </header>
      <div className="workspace-grid">
        <ChatPanel />
        <section className="canvas-column">
          <ViewToolbar />
          <div className="canvas-stage"><GraphCanvas /></div>
        </section>
        <InsightPanel />
      </div>
    </main>
  );
}
