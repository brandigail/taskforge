import { requireActor } from "@/lib/server/actor";
import { ApiError, toResponse } from "@/lib/server/guard";
import { completeSprint, startSprint } from "@/lib/server/sprints";

export const dynamic = "force-dynamic";

/** POST /api/sprints/:id/start or /api/sprints/:id/complete */
export async function POST(_request: Request, ctx: RouteContext<"/api/sprints/[id]/[action]">) {
  try {
    const actor = await requireActor();
    const { id, action } = await ctx.params;
    if (action === "start") return Response.json({ sprint: await startSprint(actor, id) });
    if (action === "complete") return Response.json({ sprint: await completeSprint(actor, id) });
    throw new ApiError(404, "Not found");
  } catch (error) {
    return toResponse(error);
  }
}
