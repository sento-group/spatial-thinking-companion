"use client";

import { create } from "zustand";

import {
  applyCommands,
  ProtectedCommandError,
  type GraphCommand,
} from "@/domain/commands";
import { cloneFixture } from "@/domain/fixtures";
import type { ThinkingGraph, ViewKind } from "@/domain/schema";
import type { Position, ViewState } from "@/mapping/project";

export interface WorkspaceMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface WorkspaceSnapshot {
  graph: ThinkingGraph;
  viewState: ViewState;
  view: ViewKind;
}

interface WorkspaceState extends WorkspaceSnapshot {
  selectedNodeId: string | null;
  messages: WorkspaceMessage[];
  past: WorkspaceSnapshot[];
  future: WorkspaceSnapshot[];
  pendingCommands: GraphCommand[] | null;
  setGraph: (graph: ThinkingGraph, reply?: string) => void;
  setView: (view: ViewKind) => void;
  selectNode: (id: string | null) => void;
  moveNode: (id: string, position: Position) => void;
  applyHumanCommands: (commands: GraphCommand[]) => void;
  applyAiCommands: (commands: GraphCommand[], reply?: string) => void;
  approvePending: () => void;
  rejectPending: () => void;
  addMessage: (message: Omit<WorkspaceMessage, "id">) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  hydrate: (snapshot: WorkspaceSnapshot & { messages?: WorkspaceMessage[] }) => void;
}

function snapshot(state: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    graph: structuredClone(state.graph),
    viewState: structuredClone(state.viewState),
    view: state.view,
  };
}

function messageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `message-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const initialMessages: WorkspaceMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "**本筋を一文で入力してください。** 短い依頼からロードマップを作り、必要なら時間・抽象度・関係の地図へ切り替えます。",
  },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  graph: cloneFixture(),
  viewState: {},
  view: "roadmap",
  selectedNodeId: "software",
  messages: initialMessages,
  past: [],
  future: [],
  pendingCommands: null,

  setGraph: (graph, reply) =>
    set((state) => ({
      past: [...state.past, snapshot(state)],
      future: [],
      graph: structuredClone(graph),
      view: graph.recommendedView,
      viewState: {},
      selectedNodeId: graph.activeBranchId,
      messages: reply
        ? [...state.messages, { id: messageId(), role: "assistant", content: reply }]
        : state.messages,
    })),

  setView: (view) => set({ view }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  moveNode: (id, position) =>
    set((state) => {
      const result = applyCommands(
        state.graph,
        [{ type: "node.update", id, changes: { userLocked: true } }],
        { source: "human" },
      );
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph: result.graph,
        viewState: {
          ...state.viewState,
          [state.view]: {
            ...(state.viewState[state.view] ?? {}),
            [id]: { ...position, locked: true },
          },
        },
      };
    }),

  applyHumanCommands: (commands) =>
    set((state) => ({
      past: [...state.past, snapshot(state)],
      future: [],
      graph: applyCommands(state.graph, commands, { source: "human" }).graph,
    })),

  applyAiCommands: (commands, reply) =>
    set((state) => {
      const nextMessages = reply
        ? [...state.messages, { id: messageId(), role: "assistant" as const, content: reply }]
        : state.messages;
      try {
        return {
          past: [...state.past, snapshot(state)],
          future: [],
          graph: applyCommands(state.graph, commands, { source: "ai" }).graph,
          messages: nextMessages,
          pendingCommands: null,
        };
      } catch (error) {
        if (error instanceof ProtectedCommandError) {
          return { pendingCommands: commands, messages: nextMessages };
        }
        throw error;
      }
    }),

  approvePending: () =>
    set((state) => {
      if (!state.pendingCommands) return state;
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph: applyCommands(state.graph, state.pendingCommands, {
          source: "ai",
          approved: true,
        }).graph,
        pendingCommands: null,
      };
    }),

  rejectPending: () => set({ pendingCommands: null }),
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, { ...message, id: messageId() }],
    })),

  undo: () =>
    set((state) => {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...structuredClone(previous),
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future],
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...structuredClone(next),
        past: [...state.past, snapshot(state)],
        future: state.future.slice(1),
      };
    }),

  reset: () =>
    set({
      graph: cloneFixture(),
      viewState: {},
      view: "roadmap",
      selectedNodeId: "software",
      messages: initialMessages,
      past: [],
      future: [],
      pendingCommands: null,
    }),

  hydrate: (saved) =>
    set({
      ...snapshot(saved),
      messages: saved.messages ?? initialMessages,
      past: [],
      future: [],
      pendingCommands: null,
      selectedNodeId: saved.graph.activeBranchId,
    }),
}));
