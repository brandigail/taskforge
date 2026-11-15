import type { Metadata } from "next";
import { Board } from "@/features/board/Board";
import { BoardStoreProvider } from "@/features/board/BoardStoreProvider";
import { loadBoard } from "@/lib/server/projects";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({ params }: PageProps<"/projects/[key]/board">) {
  const { key } = await params;
  const user = await requireUser(`/projects/${key}/board`);
  const data = await loadBoard(key);
  return (
    <BoardStoreProvider data={data} role={user.role} userId={user.id}>
      <Board />
    </BoardStoreProvider>
  );
}
