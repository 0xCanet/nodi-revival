# SDK d’applications NOD-I

Le SDK v1 est un contrat de description, pas un lanceur privilégié. Il fournit
des types TypeScript, une validation sans dépendance, une CLI et un JSON Schema.

## Démarrage

```bash
npm install
cp -R examples/hello-nodi mon-app
npm run build -w @nodi/sdk
node packages/sdk/dist/cli.js validate mon-app/app.nodi.json
```

Une validation réussie retourne le nom et la version de l’app. Une erreur
retourne chaque chemin JSON invalide et un code de sortie non nul.

## Contrat `app.nodi.json`

| Bloc | Rôle |
|---|---|
| `metadata` | identité, version SemVer, auteur, licence et dépôt public |
| `spec.architectures` | `arm64`, `amd64`, ou les deux |
| `spec.runtime` | fichier Compose relatif et source Git épinglée |
| `spec.permissions` | capacités visibles avant le vote |
| `spec.resources` | budgets CPU, mémoire et stockage déclarés |
| `spec.healthcheck` | preuve minimale de fonctionnement |
| `governance` | état `candidate`, `approved`, `rejected` ou `core` |

Le [schéma canonique](../packages/sdk/schema/app-manifest.schema.json) et le
[validateur exécutable](../packages/sdk/src/validate.ts) doivent évoluer dans la
même pull request.

## Permissions v1

- `bitcoin.rpc.read` : lecture RPC Bitcoin ;
- `bitcoin.rpc.write` : commandes RPC modificatrices, revue renforcée ;
- `hardware.gpio` : accès GPIO, revue matérielle obligatoire ;
- `hardware.temperature.read` : lecture de température uniquement ;
- `network.inbound` : écoute sur le réseau de la NOD-I ;
- `network.outbound` : accès sortant ;
- `storage.persistent` : données persistantes.

Le manifeste déclare l’intention. Le futur packager devra encore traduire ces
permissions en isolation Docker effective ; une déclaration ne constitue pas
à elle seule une sandbox.

## Contraintes de source

`spec.runtime.source.ref` doit être un tag de release ou, de préférence, un SHA
de commit immuable. `main`, `master` et `latest` sont refusés. Le Compose ne doit
pas utiliser de mode privilégié, monter le Docker socket, lire les secrets de
l’hôte ni télécharger puis exécuter un script non épinglé.

## Proposer par API

Le cockpit SDK envoie le manifeste à `POST /api/proposals` avec un
`proposerId`. Le serveur valide le manifeste, force son état à `candidate`,
hache l’identifiant et ajoute un événement d’audit. Voir
[la gouvernance](GOVERNANCE.md) pour la suite.

## Compatibilité LLM

Les noms de champs sont stables, explicites et décrits par JSON Schema. Un agent
doit lire, dans l’ordre : [AGENTS.md](../AGENTS.md),
[l’architecture](ARCHITECTURE.md), ce guide, puis le schéma. Il ne doit jamais
déduire une permission absente ni exécuter un manifeste candidat.
