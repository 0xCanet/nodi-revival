# NOD-I Revival

NOD-I Revival remet les boîtiers NOD-I en service avec un socle communautaire,
auditable et sans dépendance à l’infrastructure historique.

Le MVP fournit déjà quatre surfaces cohérentes :

- un nœud Bitcoin Core 31.0, pruned et sans wallet embarqué ;
- un mineur loterie SHA-256d, construit depuis les sources et désactivé par défaut ;
- un store open source avec manifeste SDK, propositions et vote communautaire ;
- un cockpit web et un agent pour écran ST7789 320×240.

> [!WARNING]
> Pré-alpha. N’utilisez pas ce projet pour conserver des fonds. Le wallet, les
> seeds, le formatage automatique de disque et l’exécution distante de Compose
> communautaires sont volontairement hors périmètre.

## Voir le MVP en 2 minutes

Le mode démo ne nécessite ni Docker ni nœud Bitcoin :

```bash
npm install
NODI_DEMO=true npm run dev
```

Dans un autre terminal :

```bash
npm run dev:ui
```

Ouvrez <http://localhost:5173>. Le proxy Vite envoie `/api` vers le port 8787.

## Lancer la stack sur un boîtier

Prérequis : Debian/Ubuntu 64 bits, Docker Engine avec Compose v2, au moins
250 Go libres pour le profil pruned recommandé.

```bash
./scripts/bootstrap.sh
docker compose up -d --build
```

Le cockpit devient disponible sur `http://ADRESSE_DU_BOITIER:8080`. Le port P2P
Bitcoin `8333` est publié ; le RPC `8332` reste uniquement sur le réseau Docker
privé. Les données survivent aux redémarrages dans les volumes `bitcoin-data`
`store-data` et `miner-data`.

Consultez [le runbook](docs/RUNBOOK.md) avant une installation réelle.

Pour remettre d’abord le cockpit et le store en ligne sans démarrer Bitcoin ni
monter un ancien disque, utilisez le
[mode récupération](docs/RUNBOOK.md#mode-cockpit-seulement). C’est le mode
recommandé pour inventorier un boîtier d’occasion ou préserver une blockchain
existante avant sauvegarde.

## Activer le mineur loterie

Le mineur ne démarre jamais implicitement. Sa probabilité de trouver un bloc
avec un CPU est extrêmement faible et son coût électrique peut dépasser tout
gain éventuel.

```bash
./scripts/configure-miner.sh bc1q_votre_adresse
docker compose --profile miner up -d --build lottery-miner
```

Le seuil thermique par défaut est 75 °C et le nombre de threads par défaut est
1. Les détails et l’arrêt d’urgence sont dans [le runbook](docs/RUNBOOK.md#mineur-loterie).

## Créer une app pour le store

```bash
cp -R examples/hello-nodi mon-app
npm run build -w @nodi/sdk
node packages/sdk/dist/cli.js validate mon-app/app.nodi.json
```

Le fichier `app.nodi.json` décrit la source immuable, les permissions, les
ressources et le healthcheck. Une app entre comme `candidate`, puis la
communauté inspecte son code et vote. Une approbation produit seulement une
demande d’installation auditable : le MVP n’exécute jamais un Compose distant
depuis une requête HTTP.

- [Guide SDK](docs/SDK.md)
- [Règles de gouvernance](docs/GOVERNANCE.md)
- [Exemple complet](examples/hello-nodi/app.nodi.json)
- [JSON Schema](packages/sdk/schema/app-manifest.schema.json)

## Écran physique 320×240

Une prévisualisation PNG peut être générée sans écran :

```bash
python3 -m venv .venv-screen
.venv-screen/bin/pip install -r hardware/screen-agent/requirements-preview.txt
.venv-screen/bin/python hardware/screen-agent/screen_agent.py \
  --fixture hardware/screen-agent/fixture.json \
  --output hardware/screen-agent/preview.png
```

Sur le boîtier, suivez [le guide écran](docs/HARDWARE_SCREEN.md). L’écran est un
cockpit de lecture : vote, configuration et installation restent dans le web.

## Architecture et documentation

- [Architecture et limites](docs/ARCHITECTURE.md)
- [Parcours UX Stark](docs/UX.md)
- [Sécurité et modèle de menace](docs/SECURITY.md)
- [Exploitation, sauvegarde et restauration](docs/RUNBOOK.md)
- [Matériel NOD-I v1 et récupération](docs/HARDWARE_NODI_V1.md)
- [Contribution](CONTRIBUTING.md)
- [Index pour LLM](llms.txt)
- [Convention pour agents](AGENTS.md)

Validation complète :

```bash
npm run check
docker compose config
```

## Ce qui est réellement implémenté

| Capacité | État MVP | Limite connue |
|---|---|---|
| Bitcoin Core | image ARM64/AMD64, checksum vérifié, suivi RPC | synchronisation réelle à tester sur plusieurs boîtiers |
| Mineur loterie | build source épinglé, opt-in, pause thermique | pas une promesse de rendement |
| Store | catalogue, validation, propositions, vote, audit | identité locale non résistante aux attaques Sybil |
| Installation d’app | demande enregistrée après approbation | packaging/revue encore manuels |
| Écran | rendu PNG et pilote ST7789 testé sur un boîtier NOD-I v1 | brochage à revalider sur les autres révisions |

## Origine et licence

Ce projet est indépendant et non officiel. Les dépôts de
[l’organisation NOD-I](https://github.com/NOD-I) sont des références
historiques ; leurs binaires opaques et scripts destructifs ne sont pas repris.
Les contributions de ce dépôt sont sous [licence MIT](LICENSE). cpuminer est
construit depuis sa source GPL-2.0 et conserve sa licence dans son image.
