import { connection } from "next/server";
import { ZodError } from "zod";

/**
 * Every studio endpoint goes through here: it only answers in `next dev`, so a production
 * build of the template never exposes file-writing routes, and errors come back as readable JSON.
 */
export async function studio(fn: () => Promise<unknown>): Promise<Response> {
  await connection();
  if (process.env.NODE_ENV !== "development") return new Response("Not found", { status: 404 });
  try {
    return Response.json(await fn());
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("\n")
        : err instanceof Error
          ? err.message
          : String(err);
    return Response.json({ error: message }, { status: 400 });
  }
}
