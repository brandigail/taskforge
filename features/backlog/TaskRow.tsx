"use client";

import type { Column, Member, Sprint, Task } from "@/types";

interface Props {
  task: Task;
  projectKey: string;
  column: Column | undefined;
  assignee: Member | undefined;
  /** Open sprints the task could move to. Empty when the viewer may not plan sprints. */
  moveTargets: Sprint[];
  canPlan: boolean;
  onMove: (sprintId: string | null) => void;
  onOpen: () => void;
}

/** One line in the backlog or a sprint, with a select to move the task between them (the keyboard and touch way, no dragging needed). */
export function TaskRow({ task, projectKey, column, assignee, moveTargets, canPlan, onMove, onOpen }: Props) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 basis-56 items-baseline gap-2 rounded-lg py-1 text-left hover:underline">
        <span className="shrink-0 font-mono text-xs text-muted">
          {projectKey}-{task.number}
        </span>
        <span className={`truncate text-sm font-medium ${task.completedAt ? "text-muted line-through" : ""}`}>{task.title}</span>
      </button>
      <span className="text-xs text-muted">{column?.name ?? ""}</span>
      <span className="w-8 text-center text-xs font-semibold" title="Story points">
        {task.points ?? "–"}
      </span>
      <span className="w-28 truncate text-xs text-muted">{assignee?.name ?? "Unassigned"}</span>
      {canPlan && (
        <label className="text-xs">
          <span className="sr-only">Move {projectKey}-{task.number} to</span>
          <select value={task.sprintId ?? ""} onChange={(e) => onMove(e.target.value || null)} className="h-9 max-w-40 rounded-lg border border-border bg-background px-2 text-xs">
            <option value="">Backlog</option>
            {moveTargets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </li>
  );
}
