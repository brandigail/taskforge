export interface PointedTask {
  points: number | null;
  /** ISO timestamp the task entered a done column, or null if it is not done. */
  completedAt: string | null;
}

export interface BurndownPoint {
  /** `YYYY-MM-DD` */
  day: string;
  /** The straight line from the committed total down to zero. */
  ideal: number;
  /** Points still open at the end of that day; null for days that have not happened yet. */
  remaining: number | null;
}

const MS_PER_DAY = 86_400_000;

function parseDay(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function formatDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Calendar day (UTC) a timestamp falls on. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10);
}

export function totalPoints(tasks: readonly PointedTask[]): number {
  return tasks.reduce((sum, t) => sum + (t.points ?? 0), 0);
}

export function completedPoints(tasks: readonly PointedTask[]): number {
  return totalPoints(tasks.filter((t) => t.completedAt !== null));
}

/**
 * Remaining work for each day of a sprint, against the ideal line. A task counts as burned on the day it
 * was completed, so `remaining` only goes down as tasks reach a done column (and back up if one is reopened).
 */
export function burndown(sprint: { startsAt: string; endsAt: string }, tasks: readonly PointedTask[], today: string): BurndownPoint[] {
  const start = parseDay(sprint.startsAt);
  const end = parseDay(sprint.endsAt);
  if (end < start) return [];
  const days = Math.round((end - start) / MS_PER_DAY) + 1;
  const total = totalPoints(tasks);

  return Array.from({ length: days }, (_, i) => {
    const day = formatDay(start + i * MS_PER_DAY);
    const burned = totalPoints(tasks.filter((t) => t.completedAt !== null && dayOf(t.completedAt) <= day));
    return {
      day,
      ideal: days === 1 ? 0 : Math.round(total * (1 - i / (days - 1)) * 10) / 10,
      remaining: day > today ? null : total - burned,
    };
  });
}

export interface VelocityBar {
  name: string;
  committed: number;
  completed: number;
}

/** Committed versus completed points for finished sprints, oldest first, using the snapshots taken at completion. */
export function velocity(
  sprints: readonly { name: string; state: string; completedAt: string | null; committedPoints: number | null; completedPoints: number | null }[],
): VelocityBar[] {
  return sprints
    .filter((s) => s.state === "DONE")
    .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""))
    .map((s) => ({ name: s.name, committed: s.committedPoints ?? 0, completed: s.completedPoints ?? 0 }));
}

export function averageVelocity(bars: readonly VelocityBar[]): number | null {
  if (bars.length === 0) return null;
  return Math.round((bars.reduce((sum, b) => sum + b.completed, 0) / bars.length) * 10) / 10;
}
