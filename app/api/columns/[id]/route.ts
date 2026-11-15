import { z } from "zod";
import { deleteColumn, updateColumn } from "@/lib/server/columns";
import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { updateColumnSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({ moveTo: z.uuid().nullable().default(null) });

export async function PATCH(request: Request, ctx: RouteContext<"/api/columns/[id]">) {
  try {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const patch = await readBody(request, updateColumnSchema);
    return Response.json({ column: await updateColumn(actor, id, patch) });
  } catch (error) {
    return toResponse(error);
  }
}

/** Needs a body only when the column has cards: `{ "moveTo": "<column id>" }`. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/columns/[id]">) {
  try {
    const actor = await requireActor();
    const { id } = await ctx.params;
    const { moveTo } = request.headers.get("content-type")?.includes("application/json") ? await readBody(request, deleteSchema) : { moveTo: null };
    await deleteColumn(actor, id, moveTo);
    return Response.json({ ok: true });
  } catch (error) {
    return toResponse(error);
  }
}
