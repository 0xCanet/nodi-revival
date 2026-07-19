# UX contract

This document is the UX source of truth produced with Stark. It defines product
behavior before visual styling.

## UX decision brief

- **Job:** understand device health in seconds, then safely configure or inspect
  Bitcoin, mining and community apps.
- **User mode:** returning device operator; occasional app creator or community
  voter.
- **Frequency/risk:** daily monitoring, occasional configuration, high security
  and thermal risk.
- **Pattern:** monitoring cockpit for the home screen; master/detail catalog for
  the store; review-before-submit for creators.
- **Primary action:** resolve the highest-priority blocked or degraded service.
- **Secondary actions:** inspect, configure, vote, propose and request install.
- **Core path:** status → attention item → detail → explicit action → progress →
  confirmed result.
- **Recovery path:** preserve the previous safe state, explain the failure, keep
  logs available and offer retry without duplicating the operation.
- **Required states:** empty, loading, partial, stale, offline, permission
  blocked, long-running, success and error.
- **Handoff constraints:** the 320×240 display is read-only; risky changes stay
  in the web UI; installation never bypasses approval and local review.

## Operator journey

1. The operator sees Bitcoin sync, miner state and device temperature without
   opening a menu.
2. A single attention rail ranks offline, overheated, unsynced or pending-vote
   states.
3. Selecting an item opens its detail without losing dashboard context.
4. Starting mining requires an address, pool, thread count and explicit thermal
   limit confirmation.
5. Installation requests show permissions, source, license, resource limits and
   community decision before confirmation.
6. Long-running actions display queued/running/succeeded/failed states and an
   audit entry.

## Creator journey

1. Copy the SDK example.
2. Complete `app.nodi.json` and declare every permission/resource.
3. Run `nodi-app validate app.nodi.json` locally.
4. Open a proposal containing the source repository and immutable version.
5. Automated validation records errors next to the exact manifest path.
6. A valid proposal becomes `candidate`; community voting can begin.
7. Approval makes the app eligible for maintainer packaging and device-side
   review. It does not execute remote code automatically.

## Voter journey

1. Browse candidates with source, license, permissions and validation status.
2. Inspect the manifest and repository before choosing.
3. Vote approve or reject once per voter identifier in the MVP.
4. See quorum, approval ratio and remaining votes immediately.
5. Changing a vote replaces the previous vote and creates an audit event.

The MVP voter identifier is not Sybil-resistant. Production governance must
connect votes to verified GitHub or Discord membership before decisions become
binding.

## UI decision brief

- **Surface type:** operational dashboard plus app marketplace.
- **Platform:** local web UI and dedicated 320×240 hardware display.
- **Product thesis:** a node appliance should reveal health and risk before it
  offers features.
- **Composition:** industrial instrument panel with a priority rail and stable
  detail pane.
- **Typography:** JetBrains Mono for the web UI; DejaVu Sans Mono on the device
  framebuffer for offline availability.
- **Direction:** industrial monospace, dry solid colors, thin rules, no crypto
  gradients or casino imagery.
- **Density:** operational on desktop; reduced to three scan zones on 320×240.
- **Primary visual:** Bitcoin synchronization progress and current blocker.
- **Color:** warm black, stone text, terminal green for healthy, amber for
  pending/stale and red only for actionable failure.
- **Motion budget:** subtle; short CSS state transitions and one status pulse.
- **Reduced motion:** all pulsing and transitions stop under
  `prefers-reduced-motion`.
- **Implementation:** Vite + React because polling, tabs, voting and detail state
  are reusable and interactive; CSS handles motion.
- **Responsive containment:** lists own their overflow, the detail pane stacks
  below 760px, and the dedicated screen layout never horizontally scrolls.
- **Assets:** no decorative bitmaps; status glyphs, rules and real operational
  data are the visual system.

## Screen inventory

| Surface | Primary content | Primary action |
| --- | --- | --- |
| Cockpit | sync, peers, miner, temperature, alerts | inspect blocker |
| Bitcoin | chain, blocks, headers, disk mode, RPC state | open diagnostics |
| Miner | opt-in state, pool, hashrate, shares, thermal stop | configure/start |
| Store | core, approved and candidate apps | inspect app |
| App detail | source, license, permissions, votes, install state | vote or request install |
| SDK | manifest steps and validation command | copy example |
| Hardware display | rotating Bitcoin/miner/store summaries | none (read-only) |
