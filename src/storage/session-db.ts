import Dexie, { type EntityTable } from "dexie";

import type { ThinkingGraph, ViewKind } from "@/domain/schema";
import type { ViewState } from "@/mapping/project";
import type { WorkspaceMessage } from "@/store/workspace-store";

export interface StoredSession {
  id: string;
  title: string;
  graph: ThinkingGraph;
  view: ViewKind;
  viewState: ViewState;
  messages: WorkspaceMessage[];
  updatedAt: string;
}

class SessionDatabase extends Dexie {
  sessions!: EntityTable<StoredSession, "id">;

  constructor() {
    super("spatial-thinking-companion");
    this.version(1).stores({ sessions: "id, updatedAt" });
  }
}

export const sessionDb = new SessionDatabase();

export async function saveCurrentSession(session: StoredSession): Promise<void> {
  await sessionDb.sessions.put(structuredClone(session));
}

export async function loadCurrentSession(id = "current"): Promise<StoredSession | undefined> {
  return sessionDb.sessions.get(id);
}
