import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { BrandSchema, ProductsSchema, type BrandConfig, type ProductImage } from "@/lib/schema";
import { EXPORTS_DIR, ROOT, brandAssetsDir } from "./paths";
import { readBrand, slugify } from "./store";

const run = promisify(execFile);

/** Template paths that only exist for the studio and never ship with a brand. */
const STUDIO_ONLY = [
  path.join("src", "app", "(admin)"),
  path.join("src", "admin"),
  path.join("src", "brand"),
  path.join("public", "brand"),
];

const ROOT_FILES = ["next.config.ts", "tsconfig.json", "eslint.config.mjs", "package-lock.json"];

const STUDIO_DEPENDENCIES = ["onnxruntime-node", "sharp"];

const FONT_IMPORTS: Record<string, { name: string; weight?: string[] }> = {
  geist: { name: "Geist" },
  inter: { name: "Inter" },
  "inter-tight": { name: "Inter_Tight" },
  "space-grotesk": { name: "Space_Grotesk" },
  manrope: { name: "Manrope" },
  "dm-sans": { name: "DM_Sans" },
  archivo: { name: "Archivo" },
  syne: { name: "Syne" },
  unbounded: { name: "Unbounded" },
  "bricolage-grotesque": { name: "Bricolage_Grotesque" },
  "geist-mono": { name: "Geist_Mono" },
  "jetbrains-mono": { name: "JetBrains_Mono" },
  "ibm-plex-mono": { name: "IBM_Plex_Mono", weight: ["400", "500"] },
  "space-mono": { name: "Space_Mono", weight: ["400", "700"] },
  "dm-mono": { name: "DM_Mono", weight: ["400", "500"] },
};

export type ExportResult = {
  path: string;
  files: number;
  git: "committed" | "nothing-to-commit" | "staged" | "unavailable";
  commit?: string;
  warnings: string[];
};

function fontsModule(brand: BrandConfig) {
  const sans = FONT_IMPORTS[brand.theme.sans];
  const mono = FONT_IMPORTS[brand.theme.mono];
  const opts = (f: { weight?: string[] }, variable: string) =>
    `{ subsets: ["latin"],${f.weight ? ` weight: ${JSON.stringify(f.weight)},` : ""} variable: "${variable}" }`;
  return `import { ${sans.name}, ${mono.name} } from "next/font/google";

// ${brand.name} ships with exactly one sans and one mono font, chosen in the brand studio.
const sans = ${sans.name}(${opts(sans, "--font-brand-sans")});
const mono = ${mono.name}(${opts(mono, "--font-brand-mono")});

export function fontClasses() {
  return \`\${sans.variable} \${mono.variable}\`;
}
`;
}

const gitignore = `# dependencies
/node_modules

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem
npm-debug.log*

# env files
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;

function readme(brand: BrandConfig, productCount: number) {
  return `# ${brand.name}

${brand.tagline}

The ${brand.name} storefront: a showroom wall of ${productCount} pairs with a product page,
size picker and bag. Built with Next.js, Tailwind CSS and Motion.

## Run it

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open http://localhost:3000.

## Where things live

| What | Where |
| --- | --- |
| Name, theme colours, fonts, labels, currency, sizes | \`src/brand/brand.json\` |
| Products (name, price, sizes sold out, description) | \`src/brand/products.json\` |
| Logo and product images | \`public/brand/\` |

Product images are transparent PNGs, side profile with the toe pointing left. Each
product's \`scale\` sets how wide the shoe sits on its shelf.

## Deploy

Push this repository to GitHub and import it on [Vercel](https://vercel.com/new), or run
\`npm run build && npm start\` on any Node.js host.

Checkout is not connected yet: the bag works, and the checkout button shows a notice.
`;
}

async function countFiles(dir: string): Promise<number> {
  let n = 0;
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    n += e.isDirectory() ? await countFiles(path.join(dir, e.name)) : 1;
  }
  return n;
}

/** Writes a standalone storefront for one brand to exports/<brand-slug>/, ready to push to GitHub. */
export async function exportBrand(id: string): Promise<ExportResult> {
  const data = await readBrand(id);
  const brand = BrandSchema.parse(data.brand);
  const products = ProductsSchema.parse(data.products);
  const warnings: string[] = [];

  const slug = slugify(brand.name);
  const dest = path.join(EXPORTS_DIR, slug);
  await fs.mkdir(dest, { recursive: true });

  // Re-exports keep the repository history so changes can be committed on top
  for (const entry of await fs.readdir(dest)) {
    if (entry !== ".git") await fs.rm(path.join(dest, entry), { recursive: true, force: true });
  }

  // The studio copies the template itself, so whole-project file access is intended here
  const skip = STUDIO_ONLY.map((p) => path.join(/*turbopackIgnore: true*/ ROOT, p));
  const filter = (src: string) => !skip.some((s) => src === s || src.startsWith(s + path.sep));
  await fs.cp(path.join(ROOT, "src"), path.join(dest, "src"), { recursive: true, filter });
  await fs.cp(path.join(ROOT, "public"), path.join(dest, "public"), { recursive: true, filter });
  for (const f of ROOT_FILES) {
    await fs.copyFile(path.join(/*turbopackIgnore: true*/ ROOT, f), path.join(/*turbopackIgnore: true*/ dest, f));
  }

  await fs.mkdir(path.join(dest, "src", "brand"), { recursive: true });
  await fs.writeFile(path.join(dest, "src", "brand", "brand.json"), JSON.stringify(brand, null, 2) + "\n");
  const forSite = (img: ProductImage): ProductImage => {
    const rest = { ...img };
    delete rest.mirrorOf;
    return rest;
  };
  const shipped = products.map((p) => ({ ...p, image: forSite(p.image), gallery: p.gallery.map(forSite) }));
  await fs.writeFile(path.join(dest, "src", "brand", "products.json"), JSON.stringify(shipped, null, 2) + "\n");

  const images = shipped.flatMap((p) => [p.image.file, ...p.gallery.map((g) => g.file)]);
  const assets = new Set([...images, brand.logo, brand.favicon].filter(Boolean) as string[]);
  await fs.mkdir(path.join(dest, "public", "brand"), { recursive: true });
  for (const file of assets) {
    try {
      await fs.copyFile(path.join(brandAssetsDir(id), file), path.join(dest, "public", "brand", file));
    } catch {
      warnings.push(`Missing image: ${file}`);
    }
  }

  await fs.writeFile(path.join(dest, "src", "lib", "fonts.ts"), fontsModule(brand));
  await fs.writeFile(path.join(dest, ".gitignore"), gitignore);
  await fs.writeFile(path.join(dest, "README.md"), readme(brand, products.length));

  const pkg = JSON.parse(await fs.readFile(path.join(ROOT, "package.json"), "utf8"));
  pkg.name = slug;
  pkg.version = "1.0.0";
  for (const dep of STUDIO_DEPENDENCIES) delete pkg.dependencies?.[dep];
  await fs.writeFile(path.join(dest, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

  try {
    await run("npm", ["install", "--package-lock-only", "--ignore-scripts", "--no-audit", "--no-fund"], {
      cwd: dest,
      shell: true,
      timeout: 180_000,
    });
  } catch {
    await fs.rm(path.join(dest, "package-lock.json"), { force: true });
    warnings.push("Couldn't refresh package-lock.json (offline?). It will be created on the first npm install.");
  }

  const result: ExportResult = { path: dest, files: await countFiles(dest), git: "unavailable", warnings };

  try {
    const git = (...args: string[]) => run("git", args, { cwd: dest });
    const fresh = !(await fs.stat(path.join(dest, ".git")).catch(() => null));
    if (fresh) await git("init", "-b", "main");
    await git("add", "-A");
    const { stdout } = await git("status", "--porcelain");
    if (!stdout.trim()) {
      result.git = "nothing-to-commit";
    } else {
      const message = fresh ? `Initial ${brand.name} storefront` : `Update ${brand.name} storefront`;
      try {
        await git("commit", "-m", message);
        result.git = "committed";
        result.commit = message;
      } catch {
        result.git = "staged";
        warnings.push("Files are staged but not committed: set git user.name and user.email, then commit.");
      }
    }
  } catch {
    warnings.push("Git isn't available, so the folder wasn't initialised as a repository.");
  }

  return result;
}
