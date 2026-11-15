import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/ProjectTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { ApiError, projectByKey } from "@/lib/server/guard";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[key]">) {
  const { key } = await params;
  await requireUser(`/projects/${key}/board`);
  const project = await projectByKey(key).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <>
      <SiteHeader />
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <p className="text-sm text-muted">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>{" "}
            / <span className="font-mono">{project.key}</span>
          </p>
          <h1 className="text-xl font-bold">{project.name}</h1>
          <div className="mt-2">
            <ProjectTabs projectKey={project.key} />
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
