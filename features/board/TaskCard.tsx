"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical } from "lucide-react";
import type { Member, Task } from "@/types";

interface Props {
  task: Task;
  projectKey: string;
  assignee: Member | undefined;
  canMove: boolean;
  onOpen: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** The visual card, used both in the column and in the drag overlay. */
export function CardBody({ task, projectKey, assignee }: Pick<Props, "task" | "projectKey" | "assignee">) {
  return (
    <>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
        <span className="font-mono">
          {projectKey}-{task.number}
        </span>
        {task.points !== null && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-foreground" title={`${task.points} story points`}>
            {task.points}
          </span>
        )}
        {task.trackedMinutes > 0 && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {Math.floor(task.trackedMinutes / 60)}h {task.trackedMinutes % 60}m
          </span>
        )}
        {assignee && (
          <span className="ml-auto inline-flex size-6 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white dark:text-[#0c1020]" title={assignee.name} aria-label={`Assigned to ${assignee.name}`}>
            {initials(assignee.name)}
          </span>
        )}
      </div>
    </>
  );
}

export function TaskCard({ task, projectKey, assignee, canMove, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: "task", columnId: task.columnId }, disabled: !canMove });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style} className={`flex items-stretch rounded-xl border border-border bg-surface shadow-sm ${isDragging ? "opacity-40" : ""}`}>
      {canMove && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${projectKey}-${task.number}: ${task.title}. Press space to pick up, arrow keys to move, space to drop.`}
          className="flex w-8 shrink-0 touch-none items-center justify-center rounded-l-xl text-muted hover:bg-surface-muted hover:text-foreground"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}
      <button type="button" onClick={onOpen} className={`min-w-0 flex-1 p-3 text-left hover:bg-surface-muted ${canMove ? "rounded-r-xl" : "rounded-xl"}`} aria-label={`Open ${projectKey}-${task.number}: ${task.title}`}>
        <CardBody task={task} projectKey={projectKey} assignee={assignee} />
      </button>
    </li>
  );
}
