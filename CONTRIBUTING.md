# Contributing

Read [`AGENTS.md`](AGENTS.md) before changing Boneyard. This repository is an asset/data library:
the rig, art, motion, generated catalogs and the deterministic pipelines that interpret or produce
them. It is not a browser application or hosted service.

## Controlled changes

Prospective work follows the controlled `BY-NNN` queue in
[`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md). On `do needful`, re-fetch authoritative
`main`, open pull requests and current provider state; finish an authoritative delivery for the
first open task if one already exists, otherwise take only that first task. Do not skip a blocked
first task without owner direction.

Use the task's declared ID and type:

- branch: `by-NNN-kebab-case-summary`;
- commit and pull-request title: `[BY-NNN] [TYPE] Imperative summary`;
- commit body: identify `Task: BY-NNN`, summarize the narrow scope and record validation;
- pull-request body: identify task and scope, record validation and observed provider state, and
  name the next-task handoff.

The delivering change removes its own task from the active plan. After merge, confirm the accepted
`main` and stop; do not begin the next task in the same turn. Controlled delivery follows branch →
implementation → validation → one controlled branch commit → PR → exact-head CI → squash exact
validated head → one controlled commit retained on `main` → verify `main` → branch cleanup.

## Toolchain and locked install

Use Node 26.9.0 with npm 11.19.1. `.node-version` is the Node authority and `package.json` pins
both the exact npm package manager and supported engine versions. `.npmrc` enables strict engine
checking, so an unsupported Node/npm pair is rejected instead of becoming accidental local state.

Install from the committed lockfile with:

```bash
npm ci
```

Do not use an install command that rewrites dependency resolution as part of normal acceptance.

## Commands and generated output

After the locked install, use the existing package scripts for the change being made. The two
broad library commands are:

```bash
npm run build
npm run check
```

`build` regenerates the tracked parts, cosmetics, motion catalog and discovery indexes.
`check` is the canonical full acceptance command. It runs prospective history validation, the
repository's deterministic guards, generated-output checks, exchange and wardrobe checks, cruft
and footprint checks, typecheck, tests and Blender validation. `npm run verify` remains a
temporary compatibility alias that delegates once to `npm run check`.

Generated files are outputs, not alternate authored sources. Change the appropriate source or
pipeline, regenerate, review the resulting diff and keep generated files byte-reproducible. Do
not hand-edit generated output to make a check pass. Temporary render/exchange work belongs in
`out/`; reset or teardown must not delete authored source or an artist's Blender project.

There is currently no `npm run dev`, browser runtime, server, Worker, hosted environment or
production deployment for Boneyard. Do not invent one to satisfy a process template.

GitHub Actions runs repository acceptance for pull requests targeting `main` and pushes to
`main`. CI resolves the committed Node/npm toolchain, installs the lockfile with `npm ci`,
requires real Blender and invokes `npm run check` once. Local and provider acceptance therefore
share the package-owned gate rather than duplicating it in workflow YAML.

## Repository settings policy

`config/github-repository-settings.json` is the deterministic desired-state policy for provider
settings. It requires protected/current `main` with exact `verify` CI, squash-only PR merges,
automatic completed-branch deletion, zero bypass actors, and immutable `v*` tags. The
asset/data-library boundary does not add a hosted deployment or npm publication path.

The credential-free process tests compare settings-shaped snapshots with that policy and ignore
transient provider metadata. They do not prove the current GitHub account, branch protection or
ruleset state. Live provider verification is a separate read-only controlled operation and any
tier or permission blocker must be reported rather than inferred away. `npm run test:github-settings`
is credential-free. `npm run verify:github-settings` only reads live settings, using `GH_ADMIN_TOKEN`
or an authorized `GH_TOKEN` with Repository Administration read access. The explicit
`npm run apply:github-settings` command requires write access and independently re-reads live
state after mutation. Neither command prints or persists the token.

## Attribution and source material

[`LICENSE.md`](LICENSE.md) is the single licence and attribution index for repository data and
art. Read it before adding, adapting, redistributing or publishing source material. Preserve
recorded provenance, pinned source revisions or hashes, copyright holders, licence boundaries and
explicitly unresolved provenance. Do not copy licence text into this guide or infer redistribution
permission from a file's presence in the repository.

## Release capability

The package is currently private and normal contribution work does not publish a package, create
a hosted deployment or perform a production release. Do not claim or add release capability
unless an explicit controlled task authorizes and validates it. If publication is introduced
later, its release record must preserve the repository's source, provenance and attribution
requirements rather than treating this asset library like an application deployment.
