import { studio } from "@/admin/server/http";
import { getActiveId, saveProducts } from "@/admin/server/store";

export function PUT(req: Request) {
  return studio(async () => ({ products: await saveProducts(await getActiveId(), await req.json()) }));
}
