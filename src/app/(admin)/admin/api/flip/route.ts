import { z } from "zod";
import { studio } from "@/admin/server/http";
import { flipImage } from "@/admin/server/image";
import { assetName, getActiveId, readAsset, saveAsset } from "@/admin/server/store";

const Body = z.object({ file: z.string().min(1) });

export function POST(req: Request) {
  return studio(async () => {
    const { file } = Body.parse(await req.json());
    const id = await getActiveId();
    const flipped = await flipImage(await readAsset(id, file));
    const name = assetName("shoe", "png");
    await saveAsset(id, name, flipped.png);
    return { file: name, width: flipped.width, height: flipped.height };
  });
}
