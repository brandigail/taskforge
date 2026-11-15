import { requireActor } from "@/lib/server/actor";
import { toResponse } from "@/lib/server/guard";
import { deleteProject } from "@/lib/server/projects";

export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/projects/[key]">) {
  try {
    const actor = await requireActor();
    const { key } = await ctx.params;
    await deleteProject(actor, key);
    return Response.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
