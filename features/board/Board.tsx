"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { can } from "@/lib/permissions";
import type { Task } from "@/types";
import { BoardColumn } from "./BoardColumn";
import { useBoard, useRole } from "./BoardStoreProvider";
import { CardBody } from "./TaskCard";
import { TaskDrawer, type DrawerTarget } from "./TaskDrawer";

type Lists = Record<string, string[]>;

export function Board() {
  const { role } = useRole();
  const project = useBoard((s) => s.project);
  const columns = useBoard((s) => s.columns);
  const tasks = useBoard((s) => s.tasks);
  const sprints = useBoard((s) => s.sprints);
  const members = useBoard((s) => s.members);
  const error = useBoard((s) => s.error);
  const { dismissError, moveTask, createColumn, updateColumn, deleteColumn } = useBoard((s) => ({ dismissError: s.dismissError, moveTask: s.moveTask, createColumn: s.createColumn, updateColumn: s.updateColumn, deleteColumn: s.deleteColumn }));

  const activeSprint = sprints.find((s) => s.state === "ACTIVE");
  const [filter, setFilter] = useState<string>(activeSprint ? "active" : "all");
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Lists | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumn, setNewColumn] = useState("");

  const canMove = can(role, "task:move");
  const canCreate = can(role, "task:create");
  const canManage = can(role, "column:manage");

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const columnNames = useMemo(() => new Map(columns.map((c) => [c.id, c.name])), [columns]);

  const visible = useMemo(() => {
    const keep = (t: Task) => (filter === "all" ? true : filter === "backlog" ? t.sprintId === null : filter === "active" ? t.sprintId === activeSprint?.id : t.sprintId === filter);
    return tasks.filter(keep);
  }, [tasks, filter, activeSprint]);

  const baseLists = useMemo<Lists>(
    () => Object.fromEntries(columns.map((c) => [c.id, visible.filter((t) => t.columnId === c.id).sort((a, b) => a.position - b.position).map((t) => t.id)])),
    [columns, visible],
  );
  // While dragging, the board shows a working copy so the card follows the pointer between columns before anything is saved.
  const lists = draft ?? baseLists;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const containerOf = (id: string, from: Lists): string | undefined => (id in from ? id : Object.keys(from).find((key) => from[key]?.includes(id)));
  const titleOf = (id: string | number): string => tasksById.get(String(id))?.title ?? "task";
  const where = (id: string | number): string => {
    const container = containerOf(String(id), lists);
    return columnNames.get(container ?? String(id)) ?? "the board";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} is over ${where(over.id)}.` : undefined),
    onDragEnd: ({ active, over }) => (over ? `${titleOf(active.id)} was dropped in ${where(over.id)}.` : `${titleOf(active.id)} was dropped.`),
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled.`,
  };

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setDraft(structuredClone(baseLists));
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over || !draft) return;
    const from = containerOf(String(active.id), draft);
    const to = containerOf(String(over.id), draft);
    if (!from || !to || from === to) return;
    setDraft((current) => {
      if (!current) return current;
      const target = [...(current[to] ?? [])];
      const overIndex = String(over.id) in current ? target.length : target.indexOf(String(over.id));
      const below = over.rect && active.rect.current.translated ? active.rect.current.translated.top > over.rect.top + over.rect.height / 2 : false;
      target.splice(overIndex < 0 ? target.length : overIndex + (below ? 1 : 0), 0, String(active.id));
      return { ...current, [from]: (current[from] ?? []).filter((id) => id !== String(active.id)), [to]: target };
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const id = String(active.id);
    const working = draft ?? baseLists;
    const container = containerOf(id, working);
    const original = tasksById.get(id);
    setActiveId(null);
    setDraft(null);
    if (!container || !original || !over) return;

    let list = working[container] ?? [];
    const overContainer = containerOf(String(over.id), working);
    if (overContainer === container && String(over.id) !== id && !(String(over.id) in working)) {
      list = arrayMove(list, list.indexOf(id), list.indexOf(String(over.id)));
    }
    const index = list.indexOf(id);
    const originalIndex = baseLists[original.columnId]?.indexOf(id) ?? -1;
    if (container === original.columnId && index === originalIndex) return;
    void moveTask(id, container, list[index - 1] ?? null, list[index + 1] ?? null);
  }

  async function submitColumn(e: FormEvent) {
    e.preventDefault();
    if (!newColumn.trim()) return;
    await createColumn(newColumn.trim(), false);
    setNewColumn("");
    setAddingColumn(false);
  }

  const dragged = activeId ? tasksById.get(activeId) : undefined;

  return (
    <section aria-label="Board">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          Show
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-lg border border-border bg-surface px-3 text-sm">
            {activeSprint && <option value="active">Active sprint: {activeSprint.name}</option>}
            <option value="all">All tasks</option>
            <option value="backlog">Backlog only</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.state.toLowerCase()})
              </option>
            ))}
          </select>
        </label>
        <p className="text-sm text-muted">
          {visible.length} task{visible.length === 1 ? "" : "s"}
          {!canMove && " · read only"}
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-danger bg-surface p-3 text-sm">
          <p className="flex-1 font-medium text-danger">{error}</p>
          <button type="button" onClick={dismissError} className="min-h-9 rounded-lg px-3 font-medium hover:bg-surface-muted">
            Dismiss
          </button>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} accessibility={{ announcements }} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => { setActiveId(null); setDraft(null); }}>
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              taskIds={lists[column.id] ?? []}
              tasksById={tasksById}
              members={memberMap}
              projectKey={project.key}
              canMove={canMove}
              canCreate={canCreate}
              canManage={canManage}
              allColumns={columns}
              cardCount={baseLists[column.id]?.length ?? 0}
              onOpenTask={(taskId) => setDrawer({ kind: "edit", taskId })}
              onCreate={() => setDrawer({ kind: "create", columnId: column.id })}
              onRename={(name) => void updateColumn(column.id, { name })}
              onToggleDone={() => void updateColumn(column.id, { isDone: !column.isDone })}
              onDelete={(moveTo) => void deleteColumn(column.id, moveTo)}
            />
          ))}

          {canManage && (
            <div className="w-72 shrink-0">
              {addingColumn ? (
                <form onSubmit={submitColumn} className="space-y-2 rounded-2xl border border-border bg-surface p-3">
                  <label className="block text-sm font-medium">
                    Column name
                    <input autoFocus value={newColumn} onChange={(e) => setNewColumn(e.target.value)} maxLength={30} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3" />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="min-h-10 rounded-lg bg-accent px-3 text-sm font-semibold text-white hover:bg-accent-strong dark:text-[#0c1020]">
                      Add column
                    </button>
                    <button type="button" onClick={() => setAddingColumn(false)} className="min-h-10 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-muted">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button type="button" onClick={() => setAddingColumn(true)} className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-sm font-medium text-muted hover:bg-surface hover:text-foreground">
                  <Plus className="size-4" aria-hidden /> Add column
                </button>
              )}
            </div>
          )}
        </div>

        <DragOverlay>
          {dragged ? (
            <div className="rounded-xl border border-accent bg-surface p-3 shadow-lg">
              <CardBody task={dragged} projectKey={project.key} assignee={dragged.assigneeId ? memberMap.get(dragged.assigneeId) : undefined} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {drawer && <TaskDrawer key={drawer.kind === "edit" ? drawer.taskId : `new-${drawer.columnId}`} target={drawer} onClose={() => setDrawer(null)} />}
    </section>
  );
}
