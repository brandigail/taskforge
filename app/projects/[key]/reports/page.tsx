import type { Metadata } from "next";
import { BurndownChart } from "@/features/reports/BurndownChart";
import { VelocityChart } from "@/features/reports/VelocityChart";
import { loadBoard } from "@/lib/server/projects";
import { averageVelocity, burndown, completedPoints, totalPoints, velocity } from "@/lib/sprint-math";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ params }: PageProps<"/projects/[key]/reports">) {
  const { key } = await params;
  const data = await loadBoard(key);
  const today = new Date().toISOString().slice(0, 10);
  const active = data.sprints.find((s) => s.state === "ACTIVE");
  const sprintTasks = active ? data.tasks.filter((t) => t.sprintId === active.id).map((t) => ({ points: t.points, completedAt: t.completedAt })) : [];
  const bars = velocity(data.sprints);
  const average = averageVelocity(bars);

  return (
    <div className="space-y-8">
      <section aria-labelledby="burndown" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="burndown" className="text-lg font-semibold">
          Burndown{active ? `: ${active.name}` : ""}
        </h2>
        {active ? (
          <>
            <p className="mt-1 text-sm text-muted">
              {totalPoints(sprintTasks) - completedPoints(sprintTasks)} of {totalPoints(sprintTasks)} points still open. The dashed line is the pace that finishes exactly on the last day.
            </p>
            <div className="mt-4">
              <BurndownChart points={burndown(active, sprintTasks, today)} sprintName={active.name} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-muted">There is no active sprint. Start one on the Backlog and sprints tab to see its burndown.</p>
        )}
      </section>

      <section aria-labelledby="velocity" className="rounded-2xl border border-border bg-surface p-5">
        <h2 id="velocity" className="text-lg font-semibold">
          Velocity
        </h2>
        {bars.length > 0 ? (
          <>
            <p className="mt-1 text-sm text-muted">
              Points committed against points delivered in finished sprints. Average delivered: <span className="font-semibold text-foreground">{average} points</span> per sprint.
            </p>
            <div className="mt-4">
              <VelocityChart bars={bars} />
            </div>
          </>
        ) : (
          <p className="mt-2 text-muted">Complete a sprint to start building a velocity history.</p>
        )}
      </section>
    </div>
  );
}
