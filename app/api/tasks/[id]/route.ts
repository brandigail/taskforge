import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { deleteTask, updateTask } from "@/lib/server/tasks";
import { updateTaskSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const patch = await readBody(request, updateTaskSchema);
    return Response.json({ task: await updateTask(actor, id, patch) });
  } catch (error) {
    return toResponse(error);
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  try {
    const actor = await requireActor();
    const { id } = await ctx.params;
    await deleteTask(actor, id);
    return Response.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
