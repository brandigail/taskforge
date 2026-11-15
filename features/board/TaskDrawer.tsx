"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { can } from "@/lib/permissions";
import { POINT_OPTIONS } from "@/lib/schemas";
import { useBoard, useRole } from "./BoardStoreProvider";

export type DrawerTarget = { kind: "create"; columnId: string } | { kind: "edit"; taskId: string };

const field = "mt-1 min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-base disabled:opacity-60";

export function TaskDrawer({ target, onClose }: { target: DrawerTarget; onClose: () => void }) {
  const { role } = useRole();
  const project = useBoard((s) => s.project);
  const columns = useBoard((s) => s.columns);
  const members = useBoard((s) => s.members);
  const sprints = useBoard((s) => s.sprints);
  const task = useBoard((s) => (target.kind === "edit" ? s.tasks.find((t) => t.id === target.taskId) : undefined));
  const { createTask, updateTask, moveTask, deleteTask } = useBoard((s) => ({ createTask: s.createTask, updateTask: s.updateTask, moveTask: s.moveTask, deleteTask: s.deleteTask }));

  const first = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [points, setPoints] = useState<number | null>(task?.points ?? null);
  const [assigneeId, setAssigneeId] = useState<string | null>(task?.assigneeId ?? null);
  const [sprintId, setSprintId] = useState<string | null>(task?.sprintId ?? null);
  const [minutes, setMinutes] = useState(String(task?.trackedMinutes ?? 0));
  const [columnId, setColumnId] = useState(target.kind === "create" ? target.columnId : (task?.columnId ?? ""));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canAssign = can(role, "task:assign");
  const canPlan = can(role, "sprint:manage");
  const canDelete = can(role, "task:delete");
  const openSprints = sprints.filter((s) => s.state !== "DONE");

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (target.kind === "edit" && !task) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setFormError("Give the task a title.");
    const tracked = Number(minutes);
    if (!Number.isInteger(tracked) || tracked < 0) return setFormError("Tracked time must be a whole number of minutes.");
    setFormError(null);
    setBusy(true);
    const ok =
      target.kind === "create"
        ? await createTask({ columnId, title: title.trim(), description: description.trim(), points, assigneeId: canAssign ? assigneeId : null, sprintId: canPlan ? sprintId : null })
        : await updateTask(target.taskId, {
            title: title.trim(),
            description: description.trim(),
            points,
            trackedMinutes: tracked,
            ...(canAssign ? { assigneeId } : {}),
            ...(canPlan ? { sprintId } : {}),
          });
    setBusy(false);
    if (ok) onClose();
  }

  async function changeStatus(next: string) {
    setColumnId(next);
    // Moving through the form is the keyboard- and touch-friendly alternative to dragging.
    if (target.kind === "edit") await moveTask(target.taskId, next, null, null);
  }

  async function remove() {
    if (target.kind !== "edit" || !window.confirm("Delete this task? This cannot be undone.")) return;
    if (await deleteTask(target.taskId)) onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form role="dialog" aria-modal="true" aria-labelledby="drawer-title" onSubmit={save} className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 id="drawer-title" className="font-semibold">
            {target.kind === "create" ? "New task" : `${project.key}-${task?.number}`}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-10 items-center justify-center rounded-lg hover:bg-surface-muted">
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block text-sm font-medium">
            Title
            <input ref={first} className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required />
          </label>
          <label className="block text-sm font-medium">
            Description
            <textarea className={field} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              Status
              <select className={field} value={columnId} onChange={(e) => void changeStatus(e.target.value)}>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Story points
              <select className={field} value={points ?? ""} onChange={(e) => setPoints(e.target.value === "" ? null : Number(e.target.value))}>
                <option value="">Not sized</option>
                {POINT_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Assignee
              <select className={field} value={assigneeId ?? ""} disabled={!canAssign} onChange={(e) => setAssigneeId(e.target.value || null)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              Sprint
              <select className={field} value={sprintId ?? ""} disabled={!canPlan} onChange={(e) => setSprintId(e.target.value || null)}>
                <option value="">Backlog</option>
                {openSprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.state === "ACTIVE" ? " (active)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {(!canAssign || !canPlan) && <p className="text-xs text-muted">Assigning people and planning sprints is for managers and admins.</p>}
          {target.kind === "edit" && (
            <label className="block text-sm font-medium">
              Time tracked (minutes)
              <input className={field} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
          )}
          {formError && (
            <p role="alert" className="text-sm font-medium text-danger">
              {formError}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-border p-4">
          <button type="submit" disabled={busy} className="min-h-11 flex-1 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong disabled:opacity-60 dark:text-[#0c1020]">
            {target.kind === "create" ? "Create task" : "Save changes"}
          </button>
          {target.kind === "edit" && canDelete && (
            <button type="button" onClick={() => void remove()} aria-label="Delete task" className="flex size-11 items-center justify-center rounded-lg border border-border text-danger hover:bg-surface-muted">
              <Trash2 className="size-5" aria-hidden />
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
