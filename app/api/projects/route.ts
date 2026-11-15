import { requireActor } from "@/lib/server/actor";
import { readBody, toResponse } from "@/lib/server/guard";
import { createProject } from "@/lib/server/projects";
import { createProjectSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const input = await readBody(request, createProjectSchema);
    return Response.json({ project: await createProject(actor, input) }, { status: 201 });
  } catch (error) {
    return toResponse(error);
  }
}
