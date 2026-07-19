# Runbook opérateur

## Préparation

1. Installez un Debian/Ubuntu 64 bits à jour et Docker Compose v2.
2. Vérifiez l’architecture avec `uname -m` et l’espace avec `df -h`.
3. Clonez le dépôt sur un disque non critique.
4. Lisez [le modèle de sécurité](SECURITY.md).

Le profil pruned par défaut réserve environ 100000 MiB. Ajustez
`BITCOIN_PRUNE_MIB` avant le premier démarrage si nécessaire. Ne réutilisez pas
un disque contenant des données non sauvegardées.

| Stockage disponible | Réglage conseillé | Usage |
| --- | ---: | --- |
| 1 To | `BITCOIN_PRUNE_MIB=100000` | profil NOD-I recommandé |
| 64 Go | `BITCOIN_PRUNE_MIB=10000` | nœud compact dédié |
| 32 Go | `BITCOIN_PRUNE_MIB=2000` à `5000` | très serré, à surveiller |
| eMMC 16 Go | non supporté | la chainstate et le système ne tiennent pas confortablement |

Le [mode pruned documenté par Bitcoin Core](https://bitcoin.org/en/full-node.html#reduce-storage)
télécharge et valide bien toute l’histoire de Bitcoin, puis supprime les
anciens fichiers de blocs au-delà de la cible. Il reste donc un nœud pleinement
validateur, mais pas un nœud d’archive : il ne peut pas servir les anciens blocs
supprimés, `txindex` est désactivé et une reconstruction complète des index peut
nécessiter un nouveau téléchargement.

Pour réutiliser un datadir Bitcoin existant, indiquez son chemin absolu dans
`.env` avant le démarrage :

```bash
BITCOIN_DATA_PATH=/srv/nodi-data/hdd/app-data/btc/.bitcoin
```

Le premier démarrage attribue une seule fois le datadir à l’UID dédié `10001`.
Bitcoin Core peut ensuite rejouer le journal, mettre ses index à niveau et
supprimer les blocs dépassant la cible `BITCOIN_PRUNE_MIB`. Une blockchain est
retéléchargeable ; une éventuelle donnée de wallet ne l’est pas et reste hors
périmètre de ce MVP (`disablewallet=1`).

## Premier démarrage

Le chemin recommandé prépare la configuration, démarre Bitcoin, l’API et le
cockpit, puis construit le mineur sans l’activer :

```bash
./scripts/revive.sh --bitcoin-data /srv/nodi-data/bitcoin
```

Le disque doit déjà être monté. Le script ne lance ni `parted`, ni `mkfs`, ni
formatage implicite. Ajoutez `--miner-address bc1q_votre_adresse` uniquement si
vous souhaitez activer immédiatement le minage opt-in.

Équivalent manuel :

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

Sur le Compute Module 4, le RPC peut répondre plus lentement pendant la
validation. `BITCOIN_RPC_TIMEOUT_MS=15000` évite les faux états `offline` sans
exposer le RPC ni masquer une erreur persistante.

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

Sur certains noyaux NOD-I historiques, Docker peut signaler que la limite
mémoire du conteneur n’est pas supportée par les cgroups. Le mineur conserve sa
limite à un thread et son arrêt thermique, mais la limite `256m` n’est alors pas
appliquée par le noyau. Ne masquez pas cet avertissement dans un diagnostic.

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
