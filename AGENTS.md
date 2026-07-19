# Working agreement for humans and coding agents

This repository is intentionally optimized for review by both people and LLMs.

## Product boundary

The MVP has four product surfaces:

1. Bitcoin Core node monitoring.
2. An opt-in SHA-256d lottery miner.
3. A community-governed open-source app store.
4. A 320×240 ST7789 status screen.

Do not add wallets, seed handling, automatic disk formatting, unaudited remote
installers or public RPC exposure to the MVP.

## Source-of-truth order

1. `docs/ARCHITECTURE.md` for component boundaries and data flow.
2. `docs/UX.md` for flows, actions and UI states.
3. `packages/sdk/schema/app-manifest.schema.json` for the app contract.
4. `docs/GOVERNANCE.md` for store admission rules.
5. `docs/SECURITY.md` for non-negotiable safety constraints.
6. Code and tests for executable behavior.

When documentation and code disagree, treat the mismatch as a bug and update
both in the same change.

## Change rules

- Keep packages small and dependency-light.
- Prefer pure functions around governance and manifest validation.
- Every external process remains disabled until configuration is explicit.
- Never log secrets, payout credentials or complete environment files.
- Never mount the Docker socket in an HTTP-facing service.
- Store installation requests are audited; the API does not execute arbitrary
  community Docker Compose files.
- Preserve ARM64 and x86_64 compatibility.
- Add a test for every manifest, governance or parser behavior change.
- Use explicit file paths and environment names in documentation.

## Standard checks

```bash
npm ci
npm run check
docker compose config
```

Docker checks may be unavailable on development machines without Docker. State
that limitation explicitly instead of pretending runtime validation happened.
