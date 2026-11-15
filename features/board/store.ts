import { createStore } from "zustand/vanilla";
import { POSITION_STEP, positionBetween } from "@/lib/position";
import type { BoardData, Column, Member, Project, Sprint, Task } from "@/types";
import { call } from "./http";

export interface NewTask {
  columnId: string;
  title: string;
  description: string;
  points: number | null;
  assigneeId: string | null;
  sprintId: string | null;
}

export type TaskPatch = Partial<Pick<Task, "title" | "description" | "points" | "assigneeId" | "sprintId" | "trackedMinutes">>;

export interface BoardState {
  project: Project;
  columns: Column[];
  tasks: Task[];
  sprints: Sprint[];
  members: Member[];
  /** The last failed action, shown as a dismissible banner. Failed optimistic changes have already been rolled back. */
  error: string | null;
  dismissError: () => void;
  reload: () => Promise<void>;
  createTask: (input: NewTask) => Promise<boolean>;
  updateTask: (id: string, patch: TaskPatch) => Promise<boolean>;
  moveTask: (id: string, columnId: string, aboveId: string | null, belowId: string | null) => Promise<void>;
  deleteTask: (id: string) => Promise<boolean>;
  createColumn: (name: string, isDone: boolean) => Promise<void>;
  updateColumn: (id: string, patch: { name?: string; isDone?: boolean }) => Promise<void>;
  deleteColumn: (id: string, moveTo: string | null) => Promise<boolean>;
  createSprint: (input: { name: string; goal: string; startsAt: string; endsAt: string }) => Promise<boolean>;
  sprintAction: (id: string, action: "start" | "complete") => Promise<void>;
}

const message = (error: unknown): string => (error instanceof Error ? error.message : "Something went wrong");
const replaceTask = (tasks: Task[], next: Task): Task[] => tasks.map((t) => (t.id === next.id ? next : t));

/** Where a card dropped between two neighbours would sit, worked out locally so the board can move before the server answers. */
function localPosition(tasks: Task[], taskId: string, columnId: string, aboveId: string | null, belowId: string | null): number {
  const inColumn = tasks.filter((t) => t.columnId === columnId && t.id !== taskId).sort((a, b) => a.position - b.position);
  const above = aboveId ? inColumn.find((t) => t.id === aboveId)?.position ?? null : null;
  const below = belowId ? inColumn.find((t) => t.id === belowId)?.position ?? null : null;
  if (above === null && below === null) return (inColumn.at(-1)?.position ?? 0) + POSITION_STEP;
  return positionBetween(above, below);
}

/**
 * One store per mounted board or backlog screen, seeded from what the server rendered. Changes are optimistic:
 * the UI updates first, the server confirms, and on failure the change is rolled back and an error is shown.
 */
export function createBoardStore(initial: BoardData) {
  return createStore<BoardState>()((set, get) => {
    const fail = (error: unknown) => set({ error: message(error) });

    return {
      ...initial,
      error: null,
      dismissError: () => set({ error: null }),

      reload: async () => {
        try {
          const fresh = await call<BoardData>(`/api/projects/${get().project.key}/board`, "GET");
          set({ ...fresh });
        } catch (error) {
          fail(error);
        }
      },

      createTask: async (input) => {
        try {
          const { task } = await call<{ task: Task }>(`/api/projects/${get().project.key}/tasks`, "POST", input);
          set((s) => ({ tasks: [...s.tasks, task] }));
          return true;
        } catch (error) {
          fail(error);
          return false;
        }
      },

      updateTask: async (id, patch) => {
        const before = get().tasks.find((t) => t.id === id);
        if (!before) return false;
        set((s) => ({ tasks: replaceTask(s.tasks, { ...before, ...patch }) }));
        try {
          const { task } = await call<{ task: Task }>(`/api/tasks/${id}`, "PATCH", patch);
          set((s) => ({ tasks: replaceTask(s.tasks, task) }));
          return true;
        } catch (error) {
          set((s) => ({ tasks: replaceTask(s.tasks, before) }));
          fail(error);
          return false;
        }
      },

      moveTask: async (id, columnId, aboveId, belowId) => {
        const { tasks, columns } = get();
        const before = tasks.find((t) => t.id === id);
        const destination = columns.find((c) => c.id === columnId);
        if (!before || !destination) return;
        const moved: Task = {
          ...before,
          columnId,
          position: localPosition(tasks, id, columnId, aboveId, belowId),
          completedAt: destination.isDone ? (before.completedAt ?? new Date().toISOString()) : null,
        };
        set((s) => ({ tasks: replaceTask(s.tasks, moved) }));
        try {
          const { task } = await call<{ task: Task }>(`/api/tasks/${id}/move`, "POST", { columnId, aboveId, belowId });
          set((s) => ({ tasks: replaceTask(s.tasks, task) }));
        } catch (error) {
          set((s) => ({ tasks: replaceTask(s.tasks, before) }));
          fail(error);
        }
      },

      deleteTask: async (id) => {
        const before = get().tasks;
        set({ tasks: before.filter((t) => t.id !== id) });
        try {
          await call(`/api/tasks/${id}`, "DELETE");
          return true;
        } catch (error) {
          set({ tasks: before });
          fail(error);
          return false;
        }
      },

      createColumn: async (name, isDone) => {
        try {
          const { column } = await call<{ column: Column }>(`/api/projects/${get().project.key}/columns`, "POST", { name, isDone });
          set((s) => ({ columns: [...s.columns, column] }));
        } catch (error) {
          fail(error);
        }
      },

      updateColumn: async (id, patch) => {
        const before = get().columns;
        set({ columns: before.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
        try {
          await call(`/api/columns/${id}`, "PATCH", patch);
          // Marking a column done or not re-stamps its cards on the server, so pick up the real state.
          if (patch.isDone !== undefined) await get().reload();
        } catch (error) {
          set({ columns: before });
          fail(error);
        }
      },

      deleteColumn: async (id, moveTo) => {
        try {
          await call(`/api/columns/${id}`, "DELETE", { moveTo });
          await get().reload();
          return true;
        } catch (error) {
          fail(error);
          return false;
        }
      },

      createSprint: async (input) => {
        try {
          await call(`/api/projects/${get().project.key}/sprints`, "POST", input);
          await get().reload();
          return true;
        } catch (error) {
          fail(error);
          return false;
        }
      },

      sprintAction: async (id, action) => {
        try {
          await call(`/api/sprints/${id}/${action}`, "POST", {});
          await get().reload();
        } catch (error) {
          fail(error);
        }
      },
    };
  });
}

export type BoardStore = ReturnType<typeof createBoardStore>;
