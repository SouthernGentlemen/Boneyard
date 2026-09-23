# Security policy

Boneyard is an asset/data library with restricted source-material boundaries. Security reports belong in a private channel; copyright,
licence and provenance questions remain governed by [`LICENSE.md`](LICENSE.md).

## Reporting a vulnerability

Do not put vulnerability details, credentials, exploit material, restricted source assets or
sensitive reproduction data in a public issue, public pull request, public discussion or other
public channel.

Report the issue directly to the repository owner
through the existing private channel used to coordinate that access or work. Include only the
people needed to investigate the report. If no private channel has been established, request one
without sending sensitive details first.

A useful report includes the affected path or pipeline, impact, reproduction steps, the minimum
example needed to demonstrate the issue, and any known workaround. Do not attach third-party
restricted media, credentials or unrelated private data when a smaller reproduction is enough.

## Credentials and sensitive configuration

Do not commit passwords, API keys, access tokens, cookies, private keys, service credentials or
other secrets. Do not place them in source files, asset manifests, generated catalogs, logs,
screenshots, render output or exchange files.

The root `.gitignore` excludes development/output artifacts such as `node_modules/`, `out/`,
logs and Python cache files. It is not a credential-management boundary and does not currently
declare generic secret or environment-file patterns. Keep secrets outside the repository and
outside generated artifacts rather than relying on ignore rules to make them safe.

If a credential or secret is exposed, stop further distribution, notify the owner privately, and
rotate or revoke the affected credential before treating repository cleanup as sufficient.

## Source assets and restricted media

Some tracked source material and adaptations have licence, redistribution or unresolved-provenance
constraints. [`LICENSE.md`](LICENSE.md) is the authoritative provenance and licence index.

Treat restricted or proprietary source assets as sensitive when investigating a security issue.
Do not copy them into public reports, external paste sites, test fixtures or unrelated repositories
to demonstrate a vulnerability. Security handling does not grant redistribution rights and does
not replace the attribution or provenance rules.

## Generated, rendered and exchange artifacts

Generated SVGs, catalogs, render sheets, BVH files, Blender/exchange artifacts, screenshots and
other derived output may contain or reveal restricted source material, internal paths or sensitive
report data. Share only the smallest artifact needed for investigation and keep it in the same
private reporting boundary.

Do not publish generated or exported evidence merely because the pipeline can reproduce it.
Temporary work in `out/` is disposable output, not a safe place for credentials or unrestricted
distribution.

## Coordinated handling

While a report is being investigated:

- keep technical details and sensitive artifacts within the private reporting channel;
- avoid unrelated refactors or broad disclosure that makes reproduction easier before a fix exists;
- preserve enough evidence to verify the issue without retaining unnecessary secrets or restricted
  media;
- record remediation and validation in the normal controlled-change process once disclosure is
  safe.

This policy describes security reporting and sensitive-data handling only. It does not create a
new licence, security certification, hosted service, deployment environment or public disclosure
program.
