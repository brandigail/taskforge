import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { CreateProjectForm } from "@/features/projects/CreateProjectForm";
import { can } from "@/lib/permissions";
import { listProjects } from "@/lib/server/projects";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requireUser("/projects");
  const projects = await listProjects();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Projects</h1>
          {can(user.role, "project:create") && <CreateProjectForm />}
        </div>

        {projects.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-border bg-surface p-6 text-muted">No projects yet. {can(user.role, "project:create") ? "Create the first one." : "Ask a manager to create one."}</p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {projects.map((p) => {
              const percent = p.taskCount === 0 ? 0 : Math.round((p.doneCount / p.taskCount) * 100);
              return (
                <li key={p.id} className="relative rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-muted">
                  <p className="font-mono text-xs font-semibold text-accent">{p.key}</p>
                  <h2 className="mt-1 text-lg font-semibold">
                    <Link href={`/projects/${p.key}/board`} className="after:absolute after:inset-0">
                      {p.name}
                    </Link>
                  </h2>
                  {p.description && <p className="mt-1 text-sm text-muted">{p.description}</p>}
                  <p className="mt-3 text-sm text-muted">
                    {p.doneCount} of {p.taskCount} tasks done{p.activeSprintName ? ` · ${p.activeSprintName} is active` : ""}
                  </p>
                  <div role="progressbar" aria-label={`${p.name} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
