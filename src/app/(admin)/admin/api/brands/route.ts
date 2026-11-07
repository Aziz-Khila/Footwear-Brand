import { z } from "zod";
import { studio } from "@/admin/server/http";
import { activateBrand, createBrand, deleteBrand, getActiveId } from "@/admin/server/store";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(1) }),
  z.object({ action: z.literal("activate"), id: z.string() }),
  z.object({ action: z.literal("delete"), id: z.string() }),
]);

export function POST(req: Request) {
  return studio(async () => {
    const body = Body.parse(await req.json());
    if (body.action === "create") return { activeId: await createBrand(body.name, await getActiveId()) };
    if (body.action === "activate") await activateBrand(body.id);
    if (body.action === "delete") await deleteBrand(body.id);
    return { activeId: await getActiveId() };
  });
}
