import { studio } from "@/admin/server/http";
import { normalizeLogo, processShoePhoto } from "@/admin/server/image";
import { assetName, getActiveId, readBrand, saveAsset, saveBrand } from "@/admin/server/store";

const MAX_BYTES = 25 * 1024 * 1024;

export function POST(req: Request) {
  return studio(async () => {
    const form = await req.formData();
    const kind = form.get("kind");
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("No file received.");
    if (file.size > MAX_BYTES) throw new Error("That file is over 25 MB.");
    if (!file.type.startsWith("image/")) throw new Error("Please upload an image (JPG, PNG, WebP or SVG).");

    const id = await getActiveId();
    const input = Buffer.from(await file.arrayBuffer());

    if (kind === "shoe") {
      const shoe = await processShoePhoto(input);
      const name = assetName("shoe", "png");
      await saveAsset(id, name, shoe.png);
      return {
        file: name,
        width: shoe.width,
        height: shoe.height,
        scale: shoe.scale,
        view: shoe.view,
        facing: shoe.facing,
        sideScore: shoe.sideScore,
      };
    }

    if (kind === "logo" || kind === "favicon") {
      const { data, ext } = await normalizeLogo(input, file.type, kind);
      const name = assetName(kind, ext);
      await saveAsset(id, name, data);
      const { brand } = await readBrand(id);
      return { brand: await saveBrand(id, { ...brand, [kind]: name }) };
    }

    throw new Error(`Unknown upload kind: ${String(kind)}`);
  });
}
