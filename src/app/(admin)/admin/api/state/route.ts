import { studio } from "@/admin/server/http";
import { modelReady } from "@/admin/server/image";
import { getActiveId, listBrands, readBrand } from "@/admin/server/store";

export function GET() {
  return studio(async () => {
    const activeId = await getActiveId();
    const [brands, { brand, products }, ready] = await Promise.all([listBrands(), readBrand(activeId), modelReady()]);
    return { activeId, brands, brand, products, modelReady: ready };
  });
}
