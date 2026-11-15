import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { LoginForm } from "@/features/auth/LoginForm";
import { getSessionUser } from "@/lib/session";
import { DEMO_PASSWORD } from "@/lib/demo";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const DEMOS = [
  { role: "Admin", label: "Ava Chen", email: "ava@demo.taskforge", blurb: "Everything, including deleting a project" },
  { role: "Manager", label: "Morgan Lee", email: "morgan@demo.taskforge", blurb: "Columns, sprints, assigning and deleting tasks" },
  { role: "Contributor", label: "Jules Okafor", email: "jules@demo.taskforge", blurb: "Create, edit and move tasks only" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawNext = typeof params.next === "string" ? params.next : "/projects";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/projects";
  if (await getSessionUser()) redirect(next);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">Plan the work. Ship the sprint.</h1>
        <p className="mt-2 text-muted">Boards, sprint planning and a full audit trail, with three roles enforced on the server.</p>
        <div className="mt-6">
          <LoginForm next={next} password={DEMO_PASSWORD} demos={DEMOS} />
        </div>
      </main>
    </>
  );
}
