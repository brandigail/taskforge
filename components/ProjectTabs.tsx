"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "board", label: "Board" },
  { slug: "backlog", label: "Backlog and sprints" },
  { slug: "reports", label: "Reports" },
  { slug: "activity", label: "Activity" },
];

export function ProjectTabs({ projectKey }: { projectKey: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Project" className="-mb-px flex gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const href = `/projects/${projectKey}/${tab.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${active ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
