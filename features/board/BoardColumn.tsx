"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CheckCircle2, Plus, Settings2 } from "lucide-react";
import { useState } from "react";
import type { Column, Member, Task } from "@/types";
import { TaskCard } from "./TaskCard";

interface Props {
  column: Column;
  /** Ids in display order. During a drag this is the live, not yet saved, order. */
  taskIds: string[];
  tasksById: Map<string, Task>;
  members: Map<string, Member>;
  projectKey: string;
  canMove: boolean;
  canCreate: boolean;
  canManage: boolean;
  allColumns: Column[];
  onOpenTask: (id: string) => void;
  onCreate: () => void;
  onRename: (name: string) => void;
  onToggleDone: () => void;
  onDelete: (moveTo: string | null) => void;
  cardCount: number;
}

export function BoardColumn({ column, taskIds, tasksById, members, projectKey, canMove, canCreate, canManage, allColumns, onOpenTask, onCreate, onRename, onToggleDone, onDelete, cardCount }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { type: "column" } });
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const [name, setName] = useState(column.name);
  const others = allColumns.filter((c) => c.id !== column.id);
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? "");

  function commitRename() {
    const next = name.trim();
    setEditing(false);
    if (next && next !== column.name) onRename(next);
    else setName(column.name);
  }

  return (
    <section aria-labelledby={`col-${column.id}`} className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-surface-muted/60 ${isOver ? "border-accent" : "border-border"}`}>
      <header className="flex items-center gap-1 px-3 pt-3">
        {editing ? (
          <input
            autoFocus
            value={name}
            maxLength={30}
            aria-label="Column name"
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setName(column.name);
                setEditing(false);
              }
            }}
            className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm font-semibold"
          />
        ) : (
          <h2 id={`col-${column.id}`} className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold">
            <span className="truncate">{column.name}</span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">{cardCount}</span>
            {column.isDone && <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="Done column" />}
          </h2>
        )}
        {canCreate && (
          <button type="button" onClick={onCreate} aria-label={`Add a task to ${column.name}`} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground">
            <Plus className="size-4" aria-hidden />
          </button>
        )}
        {canManage && (
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label={`Manage ${column.name}`} className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-foreground">
              <Settings2 className="size-4" aria-hidden />
            </button>
            {menu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-60 space-y-2 rounded-xl border border-border bg-surface p-3 text-sm shadow-lg">
                <button type="button" className="min-h-10 w-full rounded-lg px-2 text-left hover:bg-surface-muted" onClick={() => { setMenu(false); setEditing(true); }}>
                  Rename column
                </button>
                <button type="button" className="min-h-10 w-full rounded-lg px-2 text-left hover:bg-surface-muted" onClick={() => { setMenu(false); onToggleDone(); }}>
                  {column.isDone ? "Stop counting as done" : "Count as done"}
                </button>
                <div className="border-t border-border pt-2">
                  {cardCount > 0 && (
                    <label className="mb-2 block text-xs font-medium text-muted">
                      Move its {cardCount} card{cardCount === 1 ? "" : "s"} to
                      <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground">
                        {others.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    className="min-h-10 w-full rounded-lg px-2 text-left font-medium text-danger hover:bg-surface-muted"
                    onClick={() => {
                      setMenu(false);
                      if (window.confirm(`Delete the column "${column.name}"?`)) onDelete(cardCount > 0 ? moveTo : null);
                    }}
                  >
                    Delete column
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 p-3" aria-label={`${column.name} tasks`}>
          {taskIds.map((id) => {
            const task = tasksById.get(id);
            return task ? <TaskCard key={id} task={task} projectKey={projectKey} assignee={task.assigneeId ? members.get(task.assigneeId) : undefined} canMove={canMove} onOpen={() => onOpenTask(id)} /> : null;
          })}
          {taskIds.length === 0 && <li className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">No tasks here.</li>}
        </ul>
      </SortableContext>
    </section>
  );
}
