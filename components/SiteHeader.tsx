import { Hammer } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/features/auth/actions";
import { ROLE_LABEL } from "@/lib/permissions";
import { getSessionUser } from "@/lib/session";
import { ThemeToggle } from "./ThemeToggle";

export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/projects" className="flex items-center gap-2 text-lg font-bold">
          <Hammer className="size-6 text-accent" aria-hidden />
          TaskForge
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          {user ? (
            <form action={signOutAction} className="flex items-center gap-2">
              <span className="hidden text-muted sm:inline">
                {user.name} <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">{ROLE_LABEL[user.role]}</span>
              </span>
              <button type="submit" className="min-h-10 rounded-lg border border-border px-3 font-medium hover:bg-surface-muted">
                Sign out
              </button>
            </form>
          ) : (
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-lg bg-accent px-4 font-medium text-white hover:bg-accent-strong dark:text-[#0c1020]">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
