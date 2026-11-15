import { createColumn } from "@/lib/server/columns";
import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { createColumnSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/projects/[key]/columns">) {
  try {
    const actor = await requireActor();
    const { key } = await ctx.params;
    const input = await readBody(request, createColumnSchema);
    return Response.json({ column: await createColumn(actor, key, input) }, { status: 201 });
  } catch (error) {
    return toResponse(error);
  }
}
