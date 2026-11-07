import { studio } from "@/admin/server/http";
import { getActiveId, saveBrand } from "@/admin/server/store";

export function PUT(req: Request) {
  return studio(async () => ({ brand: await saveBrand(await getActiveId(), await req.json()) }));
}
