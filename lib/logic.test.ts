import { describe, expect, it } from "vitest";
import { can, type Action } from "./permissions";
import { evenPositions, needsRebalance, positionBetween, POSITION_STEP } from "./position";
import { averageVelocity, burndown, completedPoints, totalPoints, velocity } from "./sprint-math";

describe("permissions", () => {
  const all: Action[] = ["project:create", "project:delete", "column:manage", "sprint:manage", "task:create", "task:edit", "task:move", "task:assign", "task:delete"];

  it("lets an admin do everything", () => {
    for (const action of all) expect(can("ADMIN", action)).toBe(true);
  });

  it("lets a manager do everything except delete a project", () => {
    for (const action of all) expect(can("MANAGER", action)).toBe(action !== "project:delete");
  });

  it("limits a contributor to creating, editing and moving tasks", () => {
    const allowed = all.filter((a) => can("CONTRIBUTOR", a));
    expect(allowed).toEqual(["task:create", "task:edit", "task:move"]);
  });
});

describe("positionBetween", () => {
  it("handles an empty column, the top, the bottom and the middle", () => {
    expect(positionBetween(null, null)).toBe(POSITION_STEP);
    expect(positionBetween(null, 1000)).toBe(0);
    expect(positionBetween(3000, null)).toBe(4000);
    expect(positionBetween(1000, 2000)).toBe(1500);
  });

  it("stays strictly between neighbours across many repeated inserts", () => {
    let low = 1000;
    const high = 2000;
    for (let i = 0; i < 30; i++) {
      const mid = positionBetween(low, high);
      expect(mid).toBeGreaterThan(low);
      expect(mid).toBeLessThan(high);
      low = mid;
    }
  });

  it("asks for a renumber when neighbours are too close", () => {
    expect(needsRebalance(1, 1 + 1e-9)).toBe(true);
    expect(needsRebalance(1000, 2000)).toBe(false);
    expect(needsRebalance(null, 5)).toBe(false);
  });

  it("builds evenly spaced positions", () => {
    expect(evenPositions(3)).toEqual([1000, 2000, 3000]);
    expect(evenPositions(0)).toEqual([]);
  });
});

describe("sprint maths", () => {
  const tasks = [
    { points: 5, completedAt: "2025-03-03T10:00:00.000Z" },
    { points: 3, completedAt: "2025-03-05T16:00:00.000Z" },
    { points: 8, completedAt: null },
    { points: null, completedAt: "2025-03-04T09:00:00.000Z" },
  ];

  it("totals points, treating unpointed tasks as zero", () => {
    expect(totalPoints(tasks)).toBe(16);
    expect(completedPoints(tasks)).toBe(8);
  });

  it("burns down on the day each task is completed and leaves the future empty", () => {
    const line = burndown({ startsAt: "2025-03-03", endsAt: "2025-03-07" }, tasks, "2025-03-05");
    expect(line.map((p) => p.day)).toEqual(["2025-03-03", "2025-03-04", "2025-03-05", "2025-03-06", "2025-03-07"]);
    expect(line.map((p) => p.remaining)).toEqual([11, 11, 8, null, null]);
    expect(line[0]?.ideal).toBe(16);
    expect(line[4]?.ideal).toBe(0);
    expect(line[2]?.ideal).toBe(8);
  });

  it("puts work back on the line when a task is reopened", () => {
    const reopened = tasks.map((t) => (t.points === 3 ? { ...t, completedAt: null } : t));
    const line = burndown({ startsAt: "2025-03-03", endsAt: "2025-03-05" }, reopened, "2025-03-05");
    expect(line.at(-1)?.remaining).toBe(11);
  });

  it("copes with a one-day sprint and a backwards range", () => {
    expect(burndown({ startsAt: "2025-03-03", endsAt: "2025-03-03" }, tasks, "2025-03-03")).toHaveLength(1);
    expect(burndown({ startsAt: "2025-03-05", endsAt: "2025-03-03" }, tasks, "2025-03-03")).toEqual([]);
  });

  it("builds velocity from finished sprints only, oldest first, and averages it", () => {
    const bars = velocity([
      { name: "S2", state: "DONE", completedAt: "2025-03-20T00:00:00Z", committedPoints: 20, completedPoints: 18 },
      { name: "S1", state: "DONE", completedAt: "2025-03-06T00:00:00Z", committedPoints: 15, completedPoints: 15 },
      { name: "S3", state: "ACTIVE", completedAt: null, committedPoints: null, completedPoints: null },
    ]);
    expect(bars.map((b) => b.name)).toEqual(["S1", "S2"]);
    expect(averageVelocity(bars)).toBe(16.5);
    expect(averageVelocity([])).toBeNull();
  });
});
