# Floor Plan Studio

Browser-based interior floor plan editor. Upload a plan photo, auto-detect walls with OpenCV.js, refine them with snap-enabled drawing tools, add doors and windows, and preview an extruded 3D model with Three.js.

## Features

- **Upload floor plan images** (JPG, PNG) as a tracing background
- **Semi-automatic wall detection** via OpenCV.js (Canny edges + Hough line transform)
- **Scale calibration** from a known wall length
- **Wall tool** with endpoint/midpoint/grid snap, orthogonal constraint (Shift), and typed lengths (Enter)
- **Doors and windows** placed on walls with editable dimensions
- **Live 3D preview** with mitered wall corners and opening cuts
- **Local persistence** (localStorage) plus JSON export/import

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Workflow

1. **Upload plan** — click *Upload plan* in the toolbar
2. **Set scale** — select the Scale tool, click two points on a wall with a known length, enter the real-world measurement
3. **Auto-detect** (optional) — tune OpenCV sliders and click *Run auto-detect*; click orange dashed lines to accept, right-click to dismiss
4. **Draw walls** — use the Wall tool; hold Shift for 45°/90° constraints; type a length and press Enter to fix the endpoint
5. **Add openings** — Door/Window tools: click on a wall
6. **3D preview** — updates automatically in the right panel

## Stack

- React 19 + TypeScript + Vite
- react-konva (2D editor)
- Zustand (state + localStorage)
- OpenCV.js (lazy-loaded from CDN for tracing)
- Three.js + React Three Fiber (3D viewer)

## Deploy

Static SPA (Vite → `dist/`). Production build:

```bash
npm run build
```

### Vercel (recommended)

1. Open [Import `helloanniezhou/floorplan-studio` on Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fhelloanniezhou%2Ffloorplan-studio).
2. Sign in with GitHub if prompted and confirm the repo.
3. Leave the defaults (Vite, build `npm run build`, output `dist`) — `vercel.json` already configures SPA routing.
4. Click **Deploy**. Future pushes to `main` redeploy automatically.

## Limitations (v1)

- OpenCV detection works best on high-contrast line drawings; photos may need manual cleanup
- Plans stay in the browser (no cloud sync)
- No PDF/SVG export yet
- 3D uses simplified opening cuts (not full CSG)

## License

MIT
