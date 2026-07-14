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
  const collapsedNodeIds = useWorkspaceStore((state) => state.collapsedNodeIds);
  const hydrate = useWorkspaceStore((state) => state.hydrate);
  const addChild = useWorkspaceStore((state) => state.addChild);
  const addSibling = useWorkspaceStore((state) => state.addSibling);
  const deleteSelected = useWorkspaceStore((state) => state.deleteSelected);
  const beginRelation = useWorkspaceStore((state) => state.beginRelation);
  const cancelRelation = useWorkspaceStore((state) => state.cancelRelation);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);
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
        collapsedNodeIds,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [collapsedNodeIds, graph, messages, view, viewState]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) return;

      const activeElement = document.activeElement;
      const canvasFocused = activeElement instanceof HTMLElement
        && Boolean(activeElement.closest(".canvas-stage"));
      if (!canvasFocused || event.repeat) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (event.key === "Tab" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        addChild();
        return;
      }
      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        addSibling();
        return;
      }
      if (event.key.toLowerCase() === "r" && event.shiftKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        beginRelation();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        cancelRelation();
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        deleteSelected();
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [addChild, addSibling, beginRelation, cancelRelation, deleteSelected, redo, undo]);

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
