# Floor Plan Studio

Browser-based interior floor plan editor. Upload a plan photo, auto-detect walls with OpenCV.js, refine them with snap-enabled drawing tools, add doors and windows, and preview an extruded 3D model with Three.js.

## Features

- **Upload floor plan images** (JPG, PNG) as a tracing background
- **Scale calibration** from a known wall length
- **Wall tool** with endpoint/midpoint/grid snap, orthogonal constraint (Shift), and typed lengths (Enter)
- **Doors and windows** placed on walls with editable dimensions
- **Indoor furniture** (counter, sink, toilet, sofa, table, chairs, range, fridge) with editable dimensions
- **Outdoor landscape** (trees, shrubs, beds, patio, path, lawn, pool) with editable dimensions
- **Live 3D preview** with mitered wall corners and opening cuts
- **Project persistence** in browser IndexedDB or Supabase (when logged in)
- **Google OAuth login** (Supabase Auth)
- **Projects page** for account-level project management

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Workflow

1. **Upload plan** — click *Upload plan* in the top action bar
2. **Set scale** — select the Scale tool, click two points on a wall with a known length, enter the real-world measurement
3. **Draw walls** — use the Wall tool; hold Shift for 45°/90° constraints; type a length and press Enter to fix the endpoint
4. **Add openings** — Door/Window tools: click on a wall
5. **Place furniture & landscape** — pick an item in the left sidebar, then click the canvas
6. **Edit dimensions** — select any item; the Properties panel shows width, depth, and height
7. **3D preview** — updates automatically in the right panel

Uploaded plan images are hidden by default. Turn on *Show image* in the action bar if you want the photo visible while tracing.

## Supabase setup (Google OAuth + cloud projects)

Create a Supabase project and configure these Vite env vars:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

Then create the `projects` table in Supabase SQL editor:

```sql
create table if not exists public.projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now(),
  plan_json jsonb not null
);

alter table public.projects enable row level security;

create policy "users can read own projects"
on public.projects for select
using (auth.uid() = user_id);

create policy "users can insert own projects"
on public.projects for insert
with check (auth.uid() = user_id);

create policy "users can update own projects"
on public.projects for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own projects"
on public.projects for delete
using (auth.uid() = user_id);
```

In Supabase Auth settings, enable **Google** provider and add your Vercel URL as an allowed redirect URL.

## Stack

- React 19 + TypeScript + Vite
- react-konva (2D editor)
- Zustand (state + autosave)
- Supabase (Auth + Postgres JSON storage)
- OpenCV.js (lazy-loaded from CDN for tracing)
- Three.js + React Three Fiber (3D viewer)

## Deploy

Static SPA (Vite → `dist/`). Production build:

```bash
npm run build
```

### Vercel

**Project:** [floorplan-studio](https://vercel.com/annies-projects-cc2c2b72/floorplan-studio) (`annies-projects-cc2c2b72`)

**Repository:** [helloanniezhou/floorplan-studio](https://github.com/helloanniezhou/floorplan-studio) — `main` has the latest app code.

If the project shows **Connect Git** (no production deployment yet):

1. Open [Git settings](https://vercel.com/annies-projects-cc2c2b72/floorplan-studio/settings/git) for the project.
2. Connect **GitHub** and select `helloanniezhou/floorplan-studio`.
3. Set **Production Branch** to `main`.
4. Confirm build settings: framework **Vite**, command `npm run build`, output `dist` (`vercel.json` handles SPA routing).
5. Save — Vercel runs the first production deploy from `main`.

After Git is connected, every push to `main` triggers a new production deployment automatically.

## Limitations (v1)

- OpenCV detection works best on high-contrast line drawings; photos may need manual cleanup
- Cloud sync requires Supabase env vars and auth setup
- No PDF/SVG export yet
- 3D uses simplified opening cuts (not full CSG)

## License

MIT
