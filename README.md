# F1 — Ultimate Cinema Edition

An original, cinematic motorsport web experience. It is a single-page React + Three.js
application: an opening film, an interactive procedural open-wheel car, an engineering
laboratory, a scroll-driven story, a playable browser racing simulation, a Grand Prix
race simulator, a telemetry command centre, a circuit atlas, a race-weekend board, a
Formula One history timeline, a driver explorer with the full 2026 team grid, a pit-stop
simulator and an editorial gallery.

Everything runs from local assets. No CDN, no API key and no network call is required
at runtime.

---

## Requirements

- Node.js 20 or newer (built and tested on **v24.22.0**).
- A modern browser with WebGL 2 for the 3D scenes. The site degrades gracefully
  without WebGL (see *Graceful degradation*).

The commands below assume Node is on your `PATH`. If you use a portable Node install,
prepend it to `PATH` first, for example:

```powershell
$env:Path = "C:\path\to\node;$env:Path"
npm.cmd install
```

## Quick start

```bash
npm install        # install dependencies
npm run dev        # start the dev server on http://127.0.0.1:5173/
npm run build      # type-check and produce a production build in dist/
npm run preview    # serve the production build on http://127.0.0.1:4173/
```

The production build has to be **served**, not opened as a file: browsers block
ES-module scripts over `file://`, so double-clicking `dist/index.html` shows a blank
page. Use `npm run preview`, or on Windows run `serve.cmd`, which starts a
dependency-free static server for `dist/` and opens the browser for you.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot module replacement. |
| `npm run build` | `tsc --noEmit` followed by `vite build` into `dist/`. |
| `npm run preview` | Serves the built `dist/` for a production check. |
| `npm run typecheck` | Type-checks without emitting. |
| `npm run assets` | Re-fetches any missing photography and environment maps (network required). |
| `npm run assets:missing` | Recovers only the picks that are absent locally, merging them into the existing manifest. |
| `npm run teams` | Fetches the 2026 Formula One team grid from Wikipedia into `scripts/out/teams.json`, then regenerates `src/data/teams.generated.ts` (network required). |

Asset tooling (run manually, in order, after `npm run assets`):

```bash
npm run assets:optimize      # build 640/1280/1920/2560 WebP variants, drop .jpg originals
npm run assets:index         # regenerate src/data/images.generated.ts (+ inline LQIP)
npm run assets:manifest      # regenerate ASSET-MANIFEST.json
npm run assets:licenses      # regenerate ASSETS-LICENSES.md
```

`scripts/find-history-picks.mjs` is run by hand, once, to search Wikimedia Commons for
one photograph per history era and register the picks; it is not part of the build.

## Project structure

```
f1/
  index.html                 entry document (font + icon links, no-flash theme flag)
  vite.config.ts             build config (relative base, manual chunks)
  tsconfig.json
  public/assets/             all shipped assets (see below)
  src/
    App.tsx                  section composition + error boundaries
    main.tsx                 bootstrap
    components/              shell, header, footer, shared UI primitives
    sections/                one file per experience section
    three/                   procedural geometry, textures, car, scene, effects
    lib/                     physics, telemetry sim, prefs, motion, audio, quality
    data/                    verified circuit + driver data, generated image index
    styles/                  base, components, sections
  scripts/                   asset acquisition + build-time generators
```

## The experience

| Section | What it contains |
| --- | --- |
| Opening film | Blackness to wet asphalt to red wing light strips, ending in `[ ENTER THE GRID ]`. Skippable, with a progressive load and a photo fallback if 3D cannot start. |
| Showcase | Scroll-driven storytelling (silhouette to reveal to race environment) plus a free interactive viewer: orbit, zoom, camera presets, environment switching, livery change, lighting toggle, hotspots and fullscreen. |
| Laboratory | Nine components (front wing, rear wing, floor, diffuser, tyres, suspension, brakes, cockpit and halo, cooling inlets) with focus, highlight, diagrams and an exploded view. Airflow lines are labelled conceptual. |
| Race | A playable simulation on a closed circuit with chase camera, shadows, speedometer, gear, lap timer, results, pause, restart and touch controls. |
| Grand Prix | A deterministic race simulator: choose a car, start and stop tyre compounds, pit laps and pace mode, then follow a 12-car field lap by lap with a live leaderboard, a gap-to-leader chart and a final classification with points. The field, teams and timings are a labelled demonstration. |
| Telemetry | Simulated speed, RPM, gear, throttle, brake, tyre temperatures, sector and lap times, steering, track map, energy and tyre wear, with scenario, start, pause and reset controls. |
| Circuits | Eight circuits (Monaco, Silverstone, Spa, Suzuka, Monza, Singapore, COTA, Yas Marina) with photography, schematic outlines, verified length and corner count, description and selection. |
| Weekend | Practice / qualifying / sprint / race schedule, countdown, grid, results, conditions and weather. |
| History | A twelve-era timeline from the 1950 championship to the 2020s: a Commons photograph, a short summary and three verified facts per era, each linking to the Wikipedia article it was written from. |
| Drivers | Seven driver profiles with verified career statistics, the full eleven-team 2026 grid (entrant, base, principal, chassis, power unit, championship counts, first entry and race drivers with the rounds each contested) and a separate fictional F1 Concept entry. |
| Pit stops | Arrival, crew, jack, wheel changes and release with an elapsed timer, replay and four schematic camera views. |
| Gallery | Asymmetric editorial layout with full-screen lightbox, keyboard and touch navigation, category filtering, captions and attribution. |

## Racing simulator controls

| Input | Action |
| --- | --- |
| `W` / `ArrowUp` | Accelerate |
| `S` / `ArrowDown` | Brake |
| `A` `D` / `ArrowLeft` `ArrowRight` | Steer |
| `Space` | Handbrake |
| `R` | Restart |
| `Escape` | Pause / resume |

Touch controls are provided on small screens. The physics is a lightweight arcade
model (acceleration, braking, speed-dependent steering, a lateral grip ceiling, drag,
boundaries and collision feedback) with a fixed 1/120 s timestep. It is not a
professional vehicle simulator.

## Quality presets

Three presets, selectable from the header: **ECO**, **BALANCED** (the adaptive
default) and **CINEMA**. The device pixel ratio is always capped. An adaptive quality
manager watches the frame rate and downgrades rather than freezing, warning instead of
silently dropping quality. Bloom and the post-processing passes are loaded only in
CINEMA. Animations pause when the tab is hidden or the section is scrolled out of view.

## Assets

All assets live under `public/assets/` and are documented in `ASSET-MANIFEST.json` and
`ASSETS-LICENSES.md`.

| Kind | Count | Source and licence |
| --- | --- | --- |
| Photography | 38 files (190 files with variants), each with 640/1280/1920/2560 WebP variants | Wikimedia Commons, per-file licence (CC BY / CC BY-SA / CC0) |
| Environment maps | 5 HDRIs | Poly Haven, CC0 |
| Fonts | 22 woff2 files | Barlow Condensed, Inter, JetBrains Mono — SIL OFL 1.1 |
| Icons | 1 SVG | Original artwork |
| 3D models | none | The car is procedural (see below) |
| Audio | none | All sound is synthesised with the Web Audio API |

The photography set is curated as 63 picks across nine categories
(`scripts/out/picks.json`). **38 shipped.** Picks whose source file could not be
retrieved are omitted rather than approximated — the Wikimedia image CDN returns HTTP 429
for whole fetch windows — and every affected section shows a labelled placeholder.
`npm run assets` retries the missing picks.

### The car is procedural

No usable licensed open-wheel model was found. Two CC-BY glTF candidates were
downloaded and evaluated, and both were rejected: one is 267 anonymous meshes with no
separable parts (so per-part hotspots and an exploded view are impossible), and the
other is a closed-wheel road car in millimetre units. Both are attributed in
`ASSETS-LICENSES.md`; the full record is in `public/assets/models/README.md`. The car,
the track and the pit-stop diagram are original procedural geometry.

## Honesty statement

This is a demonstration experience, not an official or affiliated product. In
particular:

- The telemetry, pit-stop and race-simulation values are **simulated**, not live data.
- The race-weekend schedule, grid and results are a clearly labelled **demonstration
  dataset**; the countdown uses a configured date and real elapsed time and does not
  keep counting after the event passes.
- Driver and team statistics are taken from public records and are kept separate from
  the **fictional** F1 Concept entry. Driver portraits are Wikimedia Commons images
  credited in `ASSETS-LICENSES.md`; a monogram plate is drawn if a portrait is
  unavailable.
- The history timeline is a summary written for this project from the Wikipedia article
  linked at each entry; its photographs are Wikimedia Commons files credited in
  `ASSETS-LICENSES.md`.
- The 2026 team grid is reproduced from the entrants table of the English Wikipedia
  article *2026 Formula One World Championship* plus each team's own article infobox
  (base, principal, championship counts, first entry, race totals), read in October 2026
  and linked from every card. Nothing is estimated.
- Circuit specifications are used only where verified; circuit outlines are labelled
  "schematic, not to scale".
- Airflow lines are labelled **conceptual** and do not represent CFD.
- No ray tracing, no WebGPU requirement, and no claim of an official connection to any
  real team or series.

## Graceful degradation

- Without WebGL the 3D layers render nothing and each section shows a photographic or
  diagrammatic fallback.
- With JavaScript disabled the document still renders its content.
- Reduced motion, a simplified reading mode and high-contrast focus styles are
  available from the footer and persist across sessions.

## External services

None required. All assets are local and the site makes no runtime network requests.
`npm run assets` is the only script that touches the network, and it uses the public
Wikimedia Commons API and Poly Haven; neither needs a credential.

## Licence

Project source and original artwork: see the repository. Third-party assets retain
their own licences as listed in `ASSETS-LICENSES.md`.
