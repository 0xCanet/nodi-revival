# Runbook opérateur

## Préparation

1. Installez un Debian/Ubuntu 64 bits à jour et Docker Compose v2.
2. Vérifiez l’architecture avec `uname -m` et l’espace avec `df -h`.
3. Clonez le dépôt sur un disque non critique.
4. Lisez [le modèle de sécurité](SECURITY.md).

Le profil pruned par défaut réserve environ 200000 MiB. Ajustez
`BITCOIN_PRUNE_MIB` avant le premier démarrage si nécessaire. Ne réutilisez pas
un disque contenant des données non sauvegardées.

## Premier démarrage

```bash
./scripts/bootstrap.sh
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100 bitcoin api control-ui
```

Ouvrez `http://ADRESSE_DU_BOITIER:8080`. La première synchronisation peut durer
plusieurs jours. Un statut `syncing` est normal tant que les blocs progressent,
les pairs sont présents et l’espace disque reste suffisant.

## Mode cockpit seulement

Ce mode démarre l’API et l’interface sans lancer Bitcoin ni le mineur. Utilisez-
le pour vérifier le store, le SDK, les métriques et l’écran tout en gardant un
ancien NVMe démonté. Le cockpit affiche alors honnêtement Bitcoin `offline` et
le mineur `disabled`.

```bash
./scripts/bootstrap.sh
docker compose config
docker compose up -d --build --no-deps api
docker compose up -d --build --no-deps control-ui
curl --fail http://127.0.0.1:8080/api/health
```

Ces commandes peuvent créer les volumes Docker déclarés, mais ne montent aucun
disque hôte et ne démarrent pas le service `bitcoin`. Vérifiez avec :

```bash
docker compose ps api control-ui
docker compose ps bitcoin lottery-miner
findmnt
```

Ne montez jamais un disque historique en lecture/écriture pour « essayer » le
MVP. Suivez d’abord la procédure de
[récupération NOD-I v1](HARDWARE_NODI_V1.md#nvme-et-blockchain-existante).

## Diagnostic

```bash
curl --fail http://127.0.0.1:8080/api/health
curl --fail http://127.0.0.1:8080/api/status
docker compose exec bitcoin bitcoin-cli \
  -datadir=/data \
  -rpcuser="$BITCOIN_RPC_USER" \
  -rpcpassword="$BITCOIN_RPC_PASSWORD" \
  getblockchaininfo
```

Ne copiez pas la dernière commande et sa sortie dans une issue si elle révèle
un secret. Le cockpit n’affiche jamais le mot de passe RPC.

## Mineur loterie

Avant activation, contrôlez refroidissement, capteur thermique, coût électrique
et adresse de paiement. La probabilité de trouver un bloc est infime.

```bash
./scripts/configure-miner.sh bc1q_votre_adresse
docker compose --profile miner up -d --build lottery-miner
docker compose --profile miner logs -f --tail=100 lottery-miner
```

Arrêt immédiat :

```bash
docker compose --profile miner stop lottery-miner
```

Pour désactiver durablement, remettez `MINER_ENABLED=false` dans `.env`. Le
mineur se met en pause si le capteur atteint `MINER_MAX_TEMP_C` ; si le capteur
n’est pas disponible, surveillez la température du boîtier manuellement.

## Sauvegarde

Le nœud Bitcoin peut resynchroniser sa chaîne ; la donnée irremplaçable du MVP
est l’état du store. Arrêtez l’API pour obtenir une copie cohérente :

```bash
docker compose stop api
docker run --rm \
  --volume nodi_store-data:/source:ro \
  --volume "$PWD/backups:/backup" \
  alpine:3.23.3 \
  tar -czf /backup/nodi-data.tar.gz -C /source .
docker compose start api
```

Conservez aussi `.env` dans un gestionnaire de secrets, jamais dans Git.

## Restauration

La restauration recopie l’état sauvegardé : faites d’abord une sauvegarde, puis
vérifiez manuellement la cible `nodi_store-data` avec `docker volume ls`.

```bash
docker compose down
docker run --rm \
  --volume nodi_store-data:/target \
  --volume "$PWD/backups:/backup:ro" \
  alpine:3.23.3 \
  sh -c 'cd /target && tar -xzf /backup/nodi-data.tar.gz'
docker compose up -d
```

Le MVP ne fournit volontairement aucun script automatique qui efface le volume.

## Mise à jour

Lisez le changelog et sauvegardez avant toute mise à jour :

```bash
git pull --ff-only
npm ci
npm run check
docker compose build --pull
docker compose up -d
```

Vérifiez ensuite le cockpit, `/api/health`, la progression Bitcoin et l’écran.
