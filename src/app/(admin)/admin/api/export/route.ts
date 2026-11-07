import { spawn } from "node:child_process";
import { resolve, sep } from "node:path";
import { z } from "zod";
import { exportBrand } from "@/admin/server/export";
import { studio } from "@/admin/server/http";
import { EXPORTS_DIR } from "@/admin/server/paths";
import { getActiveId } from "@/admin/server/store";

export function POST() {
  return studio(async () => exportBrand(await getActiveId()));
}

const Open = z.object({ path: z.string() });

/** Opens an exported project in the OS file manager. Only paths inside exports/ are accepted. */
export function PUT(req: Request) {
  return studio(async () => {
    const target = resolve(Open.parse(await req.json()).path);
    if (!target.startsWith(EXPORTS_DIR + sep)) throw new Error("Only exported projects can be opened.");
    const cmd = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(cmd, [target], { detached: true, stdio: "ignore" }).unref();
    return { ok: true };
  });
}
