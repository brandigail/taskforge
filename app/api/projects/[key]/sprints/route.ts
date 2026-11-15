import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { createSprint } from "@/lib/server/sprints";
import { createSprintSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[key]/sprints">) {
  try {
    const actor = await requireActor();
    const { key } = await ctx.params;
    const input = await readBody(request, createSprintSchema);
    return Response.json({ sprint: await createSprint(actor, key, input) }, { status: 201 });
  } catch (error) {
    return toResponse(error);
  }
}
