import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { createTask } from "@/lib/server/tasks";
import { createTaskSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[key]/tasks">) {
  try {
    const actor = await requireActor();
    const { key } = await ctx.params;
    const input = await readBody(request, createTaskSchema);
    return Response.json({ task: await createTask(actor, key, input) }, { status: 201 });
  } catch (error) {
    return toResponse(error);
  }
}
