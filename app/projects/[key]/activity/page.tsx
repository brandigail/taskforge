import type { Metadata } from "next";
import { listActivity } from "@/lib/server/activity";
import { projectByKey } from "@/lib/server/guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC";
}

export default async function ActivityPage({ params }: PageProps<"/projects/[key]/activity">) {
  const { key } = await params;
  const project = await projectByKey(key);
  const entries = await listActivity(project.id);

  return (
    <section aria-labelledby="activity">
      <h2 id="activity" className="text-lg font-semibold">
        Activity
      </h2>
      <p className="text-sm text-muted">Every change in this project, written by one server helper so the log can&apos;t drift from what happened.</p>
      {entries.length === 0 ? (
        <p className="mt-4 text-muted">Nothing has happened yet.</p>
      ) : (
        <ol className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {entries.map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5 p-3 sm:flex-row sm:items-baseline sm:gap-3">
              <time dateTime={e.at} className="w-44 shrink-0 text-xs tabular-nums text-muted">
                {when(e.at)}
              </time>
              <p>
                <span className="font-semibold">{e.actorName}</span> {e.summary}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
