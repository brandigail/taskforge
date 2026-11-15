import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { moveTask } from "@/lib/server/tasks";
import { moveTaskSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/tasks/[id]/move">) {
  try {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const input = await readBody(request, moveTaskSchema);
    return Response.json({ task: await moveTask(actor, id, input) });
  } catch (error) {
    return toResponse(error);
  }
}
