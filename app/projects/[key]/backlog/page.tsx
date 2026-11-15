import type { Metadata } from "next";
import { Backlog } from "@/features/backlog/Backlog";
import { BoardStoreProvider } from "@/features/board/BoardStoreProvider";
import { loadBoard } from "@/lib/server/projects";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Backlog and sprints" };

export default async function BacklogPage({ params }: PageProps<"/projects/[key]/backlog">) {
  const { key } = await params;
  const user = await requireUser(`/projects/${key}/backlog`);
  const data = await loadBoard(key);
  return (
    <BoardStoreProvider data={data} role={user.role} userId={user.id}>
      <Backlog />
    </BoardStoreProvider>
  );
}
