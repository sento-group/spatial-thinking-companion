"use client";

import { create } from "zustand";

import {
  applyCommands,
  ProtectedCommandError,
  type GraphCommand,
} from "@/domain/commands";
import { cloneFixture } from "@/domain/fixtures";
import { parseThinkingGraph, type Relation, type ThinkingGraph, type ViewKind } from "@/domain/schema";
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

export type RelationshipLayer = "main" | "all";

export interface RelationDraft {
  from: string;
  to: string | null;
}

export interface PendingProposal {
  commands: GraphCommand[];
  reply?: string;
  summary?: string | null;
  challengeId?: string;
  response?: string;
}

interface WorkspaceState extends WorkspaceSnapshot {
  selectedNodeId: string | null;
  messages: WorkspaceMessage[];
  past: WorkspaceSnapshot[];
  future: WorkspaceSnapshot[];
  edgeScope: RelationshipLayer;
  relationDraft: RelationDraft | null;
  editingNodeId: string | null;
  pendingProposal: PendingProposal | null;
  collapsedNodeIds: string[];
  setGraph: (graph: ThinkingGraph, reply?: string) => void;
  setView: (view: ViewKind) => void;
  setEdgeScope: (scope: RelationshipLayer) => void;
  selectNode: (id: string | null) => void;
  addChild: () => void;
  addSibling: () => void;
  deleteSelected: () => void;
  finishEditing: () => void;
  beginRelation: () => void;
  setRelationTarget: (id: string) => void;
  commitRelation: (relation: Relation) => void;
  cancelRelation: () => void;
  toggleCollapsed: (id: string) => void;
  moveNode: (id: string, position: Position) => void;
  applyHumanCommands: (commands: GraphCommand[]) => void;
  applyAiCommands: (commands: GraphCommand[], reply?: string) => void;
  stageChallengeProposal: (proposal: PendingProposal) => void;
  approvePending: () => void;
  rejectPending: () => void;
  addMessage: (message: Omit<WorkspaceMessage, "id">) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  hydrate: (snapshot: WorkspaceSnapshot & {
    messages?: WorkspaceMessage[];
    collapsedNodeIds?: string[];
  }) => void;
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

function entityId(prefix: string): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextOrder(graph: ThinkingGraph, parentId: string | null): number {
  return graph.nodes
    .filter((node) => node.parentId === parentId)
    .reduce((highest, node) => Math.max(highest, node.order ?? -1), -1) + 1;
}

const initialMessages: WorkspaceMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "**本筋を一文で入力してください。** ひとつの思考マップを作り、反論や盲点への回答から構造を更新します。",
  },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  graph: cloneFixture(),
  viewState: {},
  view: "relation",
  selectedNodeId: "software",
  messages: initialMessages,
  past: [],
  future: [],
  edgeScope: "main",
  relationDraft: null,
  editingNodeId: null,
  pendingProposal: null,
  collapsedNodeIds: [],

  setGraph: (graph, reply) =>
    set((state) => ({
      past: [...state.past, snapshot(state)],
      future: [],
      graph: structuredClone(graph),
      view: "relation",
      viewState: {},
      selectedNodeId: graph.activeBranchId,
      collapsedNodeIds: [],
      messages: reply
        ? [...state.messages, { id: messageId(), role: "assistant", content: reply }]
        : state.messages,
    })),

  setView: (view) => set({ view }),
  setEdgeScope: (edgeScope) => set({ edgeScope }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),

  addChild: () =>
    set((state) => {
      const parent = state.graph.nodes.find((node) => node.id === state.selectedNodeId)
        ?? state.graph.nodes.find((node) => node.id === state.graph.activeBranchId)
        ?? state.graph.nodes[0];
      if (!parent) return state;
      const id = entityId("node");
      const graph = applyCommands(state.graph, [
        {
          type: "node.add",
          node: {
            id,
            statement: "新しい論点",
            type: "question",
            time: parent.time,
            abstraction: "concrete",
            socialReach: parent.socialReach,
            certainty: 0.5,
            status: "active",
            parentId: parent.id,
            order: nextOrder(state.graph, parent.id),
            facts: [],
            sourceIds: [],
            userLocked: true,
          },
        },
        { type: "branch.activate", id },
      ], { source: "human" }).graph;
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph,
        selectedNodeId: id,
        editingNodeId: id,
      };
    }),

  addSibling: () =>
    set((state) => {
      const selected = state.graph.nodes.find((node) => node.id === state.selectedNodeId);
      if (!selected) return state;
      const parentId = selected.parentId ?? selected.id;
      const id = entityId("node");
      const graph = applyCommands(state.graph, [
        {
          type: "node.add",
          node: {
            id,
            statement: "新しい分岐",
            type: "question",
            time: selected.time,
            abstraction: selected.abstraction,
            socialReach: selected.socialReach,
            certainty: 0.5,
            status: "active",
            parentId,
            order: nextOrder(state.graph, parentId),
            facts: [],
            sourceIds: [],
            userLocked: true,
          },
        },
        { type: "branch.activate", id },
      ], { source: "human" }).graph;
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph,
        selectedNodeId: id,
        editingNodeId: id,
      };
    }),

  deleteSelected: () =>
    set((state) => {
      const selected = state.graph.nodes.find((node) => node.id === state.selectedNodeId);
      if (!selected || selected.parentId === null) return state;
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph: applyCommands(state.graph, [{ type: "node.remove", id: selected.id }], { source: "human" }).graph,
        selectedNodeId: selected.parentId,
      };
    }),

  finishEditing: () => set({ editingNodeId: null }),
  beginRelation: () =>
    set((state) => state.selectedNodeId
      ? { relationDraft: { from: state.selectedNodeId, to: null }, edgeScope: "all" }
      : state),
  setRelationTarget: (id) =>
    set((state) => state.relationDraft && state.relationDraft.from !== id
      ? { relationDraft: { ...state.relationDraft, to: id }, selectedNodeId: id }
      : state),
  commitRelation: (relation) =>
    set((state) => {
      const draft = state.relationDraft;
      if (!draft?.to) return state;
      const graph = applyCommands(state.graph, [{
        type: "edge.add",
        edge: { id: entityId("edge"), from: draft.from, to: draft.to, relation },
      }], { source: "human" }).graph;
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph,
        relationDraft: null,
      };
    }),
  cancelRelation: () => set({ relationDraft: null }),
  toggleCollapsed: (id) => set((state) => ({
    collapsedNodeIds: state.collapsedNodeIds.includes(id)
      ? state.collapsedNodeIds.filter((candidate) => candidate !== id)
      : [...state.collapsedNodeIds, id],
  })),

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
          pendingProposal: null,
        };
      } catch (error) {
        if (error instanceof ProtectedCommandError) {
          return {
            pendingProposal: {
              commands,
              reply,
              summary: "固定した要素を含むため、適用前に確認が必要です。",
            },
            messages: nextMessages,
          };
        }
        throw error;
      }
    }),

  stageChallengeProposal: (pendingProposal) => set({ pendingProposal }),

  approvePending: () =>
    set((state) => {
      if (!state.pendingProposal) return state;
      const challengeCommand: GraphCommand[] = state.pendingProposal.challengeId
        ? [{
            type: "challenge.update",
            id: state.pendingProposal.challengeId,
            changes: {
              status: "resolved",
              response: state.pendingProposal.response ?? null,
              impactSummary: state.pendingProposal.summary ?? state.pendingProposal.reply ?? null,
            },
          }]
        : [];
      const commands = [...state.pendingProposal.commands, ...challengeCommand];
      return {
        past: [...state.past, snapshot(state)],
        future: [],
        graph: applyCommands(state.graph, commands, {
          source: "ai",
          approved: true,
        }).graph,
        pendingProposal: null,
      };
    }),

  rejectPending: () => set({ pendingProposal: null }),
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
      view: "relation",
      selectedNodeId: "software",
      messages: initialMessages,
      past: [],
      future: [],
      edgeScope: "main",
      relationDraft: null,
      editingNodeId: null,
      pendingProposal: null,
      collapsedNodeIds: [],
    }),

  hydrate: (saved) =>
    set({
      ...snapshot({ ...saved, graph: parseThinkingGraph(saved.graph), view: "relation" }),
      messages: saved.messages ?? initialMessages,
      past: [],
      future: [],
      edgeScope: "main",
      relationDraft: null,
      editingNodeId: null,
      pendingProposal: null,
      collapsedNodeIds: saved.collapsedNodeIds ?? [],
      selectedNodeId: saved.graph.activeBranchId,
    }),
}));
