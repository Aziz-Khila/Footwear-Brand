# Sneaker Wall — brand template + studio

A showroom-wall sneaker storefront (Next.js, Tailwind, Motion) with a local **Brand Studio**
for re-skinning it per client and exporting a standalone project for each brand.

```bash
npm install
npm run dev
```

- Store: http://localhost:3000 — shows the brand currently on screen (the **concept** brand, STRYD, by default)
- Studio: http://localhost:3000/admin — only available under `npm run dev`

## Workflow for a new brand

1. In the studio, **+ New brand** (starts as a copy of the current one).
2. **Identity / Theme / Text / Shop settings**: name, logo, favicon, colours, lighting, fonts, labels,
   currency, sizes, shoes per row. Changes save automatically and show in the live preview.
3. **Products**: drop photos in. Each one is cut out locally (AI model, downloaded once to `.cache/`),
   turned to face left, trimmed and given a shelf scale. Then fill in name, price, sizes sold out,
   description, and drag to set the wall order.
4. **Export**: writes `exports/<brand>/`, a standalone storefront with only that brand (no studio),
   initialised as a git repo with a first commit. Push it to the client's GitHub.

Re-exporting the same brand keeps the repository and commits the changes on top.

## Where things live

| Path | What |
| --- | --- |
| `brands/<id>/` | Every brand's data: `brand.json`, `products.json`, `assets/` (source of truth) |
| `src/brand/`, `public/brand/` | The brand on screen, copied there by the studio |
| `src/app/(store)/`, `src/components/` | The storefront (this is what gets exported) |
| `src/app/(admin)/`, `src/admin/` | The studio (never exported) |

## Photo guidelines

Side profile, toe pointing left (the studio flips it if not), plain light background, soft even
light, the whole shoe in frame. Consistent photos make the wall and the zoom transition look right.
