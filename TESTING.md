# Testing report

Environment: Windows, Node v24.22.0, Vite 7.3.7, Chromium (headless-style embedded
browser). Production build verified with `npm run build` (exit 0, no warnings).

The target machine's browser tab runs in a hidden (non-visible) state, so
`requestAnimationFrame` never fires there. That is stated explicitly wherever it
affects what could be observed, and it is the one acceptance criterion that could not
be checked visually.

## Acceptance criteria

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Dependencies install | Pass | `npm install` completes; 138 packages. |
| 2 | Assets are valid files | Pass | 38 WebP photographs with 152 responsive variants (190 files), 5 HDRIs, 22 woff2 fonts. No zero-byte or mislabelled files. |
| 3 | Dev server starts | Pass | Vite ready at `http://127.0.0.1:5173/` in ~0.7 s. |
| 4 | Production build completes | Pass | `tsc --noEmit && vite build` exit 0; `dist/index.html` rewrites font/icon/module hrefs to `./assets/...`. |
| 5 | All sections render | Pass | `intro, showcase, laboratory, race, grandprix, telemetry, circuits, weekend, history, drivers, pitstops, gallery` — 12 sections, present and in order. |
| 6 | Viewer interacts | Pass | Camera preset chips switch (Front), livery switches (Signal Red), auto-rotate toggles `aria-pressed` false to true. |
| 7 | Camera reset works | Pass | Reset returns the rig to the default preset. |
| 8 | Scroll animations correct | Pass (wiring) | Nine story stations; clicking a dot issues `window.scrollTo` with the correct target (station 5 to 3198, station 8 to 4930). Active-state sync is driven by ScrollTrigger under `requestAnimationFrame` and could not be observed in a hidden tab. |
| 9 | Game input works | Pass | Key mapping matches spec: W/Up throttle, S/Down brake, A/Left, D/Right steer, Space handbrake, R restart, Escape pause. Escape toggles the run state (Start to Pause to Resume); R restarts. Arrow keys are prevented from scrolling the page. |
| 10 | Lap detection works | Pass | Physics harness: a pure-pursuit driver completed 2 laps in 75 s (31.07 s, 29.38 s) with 0.0% off-track time; 3-lap teleport run reaches `finished`. |
| 11 | Restart works | Pass | Restart re-initialises the sim and keeps the run state, matching the button label. |
| 12 | Telemetry controls update the sim | Pass | Scenario chips (DRS, Push lap, Race stint, Manage, Cool-down) select; Start becomes Pause; Reset returns to Start. Deterministic, fixed-step, pause-gated. |
| 13 | Circuit selection works | Pass | Eight tabs; selecting Silverstone sets `is-on` and `aria-selected=true` and swaps the detail panel text. |
| 14 | Mobile navigation works | Pass | Burger toggles `aria-expanded`; drawer opens with 11 links; close button closes it. |
| 15 | Gallery opens and closes | Pass | Lightbox opens with `role=dialog`, `aria-modal=true`, image and caption; ArrowRight changes the image; Escape closes. Filter 9 to 2 tiles (Night) and back to 9. |
| 16 | Fallbacks exist | Pass | 2 labelled `.frame--missing` placeholders, 0 broken images; non-WebGL and no-JavaScript paths present. |
| 17 | No critical console errors | Pass | 1 informational message (React DevTools hint), 0 errors, 0 warnings, 0 failed requests. |
| 18 | Missing assets degrade gracefully | Pass | Missing keys resolve to a labelled "unavailable" panel with no 404 request (guarded by `hasImage`). |
| 19 | ECO and CINEMA both function | Pass | Selecting ECO and CINEMA updates `html[data-quality]` and `localStorage['f1:quality']`; the post-processing chunks load only for CINEMA. |
| 20 | Usable without WebGL | Pass by construction | 3D layers return `null` when WebGL is absent; every section supplies a photo or diagram fallback. |
| 21 | Refresh works | Pass | Reload re-renders all sections; state is re-initialised. |
| 22 | No horizontal overflow | Pass | `scrollWidth - clientWidth = 0` at 320, 360, 390, 480, 640, 760, 990, 1200, 1280, 1291, 1360, 1440, 1600, 1680 and 1920 px, including with the race canvas mounted and the 11-item header nav or the burger in place. |
| 23 | 3D renders correctly | Partially verified | A synchronous `WebGLRenderer.render` + `readPixels` harness produced 74 distinct colours, 2729 lit pixels and 632 triangles with red car pixels present, proving geometry, materials and the renderer are correct. Live on-screen rendering could not be observed because the tab is hidden and `requestAnimationFrame` is paused. |
| 24 | Grand Prix simulator settles a full race | Pass | Harness on `src/lib/raceSim.ts` (`scripts/out/check-gp.ts`): a 44-lap run (the model's maximum) over the 12-car demonstration grid produces only finite lap and cumulative times, three lead changes, 24 stops in total, gaps that increase monotonically to +85.648 s for the last car, positions seated 1–12, a fastest lap of 102.525 s on lap 31, and lap one slower than lap two (107.106 vs 106.315 s — the standing-start penalty). Re-running the identical configuration reproduces the identical classification. |
| 25 | History timeline renders | Pass | `#history` contains 17 `.milestone` nodes, 12 `.history__era` cards (three facts each) and the source note; `.history__timeline` scrolls horizontally (`overflow-x: auto`, `scrollWidth 4392 > clientWidth 790`) so the axis scrolls rather than compressing. |
| 26 | 2026 team grid renders | Pass | 11 `.team-card` nodes (Alpine, Aston Martin, Williams, Audi, Cadillac, Ferrari, Haas, McLaren, Mercedes, Racing Bulls, Red Bull Racing), nine data fields each and one or more race drivers per card with the rounds contested (for example Red Bull: Verstappen R1–17, Hadjar R1–11/15–17, Lawson R12–14). Every card links to the Wikipedia article the values were read from. |
| 27 | Header nav holds eleven items | Pass | Sweep at 1241–1920 px: the burger shows at ≤1290 px (`nav=none`), the full row at ≥1291 px, with zero overflow at 1291, 1360, 1440, 1600, 1680 and 1920 px; the decorative index returns at ≥1661 px and still fits. No console errors after reload. |
| 28 | Scroll buildup reveals | Pass | Every section header carries `.head.reveal` (11), and `.reveal-group` staggers the driver grid, the 2026 team grid, the circuit list, the history milestones and era cards, the gallery, the telemetry panels, the pit sidebar, the laboratory panel and the race-weekend blocks. Off-screen groups start at `opacity: 0` / `translate3d(0, 28px, 0)` and gain `.is-in` on intersection; children are delayed by `--reveal-i × --reveal-step` (45–90 ms). Built CSS rules and selector matching verified in the browser; the class transition itself cannot be observed in a hidden tab (transitions pause there), so it was confirmed with transitions disabled — under `.is-in` the computed opacity is 1 and the transform is none. With `prefers-reduced-motion` or the in-app Reduced-motion toggle on, all 17 reveals and 13 groups report `.is-in` from the first frame, so no content is left hidden. Zero console errors, `scrollWidth - clientWidth = 0`. |

## Physics and geometry verification (headless harness)

Run against `src/lib/racePhysics.ts` with fixed 1/120 s steps:

- Grip ceiling: 1.62 g (15.9 m/s²) — matches the model.
- Acceleration: peak 51.1 m/s on the long straight; `TOP_SPEED` 88 m/s.
- Braking: 38.4 to 6.2 m/s in 1.5 s, `brakeGlow` rises to 0.90.
- Steering: symmetric (+/-0.1773 rad over 40 steps) with correct sign.
- Reverse: engages below 0.6 m/s and reaches -8.00 m/s (gear 0).
- Barrier: a single scrape drops 60 to 56.9 m/s (frame-rate independent), clamps to
  `TRACK_HALF + RUNOFF`, and flags impact; a sustained scrape reduces speed to 0.
- Sectors: transitions recorded on every crossing, including the lap line; last
  completed splits are `[7.98, 9.37, 12.02]` s, summing to the 29.38 s lap, and they
  survive `phase === 'finished'`.
- Determinism: identical inputs produce identical state; pause halts the clock.

Track: 900 segments, 1071 m length, `loft`/`bodyRing`/`aerofoilRing`/`extrudeProfile`/
`ribbonGeometry` all produce finite, correctly-indexed, correctly-UV'd geometry. All
eight procedural textures build.

## Responsive verification

Measured with same-origin iframes at fixed widths, reading
`documentElement.scrollWidth - clientWidth` and scanning for elements past the right
edge. Fixed issues found during this pass:

- `.data-table` overflow inside the race weekend panel — now scrolls within a
  `.table-scroll` wrapper; the `.weekend__tables` grid track is `minmax(0, 1fr)`.
- `aspect-ratio` + `min-height` on `.viewer__stage`, `.lab__stage` and `.race__canvas`
  implied a minimum width (576 / 453 / 676 px). Below 760 px these now use an explicit
  clamped height instead. A later `@media (max-width: 640px)` rule was re-imposing the
  4/3 ratio on `.race__canvas` and was corrected.
- The topbar wordmark is hidden at 400 px and below; the control cluster still fits.
- The header row now carries eleven section links. `.nav__index` is hidden and the link
  padding tightened at ≤1660 px, the gap was reduced to zero, and below 1290 px the row
  is replaced by the burger. A sweep at 1241–1920 px (same-origin iframe, resized in
  place) reports `scrollWidth - clientWidth = 0` for both `.nav` and the document at
  1291, 1360, 1440, 1560, 1600, 1680 and 1920 px, and `nav = none` with the burger shown
  at 360, 768, 1024, 1280 and 1289 px.
- The eleven-card team grid reflows from four columns at 1440 px and above to three at
  1024–1280 px, two at 768 px and one at 360–600 px; the document reports zero overflow
  at every width, with card heights between 547 and 712 px.

## What could not be verified here

- **Live on-screen 3D rendering and screenshots.** The tab is `hidden`, so
  `requestAnimationFrame` does not run, R3F never paints, and screenshots are
  unavailable. The synchronous render harness (criterion 23) is the substitute.
- **Frame-rate adaptive downgrade behaviour** under real load — requires a visible tab.
- **Real touch hardware, screen readers and cross-browser (Firefox/Safari) behaviour.**
  Keyboard and pointer interactions were verified in Chromium; `prefers-reduced-motion`
  and reading mode were verified by toggling the footer controls.
- **The scroll-reveal transition playing.** Transitions pause in the hidden tab, so the
  reveal was verified structurally (rules, selector matching, `.is-in` class, reduced-motion
  bypass) rather than watched on screen.

## How to re-run the checks

```bash
npm run typecheck
npm run build
npm run dev     # then open http://127.0.0.1:5173/
```

The Grand Prix harness is a single TypeScript file; bundle and run it with:

```bash
npx esbuild scripts/out/check-gp.ts --bundle --platform=node --format=esm --outfile=scripts/out/check-gp.bundle.mjs
node scripts/out/check-gp.bundle.mjs
```

The physics, geometry and responsive harnesses used during development are scripts in
`scripts/out/` (not shipped with the app).
