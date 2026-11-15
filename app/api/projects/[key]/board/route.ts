import { requireActor } from "@/lib/server/actor";
import { toResponse } from "@/lib/server/guard";
import { loadBoard } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

/** The whole board as JSON, used by the client to resync after changes that touch many rows. */
export async function GET(_request: Request, ctx: RouteContext<"/api/projects/[key]/board">) {
  try {
    await requireActor();
    const { key } = await ctx.params;
    return Response.json(await loadBoard(key));
  } catch (error) {
    return toResponse(error);
  }
}
