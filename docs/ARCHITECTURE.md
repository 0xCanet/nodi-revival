# Architecture

## Purpose

NOD-I Revival is a local-first appliance stack. Bitcoin and the miner remain
useful without a cloud account. The store and SDK are open contracts, not a
privileged remote execution channel.

## Component map

```text
browser :8080
    |
    v
control-ui (nginx) ---- /api ----> core-api :8787
                                      |  |  |
                     Bitcoin JSON-RPC |  |  +--> JSON store + audit log
                                      |  +-----> miner state/log (read-only)
                                      +--------> host metrics (read-only)

screen-agent (host Python) ---- HTTP ----> core-api

bitcoin-core <---- private Docker network ---- core-api
lottery-miner ---- state volume (read-only) --> core-api
```

## Trust boundaries

- Only Bitcoin P2P (`8333`) and the web UI (`8080` by default) bind to the host.
- Bitcoin RPC is private to the Docker network.
- The API never mounts `/var/run/docker.sock`.
- The screen agent reads status and writes pixels; it has no install or wallet
  authority.
- The miner is a separate, opt-in process with CPU/thread and thermal limits.
- Community manifests are data. Approval permits packaging review, not direct
  execution from an arbitrary URL.

## Packages

| Path | Responsibility |
| --- | --- |
| `apps/control-ui` | cockpit, catalog, voting and SDK help |
| `services/api` | status aggregation, catalog, governance and audit API |
| `packages/sdk` | app types, JSON Schema, validation and CLI |
| `catalog` | reviewed manifests shipped with this repository |
| `examples/hello-nodi` | minimal third-party app example |
| `infrastructure/bitcoin` | reproducible Bitcoin Core image |
| `infrastructure/lottery-miner` | reproducible cpuminer image and safety wrapper |
| `hardware/screen-agent` | ST7789 320×240 rendering and preview mode |

## Persistence

- Bitcoin chain data: Docker volume `bitcoin-data`.
- Store proposals, votes and audit events: volume `store-data` en lecture/écriture pour l’API.
- Miner state and logs: volume `miner-data`, lu en lecture seule par l’API.
- No wallet or seed is created by the MVP.

JSON persistence is deliberate for the first community prototype: it is easy to
inspect, back up and migrate. Writes are atomic and serialized by the single API
process. A later multi-node control plane should replace it with a transactional
database without changing the SDK contract.

## Runtime profiles

- Default profile: Bitcoin, API and control UI.
- `miner` profile: adds the lottery miner only after explicit configuration.
- Hardware display: host systemd service, not part of the Docker failure domain.

## Version policy

- Application manifests use `nodi.community/v1`.
- Container source versions and checksums are pinned.
- SDK breaking changes require a new manifest API version.
- Catalog entries use immutable semantic versions and source references.
