import fs from "node:fs/promises";
import path from "node:path";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import { scaleForAspect } from "@/lib/scale";
import { MODEL_DIR } from "./paths";

/** IS-Net general-use segmentation model (the same one rembg ships), downloaded on first use. */
const MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx";
const MODEL_PATH = path.join(MODEL_DIR, "isnet-general-use.onnx");
const INPUT = 1024;
const MEAN = [0.485, 0.456, 0.406];
const MAX_SOURCE = 2400;
const MAX_OUTPUT_WIDTH = 1400;
const PAD = 12;

let session: Promise<ort.InferenceSession> | null = null;

async function ensureModel() {
  try {
    await fs.access(MODEL_PATH);
    return;
  } catch {}
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const res = await fetch(MODEL_URL);
  if (!res.ok) throw new Error(`Couldn't download the background-removal model (HTTP ${res.status}).`);
  const tmp = `${MODEL_PATH}.download`;
  await fs.writeFile(tmp, Buffer.from(await res.arrayBuffer()));
  await fs.rename(tmp, MODEL_PATH);
}

function getSession() {
  session ??= ensureModel()
    .then(() => ort.InferenceSession.create(MODEL_PATH))
    .catch((err) => {
      session = null;
      throw err;
    });
  return session;
}

export async function modelReady() {
  try {
    await fs.access(MODEL_PATH);
    return true;
  } catch {
    return false;
  }
}

export type ProcessedShoe = {
  png: Buffer;
  width: number;
  height: number;
  scale: number;
  view: "side" | "angle";
  /** Which way the toe points, for side views */
  facing?: "left" | "right";
  /** How much the cutout looks like a clean side profile (higher = more wall-ready) */
  sideScore: number;
};

/**
 * Side profiles stand on one flat sole line and get steadily taller from toe to heel.
 * Pairs and three-quarter shots break both: the sole line steps, and the silhouette
 * dips between the two shoes. Measured on the cropped alpha mask.
 */
function classifyView(alpha: Uint8Array | Buffer, W: number, x0: number, y0: number, w: number, h: number) {
  const bottom = new Float32Array(w);
  const thick = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    let low = -1;
    let count = 0;
    for (let y = 0; y < h; y++) {
      if (alpha[(y0 + y) * W + x0 + x] > 128) {
        low = y;
        count++;
      }
    }
    bottom[x] = low < 0 ? 1 : (h - 1 - low) / h;
    thick[x] = count / h;
  }

  // Envelope over ~6% windows so the gaps between studs or a raised arch don't count as steps
  const win = Math.max(3, Math.round(w * 0.06));
  let flatCols = 0;
  let coreCols = 0;
  for (let x = Math.round(w * 0.05); x < Math.round(w * 0.95); x++) {
    let lowest = 1;
    for (let k = Math.max(0, x - win); k <= Math.min(w - 1, x + win); k++) lowest = Math.min(lowest, bottom[k]);
    coreCols++;
    if (lowest < 0.06) flatCols++;
  }
  const flat = coreCols ? flatCols / coreCols : 0;

  // Smoothed thickness at five stations; "trapped" = depth of the deepest valley between taller columns
  const at = (f: number) => {
    const c = Math.round(w * f);
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, c - win); k <= Math.min(w - 1, c + win); k++, n++) sum += thick[k];
    return sum / n;
  };
  const q = [0.15, 0.35, 0.5, 0.65, 0.85].map(at);
  let trapped = 0;
  for (let i = 1; i < q.length - 1; i++) {
    const wall = Math.min(Math.max(...q.slice(0, i)), Math.max(...q.slice(i + 1)));
    trapped = Math.max(trapped, wall - q[i]);
  }

  // Measured: sneaker side views ≈ 0.9, studded cleats ≈ 0.55–0.65, pair / three-quarter shots ≈ 0.4
  const sideScore = Math.round((flat - 2 * trapped) * 100) / 100;
  return { view: sideScore >= 0.47 ? ("side" as const) : ("angle" as const), sideScore };
}

/**
 * Turns any product photo into a wall-ready cutout: background removed, edge colour
 * decontaminated, cropped tight with even padding, and mirrored so the toe points left.
 */
export async function processShoePhoto(input: Buffer): Promise<ProcessedShoe> {
  const { data: rgb, info } = await sharp(input, { failOn: "none" })
    .rotate()
    .resize(MAX_SOURCE, MAX_SOURCE, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;

  // 1. Segment
  const small = await sharp(rgb, { raw: { width: W, height: H, channels: 3 } })
    .resize(INPUT, INPUT, { fit: "fill", kernel: "lanczos3" })
    .raw()
    .toBuffer();
  let peak = 1;
  for (let i = 0; i < small.length; i++) if (small[i] > peak) peak = small[i];
  const plane = INPUT * INPUT;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) tensor[c * plane + i] = small[i * 3 + c] / peak - MEAN[c];
  }
  const s = await getSession();
  const out = await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", tensor, [1, 3, INPUT, INPUT]) });
  const pred = out[s.outputNames[0]].data as Float32Array;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < plane; i++) {
    if (pred[i] < lo) lo = pred[i];
    if (pred[i] > hi) hi = pred[i];
  }
  const mask = new Uint8Array(plane);
  const range = hi - lo || 1;
  for (let i = 0; i < plane; i++) mask[i] = Math.round(((pred[i] - lo) / range) * 255);
  // sharp widens greyscale to sRGB on output unless told otherwise; keep exactly one byte per pixel
  const alpha = await sharp(mask, { raw: { width: INPUT, height: INPUT, channels: 1 } })
    .resize(W, H, { fit: "fill", kernel: "lanczos3" })
    .extractChannel(0)
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  if (alpha.length !== N || rgb.length !== N * 3) throw new Error("Unexpected image layout while cutting out the photo.");

  // 2. Clean alpha, estimate the backdrop colour, find the bounding box
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgN = 0;
  let minX = W;
  let minY = H;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < N; i++) {
    let a = alpha[i];
    if (a < 12) a = 0;
    else if (a > 243) a = 255;
    alpha[i] = a;
    if (a === 0) {
      bgR += rgb[i * 3];
      bgG += rgb[i * 3 + 1];
      bgB += rgb[i * 3 + 2];
      bgN++;
    } else if (a > 24) {
      const x = i % W;
      const y = (i / W) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("No shoe found in this photo. Try a shot with a plainer background.");
  const bg = bgN ? [bgR / bgN, bgG / bgN, bgB / bgN] : [255, 255, 255];

  // 3. RGBA with the backdrop un-blended from soft edges, so white studio light doesn't halo on a dark wall
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    const a = alpha[i];
    for (let c = 0; c < 3; c++) {
      const v = rgb[i * 3 + c];
      rgba[i * 4 + c] =
        a > 0 && a < 250 ? Math.max(0, Math.min(255, Math.round((v - (1 - a / 255) * bg[c]) / (a / 255)))) : v;
    }
    rgba[i * 4 + 3] = a;
  }

  // 4. Orientation: the collar/heel is the tall end, so more mass in the top band = heel side
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const bandBottom = minY + Math.round(bh * 0.45);
  const midX = minX + bw / 2;
  let left = 0;
  let right = 0;
  for (let y = minY; y < bandBottom; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = alpha[y * W + x];
      if (x < midX) left += a;
      else right += a;
    }
  }
  // Photos keep the photographer's framing (mirroring would reverse logos and text). The studio
  // only mirrors a side view when it becomes the wall photo and points the wrong way.
  const { view, sideScore } = classifyView(alpha, W, minX, minY, bw, bh);
  const facing = view === "side" ? (left > right * 1.08 ? ("right" as const) : ("left" as const)) : undefined;

  // 5. Crop, mirror, pad, cap the size
  const cropped = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .png()
    .toBuffer();
  const targetW = Math.min(MAX_OUTPUT_WIDTH - PAD * 2, bw);
  const { data: png, info: outInfo } = await sharp(cropped)
    .resize({ width: targetW, kernel: "lanczos3" })
    .extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer({ resolveWithObject: true });

  return {
    png,
    width: outInfo.width,
    height: outInfo.height,
    scale: scaleForAspect(bw / bh),
    view,
    facing,
    sideScore,
  };
}

export async function flipImage(input: Buffer) {
  const { data, info } = await sharp(input).flop().png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
  return { png: data, width: info.width, height: info.height };
}

/**
 * If every corner is the same opaque colour, treat it as a backdrop and turn it transparent,
 * un-blending anti-aliased edges (a white mark on black becomes a clean white mark).
 */
function keyOutBackdrop(px: Buffer, width: number, height: number): Buffer | null {
  const at = (x: number, y: number) => (y * width + x) * 4;
  const corners = [at(1, 1), at(width - 2, 1), at(1, height - 2), at(width - 2, height - 2)];
  if (corners.some((i) => px[i + 3] < 250)) return null;
  const bg = [0, 1, 2].map((c) => corners.reduce((s, i) => s + px[i + c], 0) / 4);
  if (corners.some((i) => [0, 1, 2].some((c) => Math.abs(px[i + c] - bg[c]) > 24))) return null;

  const span = bg.map((b) => Math.max(b, 255 - b) || 1);
  const out = Buffer.from(px);
  for (let i = 0; i < out.length; i += 4) {
    let a = 0;
    for (let c = 0; c < 3; c++) a = Math.max(a, Math.abs(px[i + c] - bg[c]) / span[c]);
    a = a < 0.04 ? 0 : Math.min(1, (a - 0.04) / 0.96);
    for (let c = 0; c < 3; c++) {
      out[i + c] = a > 0 ? Math.max(0, Math.min(255, Math.round(bg[c] + (px[i + c] - bg[c]) / a))) : 0;
    }
    out[i + 3] = Math.round(a * px[i + 3]);
  }
  return out;
}

/** Raster logos are capped in size; a solid logo backdrop is removed. Favicons keep theirs. */
export async function normalizeLogo(input: Buffer, mime: string, kind: "logo" | "favicon") {
  if (mime === "image/svg+xml") return { data: input, ext: "svg" };
  const resized = sharp(input).resize(800, 800, { fit: "inside", withoutEnlargement: true });
  if (kind === "logo") {
    const { data, info } = await resized.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const keyed = keyOutBackdrop(data, info.width, info.height);
    if (keyed) {
      const png = await sharp(keyed, { raw: { width: info.width, height: info.height, channels: 4 } })
        .png()
        .toBuffer();
      const trimmed = await sharp(png).trim().png({ compressionLevel: 9 }).toBuffer();
      return { data: trimmed, ext: "png" };
    }
  }
  return { data: await resized.png({ compressionLevel: 9 }).toBuffer(), ext: "png" };
}
