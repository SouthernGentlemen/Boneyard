# Dataset licences and attribution

This is the repository's single provenance and licence index for data and art. It replaces
per-file and per-directory notices. It is not a blanket licence for this repository's own source code, and
it does not create a licence where an upstream source supplied none.

## Bandai-Namco-Research-Motiondataset-1

- **Upstream URL:** <https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset>
- **Pinned revision:** `74ead3ba1ae4696404e6086233779f60de8bf9ef`
- **Copyright holder:** Copyright 2022 Bandai Namco Research Inc. All Rights Reserved.
- **Licence:** [Creative Commons Attribution-NonCommercial 4.0 International
  (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/legalcode)
- **Repository paths covered:**
  - `motions/capture/bandai-namco-motiondataset-1/*.bvh`
  - `motions/bandai-namco-motiondataset-1.json`
  - `catalog/clips.json`
  - any `bnr*` adaptation in `motions/authored/*.json` and
    `catalog/clips.json`

The `bnr*` clips are adapted material. The build selects and trims source frames, projects the
3D motion into a 2D side view, collapses the source joints into the eleven-bone fighter rig,
removes horizontal root motion, resamples from 30 FPS to 60 Hz, and reduces the result to
sparse linear keyframes. This material may not be used for commercial purposes under CC
BY-NC 4.0.

## Fire Emblem Heroes map-character atlases

- **Upstream URLs and pinned files:**
  - [Barst](https://www.spriters-resource.com/mobile/fireemblemheroes/asset/87979/),
    SHA-256 `73eec5890ab099926841cdca649c8a9e1cb413827a8a0ed737c6b65e100ed78c`
  - [Kiran](https://www.spriters-resource.com/mobile/fireemblemheroes/asset/99353/),
    SHA-256 `aa875eca8e849f013f64c3225f408c674b0353dc9d3025c70e5d3aa61675e77e`
  - [Yuliya](https://www.spriters-resource.com/mobile/fireemblemheroes/asset/220063/),
    SHA-256 `16e526e166fbcf00325573a1e4095312941bf5eaa640a99b9610b68e26409387`
- **Pinned revision:** The archive does not publish revision identifiers. The exact downloaded
  files are pinned by the SHA-256 values above.
- **Copyright holder:** Copyright 2017 Nintendo / INTELLIGENT SYSTEMS. The
  [official staff credits](https://support.fire-emblem-heroes.com/en/staff_credit) identify
  Nintendo and INTELLIGENT SYSTEMS as the authors for copyright.
- **Licence:** [Fire Emblem Heroes User Agreement](https://en-americas-support.nintendo.com/app/answers/detail/a_id/48067)
  (proprietary; all rights reserved). No redistribution licence for these extracted game assets
  was established. The Spriters Resource says that it
  [does not own or license archived game assets](https://www.spriters-resource.com/page/help/).
- **Repository paths covered:**
  - `characters/{barst,kiran,yuliya}/atlas.png`
  - `characters/{barst,kiran,yuliya}/parts/*.svg`
  - `cosmetics/royal-guard/atlas.png`
  - `cosmetics/royal-guard/*.svg`

The character atlases are byte-identical to the three files linked above. The generated SVG
parts are traced adaptations. The Royal guard atlas repacks Kiran islands `prop_13`, `prop_02`
and `prop_14`: their dimensions and alpha channels are identical, and visible RGB differences
are at most one 8-bit channel value. Its SVG pieces are traced adaptations. Do not infer
permission to redistribute or use these paths from their presence in this repository.

## Field kit cosmetic atlas

- **Upstream URL:** Not established. No external source is recorded in the file, commit, or
  repository documentation.
- **Pinned revision:** First tracked in repository commit
  `293fe2cd41ab8a293a12e49cf3795363cb7d7688`.
- **Copyright holder:** Not established by the available provenance.
- **Licence:** No licence or licence text has been identified, so there is no upstream licence
  link to provide. Do not assume a permission grant.
- **Repository paths covered:**
  - `cosmetics/field-kit/atlas.png`
  - `cosmetics/field-kit/*.svg`

The atlas is a ten-colour local binary and does not byte-match any island in the three pinned
character atlases. That evidence is not enough to identify its creator or establish rights,
so the provenance remains explicitly unresolved.

## Repository-authored motion

- **Upstream URL:** This repository (Boneyard). Publish it before distributing an adaptation:
  CC BY-NC 4.0 attribution has to name somewhere a recipient can reach.
- **Pinned revision:** Authored files are versioned directly by this repository's Git history.
- **Copyright holder:** The contributors recorded in that history.
- **Licence:** No separate licence grant has been declared for repository-authored motion.
- **Repository paths covered:** `motions/authored/lab*.json` and the corresponding `lab*`
  entries in `catalog/clips.json`.

`lab*` clips are original to this repository and claim no third-party origin. They are not covered by
the Bandai Namco CC BY-NC 4.0 licence merely because both kinds of clip share a generated file.
The `labIdle`, `labWalk`, `labStagger`, `labStrike`, `labOverhead`, and `labGuard` clips were authored
on the repository's fighter rig for FightLab's publishable presentation lane. They contain no
Bandai Namco capture data and set `derivedFrom` to `null`.

## Repository-authored FightLab figures

- **Upstream URL:** This repository (Boneyard).
- **Pinned revision:** The figure manifests are versioned directly by this repository's Git history.
- **Copyright holder:** The contributors recorded in that history.
- **Licence:** No separate licence grant has been declared for these repository-authored figures.
- **Repository paths covered:** `figures/runner.json` and the original
  `characters/fighter/parts/*.svg` that they reference.

The runner figure reuses the original authored fighter parts and wears no cosmetics. It does not
reference the Fire Emblem Heroes atlases, royal-guard pieces, or field-kit pieces listed above.

## Repository-authored weapon art

- **Upstream URL:** This repository (Boneyard). Publish it before distributing an adaptation:
  CC BY-NC 4.0 attribution has to name somewhere a recipient can reach.
- **Pinned revision:** The authored atlas is versioned directly by this repository's Git history.
- **Copyright holder:** The contributors recorded in that history.
- **Licence:** No separate licence grant has been declared for repository-authored art.
- **Repository paths covered:**
  - `cosmetics/armory/atlas.png`
  - `cosmetics/armory/*.svg`

The armory atlas is original to this repository. Its longsword uses the deleted preview implementation's
56-unit blade and 15-unit handle as rig-scale measurements; it does not copy that implementation,
its two-arm IK, or its hand-authored weapon trajectories.
