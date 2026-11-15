"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { BoardData, Role } from "@/types";
import { createBoardStore, type BoardState, type BoardStore } from "./store";

interface Ctx {
  store: BoardStore;
  role: Role;
  userId: string;
}

const BoardContext = createContext<Ctx | null>(null);

/** Seeds a fresh store from the server-rendered data. The lazy initialiser means it is created once per mount. */
export function BoardStoreProvider({ data, role, userId, children }: { data: BoardData; role: Role; userId: string; children: ReactNode }) {
  const [store] = useState(() => createBoardStore(data));
  return <BoardContext.Provider value={{ store, role, userId }}>{children}</BoardContext.Provider>;
}

function useCtx(): Ctx {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used inside <BoardStoreProvider>");
  return ctx;
}

/**
 * Selections are compared shallowly. Without that, a selector that builds a new object each render (such as
 * `{ moveTask: s.moveTask, ... }`) looks like a change every time and React loops forever.
 */
export function useBoard<T>(selector: (state: BoardState) => T): T {
  return useStore(useCtx().store, useShallow(selector));
}

export function useRole(): { role: Role; userId: string } {
  const { role, userId } = useCtx();
  return { role, userId };
}
