# Car model sourcing — outcome

The brief asked for a licensed glTF/GLB open-wheel car if one could be found, and a
procedural model with an honest written explanation otherwise. **No usable licensed
open-wheel model was found, so the car is procedural** (see `src/three/RaceCar.tsx`).

## What was searched

Open, permissively licensed model repositories were queried for Formula-1-style cars:

- **Poly Pizza** (`poly.pizza`) — CC0/CC-BY low-poly models.
- **Sketchfab** — filtered to downloadable, CC-licensed results.

Searches used terms such as *formula 1*, *f1 car*, *open wheel*, *race car*,
*formula car*. Most results were either non-downloadable, no-derivatives, or
non-commercial only, which cannot be shipped in this build.

## Candidates that were downloaded and evaluated

`scripts/get-models.mjs` fetched the only two candidates that were (a) downloadable
and (b) CC-BY. Both were rejected after structural inspection
(`scripts/out/probe-models.mjs`).

### 1. `open-cockpit-design.glb`

- Source: Poly Pizza — <https://poly.pizza/m/open-cockpit-design>
- Author: Niall McCaffrey
- Licence: CC-BY 3.0 (<https://creativecommons.org/licenses/by/3.0/>)
- Contents: 267 meshes, all named `group<random>` with no meaningful hierarchy.

**Rejected because** the geometry is not separable into named parts. The interactive
viewer, the engineering-lab exploded view and the per-part hotspots all require
addressable components (front wing, rear wing, tyres, floor, …). A 267-node anonymous
blob cannot support that, and renaming 267 nodes by hand is not verifiable.

### 2. `car-model-formula.glb`

- Source: Poly Pizza — <https://poly.pizza/m/car-model-formula>
- Author: Ignition Labs
- Licence: CC-BY 3.0 (<https://creativecommons.org/licenses/by/3.0/>)
- Contents: a road car (a Lamborghini Aventador), authored in millimetre units.

**Rejected because** the subject is wrong: it is a closed-wheel road car, not an
open-wheel formula car. Its millimetre scale would also need correction before use.

## Result

Both files were deleted from `public/assets/models/`. No third-party model ships with
this project, no attribution obligation is carried, and the interactive car, the
exploded view and the per-part hotspots are all built from original procedural
geometry in `src/three/geometry.ts` + `src/three/RaceCar.tsx`.

To re-run the evaluation:

```bash
node scripts/get-models.mjs      # re-downloads the two candidates into this folder
node scripts/out/probe-models.mjs
```
