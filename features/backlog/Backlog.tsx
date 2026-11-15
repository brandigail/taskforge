"use client";

import { Play, Plus, Flag } from "lucide-react";
import { useMemo, useState } from "react";
import { useBoard, useRole } from "@/features/board/BoardStoreProvider";
import { TaskDrawer, type DrawerTarget } from "@/features/board/TaskDrawer";
import { can } from "@/lib/permissions";
import { completedPoints, totalPoints } from "@/lib/sprint-math";
import type { Sprint, Task } from "@/types";
import { SprintForm } from "./SprintForm";
import { TaskRow } from "./TaskRow";

const STATE_STYLE: Record<Sprint["state"], string> = {
  ACTIVE: "bg-accent-soft text-accent",
  PLANNED: "bg-surface-muted text-muted",
  DONE: "bg-surface-muted text-success",
};

const formatDay = (iso: string): string => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function Backlog() {
  const { role } = useRole();
  const project = useBoard((s) => s.project);
  const columns = useBoard((s) => s.columns);
  const tasks = useBoard((s) => s.tasks);
  const sprints = useBoard((s) => s.sprints);
  const members = useBoard((s) => s.members);
  const error = useBoard((s) => s.error);
  const { dismissError, updateTask, sprintAction } = useBoard((s) => ({ dismissError: s.dismissError, updateTask: s.updateTask, sprintAction: s.sprintAction }));

  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [creating, setCreating] = useState(false);

  const canPlan = can(role, "sprint:manage");
  const columnById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const open = sprints.filter((s) => s.state !== "DONE");
  const finished = sprints.filter((s) => s.state === "DONE");
  const sorted = (list: Task[]) => [...list].sort((a, b) => a.number - b.number);
  const forSprint = (id: string) => sorted(tasks.filter((t) => t.sprintId === id));
  const backlog = sorted(tasks.filter((t) => t.sprintId === null));
  const hasActive = sprints.some((s) => s.state === "ACTIVE");

  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      projectKey={project.key}
      column={columnById.get(task.columnId)}
      assignee={task.assigneeId ? memberById.get(task.assigneeId) : undefined}
      moveTargets={open}
      canPlan={canPlan}
      onMove={(sprintId) => void updateTask(task.id, { sprintId })}
      onOpen={() => setDrawer({ kind: "edit", taskId: task.id })}
    />
  );

  return (
    <section aria-label="Backlog and sprints" className="space-y-6">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger bg-surface p-3 text-sm">
          <p className="flex-1 font-medium text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="min-h-9 rounded-lg px-3 font-medium hover:bg-surface-muted">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Sprint planning</h2>
        {canPlan && !creating && (
          <button type="button" onClick={() => setCreating(true)} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong dark:text-[#0c1020]">
            <Plus className="size-4" aria-hidden /> New sprint
          </button>
        )}
      </div>
      {!canPlan && <p className="text-sm text-muted">Planning sprints is for managers and admins. You can still open any task to edit it.</p>}
      {creating && <SprintForm nextName={`Sprint ${sprints.length + 1}`} onDone={() => setCreating(false)} />}

      {open.map((sprint) => {
        const list = forSprint(sprint.id);
        const points = totalPoints(list.map((t) => ({ points: t.points, completedAt: t.completedAt })));
        const done = completedPoints(list.map((t) => ({ points: t.points, completedAt: t.completedAt })));
        return (
          <article key={sprint.id} aria-labelledby={`sprint-${sprint.id}`} className="overflow-hidden rounded-2xl border border-border bg-surface">
            <header className="flex flex-wrap items-center gap-3 border-b border-border p-4">
              <div className="min-w-0 flex-1">
                <h3 id={`sprint-${sprint.id}`} className="flex flex-wrap items-center gap-2 font-semibold">
                  {sprint.name}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATE_STYLE[sprint.state]}`}>{sprint.state === "ACTIVE" ? "Active" : "Planned"}</span>
                </h3>
                <p className="text-sm text-muted">
                  {formatDay(sprint.startsAt)} to {formatDay(sprint.endsAt)} · {list.length} task{list.length === 1 ? "" : "s"} · {sprint.state === "ACTIVE" ? `${done} of ${points} points done` : `${points} points planned`}
                </p>
                {sprint.goal && <p className="mt-1 text-sm">{sprint.goal}</p>}
              </div>
              {canPlan && sprint.state === "PLANNED" && (
                <button type="button" onClick={() => void sprintAction(sprint.id, "start")} disabled={hasActive} title={hasActive ? "Complete the active sprint first" : undefined} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-4 font-medium hover:bg-surface-muted disabled:opacity-50">
                  <Play className="size-4" aria-hidden /> Start sprint
                </button>
              )}
              {canPlan && sprint.state === "ACTIVE" && (
                <button type="button" onClick={() => { if (window.confirm(`Complete ${sprint.name}? Unfinished tasks go back to the backlog.`)) void sprintAction(sprint.id, "complete"); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong dark:text-[#0c1020]">
                  <Flag className="size-4" aria-hidden /> Complete sprint
                </button>
              )}
            </header>
            {list.length === 0 ? <p className="p-4 text-sm text-muted">No tasks in this sprint yet. Move some in from the backlog below.</p> : <ul className="divide-y divide-border">{list.map(row)}</ul>}
          </article>
        );
      })}

      <article aria-labelledby="backlog" className="overflow-hidden rounded-2xl border border-border bg-surface">
        <header className="border-b border-border p-4">
          <h3 id="backlog" className="font-semibold">
            Backlog
          </h3>
          <p className="text-sm text-muted">
            {backlog.length} task{backlog.length === 1 ? "" : "s"} not in a sprint · {totalPoints(backlog.map((t) => ({ points: t.points, completedAt: t.completedAt })))} points
          </p>
        </header>
        {backlog.length === 0 ? <p className="p-4 text-sm text-muted">The backlog is empty.</p> : <ul className="divide-y divide-border">{backlog.map(row)}</ul>}
      </article>

      {finished.length > 0 && (
        <details className="rounded-2xl border border-border bg-surface">
          <summary className="min-h-12 px-4 py-3 font-semibold">Finished sprints ({finished.length})</summary>
          <ul className="divide-y divide-border border-t border-border">
            {finished.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted">
                  {formatDay(s.startsAt)} to {formatDay(s.endsAt)}
                </span>
                <span className="ml-auto font-medium">
                  {s.completedPoints ?? 0} of {s.committedPoints ?? 0} points delivered
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {drawer && <TaskDrawer key={drawer.kind === "edit" ? drawer.taskId : "new"} target={drawer} onClose={() => setDrawer(null)} />}
    </section>
  );
}
