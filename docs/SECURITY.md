# Modèle de sécurité

## Actifs protégés

- intégrité de la blockchain et des données du store ;
- secrets RPC Bitcoin ;
- ressources CPU, disque et température du boîtier ;
- réseau local de l’opérateur ;
- confiance dans le catalogue communautaire.

Le MVP ne gère ni seed ni clé privée et lance Bitcoin Core avec
`-disablewallet=1`.

## Frontières

- seul le port web 8080 et le P2P Bitcoin 8333 sont publiés ;
- le RPC 8332 reste sur le réseau Docker privé ;
- l’API web ne monte jamais le Docker socket ;
- le conteneur web perd toutes ses capabilities ; l’API ne reçoit que
  `CAP_CHOWN`, `CAP_SETGID` et `CAP_SETUID` pendant son entrypoint afin
  d’attribuer un volume neuf à l’utilisateur non privilégié `node`, puis
  `gosu` abandonne l’identité root et ces capabilities avant de démarrer le
  serveur HTTP ;
- le mineur est un profil Compose séparé, sans privilège et opt-in ;
- l’écran ne fait que lire `/api/screen`.

Le cockpit n’a pas encore d’authentification. Il doit donc rester sur un LAN de
confiance ou derrière un VPN/reverse proxy authentifié. Ne publiez jamais le
port 8080 directement sur Internet.

## Chaîne de dépendances

Bitcoin Core 31.0 est téléchargé depuis `bitcoincore.org` et son archive est
vérifiée par SHA-256 pour ARM64 et AMD64. Les sommes sont issues du fichier
officiel [SHA256SUMS](https://bitcoincore.org/bin/bitcoin-core-31.0/SHA256SUMS).

Le mineur utilise [pooler/cpuminer](https://github.com/pooler/cpuminer) au
commit `8da0556cec32819d967734527a8e0f1d8efb0671`. Il est compilé pendant le build ;
aucun ancien binaire NOD-I opaque n’est copié. Sa licence GPL-2.0 est embarquée
dans l’image finale.

Les images de base et dépendances npm sont épinglées à une version, mais pas
encore à un digest de contenu. Une release candidate devra pinner les digests,
publier une SBOM et faire vérifier les builds par CI.

## Menaces et réponses

| Menace | Réponse MVP | Risque restant |
|---|---|---|
| vol du secret RPC | réseau privé, `.env` mode 0600, secret aléatoire | accès root au boîtier |
| app malveillante | manifeste, source épinglée, vote, revue manuelle | sandbox de packaging future |
| faux votes | hachage et déduplication locale | identité non authentifiée/Sybil |
| surchauffe minage | 1 thread, seuil 75 °C, pause automatique | capteur absent ou mal monté |
| corruption store | écriture atomique, échec fermé | sauvegarde opérateur requise |
| épuisement disque | prune 200000 MiB, métriques disque | pas encore d’alerte prédictive |

## Signaler une faille

N’ouvrez pas immédiatement une issue publique avec un secret ou un exploit
opérationnel. Utilisez les GitHub Security Advisories du dépôt, puis fournissez
la version, l’architecture, l’impact et une reproduction minimale expurgée.
