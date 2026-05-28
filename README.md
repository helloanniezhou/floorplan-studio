# Dreamore

**Turn a photo or sketch into a measured floor plan — in your browser, in minutes.**

Upload a plan image, trace walls with snap-to-grid tools, drop in doors, furniture, and landscape, design a separate roof layout and lighting, then spin up a live 3D preview. No install. No CAD degree.

---

## Why it exists

Most floor plan tools are either too heavy (full CAD) or too dumb (static image markup). Dreamore sits in the middle: **fast enough for real projects**, **visual enough to feel the space**, and **light enough to run entirely in the browser**.

Built for homeowners, interior designers, and anyone who needs a quick, editable layout — not a construction document set.

---

## What you can do

| | |
|---|---|
| 📐 **Trace over any plan** | Upload JPG/PNG, set scale from a known wall, draw on top |
| 🧱 **Walls that behave** | Snap to grid & corners, Shift for 90°, type exact lengths |
| 🚪 **Doors & windows** | Place on walls, edit width, swing, sill height |
| 🏠 **Roof plan** | Separate 2D layout from the first floor, with ghost overlay for alignment |
| 💡 **Lighting** | Place ceiling, pendant, recessed, wall, and outdoor fixtures; preview in 3D |
| 🛋️ **Furniture & yard** | Counters, beds, trees, patios — resize and rotate in Properties |
| 🏡 **Lot boundary** | Set property dimensions and see the outline on canvas |
| 🌅 **Sun & north** | Compass orientation and time-of-day lighting in 3D |
| 👁️ **Instant 3D** | Extruded walls with openings — double-click to orbit |
| ☁️ **Your projects, saved** | Browser storage by default; optional Google sign-in + cloud sync |

**Bonus:** optional OpenCV wall detection on uploaded images (best on clear line drawings).

---

## How it works

1. **Open a project** — start fresh or pick one from your Dreamore home screen  
2. **Upload a plan** — Settings → **Plan image** → upload & set scale  
3. **Draw the layout** — walls, openings, furniture from the left toolbar  
4. **Roof & lights** — switch to **Roof plan** for the roof outline; use **Lighting** for fixtures  
5. **Tune the plan** — lot size, grid spacing, and scale in **Properties** when nothing is selected  
6. **Preview in 3D** — one click, orbit around the model  

---

## Try it locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

Production build:

```bash
npm run build
```

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `V` | Select |
| `W` | Wall |
| `R` | Rectangle |
| `K` | Scale |
| `L` | Light |
| `⌘Z` / `⌘⇧Z` | Undo / Redo |

More tools are in the left sidebar with shortcut hints.

---

## Cloud save (optional)

Sign in with **Google** to sync projects to Supabase. Without an account, everything stays in **IndexedDB** in your browser.

### Quick Supabase setup

1. Copy env vars: `cp .env.example .env`  
2. Apply schema: `npm run db:push` (after `npx supabase link`)  
   — or run [`supabase/setup.sql`](supabase/setup.sql) in the SQL Editor  
3. Enable **Google** under Auth → Providers and add your redirect URLs  

Details: [Supabase API settings](https://supabase.com/dashboard/project/zqktwmikwmaicooawquc/settings/api) · [Auth providers](https://supabase.com/dashboard/project/zqktwmikwmaicooawquc/auth/providers)

---

## Stack

React 19 · TypeScript · Vite · react-konva · Zustand · Three.js · Supabase · OpenCV.js (tracing)

---

## Deploy

Static SPA → `dist/`. Works on Vercel out of the box (`vercel.json` included).

**Vercel environment variables** (required for cloud projects and Google sign-in — Vite bakes these in at build time):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL from [Supabase → Settings → API](https://supabase.com/dashboard/project/zqktwmikwmaicooawquc/settings/api) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Publishable** or **anon** key from the same page (not the service role key) |

1. Vercel → your project → **Settings** → **Environment Variables** → add both for **Production** (and **Preview** if you use preview URLs).
2. **Deployments** → ⋮ on latest → **Redeploy** (a new build is required after adding vars).
3. Supabase → **Authentication** → **URL configuration**: add `https://<your-vercel-domain>` to **Site URL** and **Redirect URLs** (same values you use for local dev, e.g. `http://localhost:5173`).

Optional: `VITE_GEMINI_API_KEY` for AI photo render in the 3D viewer.

Repo: [helloanniezhou/floorplan-studio](https://github.com/helloanniezhou/floorplan-studio)

---

## Roadmap / known limits (v1)

- Wall detection works best on high-contrast drawings; photos often need manual cleanup  
- PDF export covers the first-floor plan view  
- 3D uses simplified opening cuts (not full boolean CSG)  

---

## License

MIT

---

<p align="center">
  <strong>Made for people who want a floor plan, not a software project.</strong>
</p>
