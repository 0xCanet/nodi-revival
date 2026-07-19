# Gouvernance du store

L’objectif est qu’une app soit visible et compréhensible avant installation,
puis admise par la communauté. Le vote ne remplace pas la revue de sécurité.

## Cycle de vie

```text
proposition -> validation SDK -> candidate -> vote communautaire
                                            -> approved si quorum atteint
                                            -> rejected si majorité négative
approved -> demande d’installation -> revue et packaging mainteneur
```

Les apps `core` appartiennent au MVP et sont versionnées avec le dépôt. Une app
communautaire ne peut pas se déclarer elle-même `core` : l’API force toute
nouvelle proposition à `candidate`.

## Règle MVP

- quorum par défaut : 5 votants distincts ;
- approbation : au moins 66 % de votes favorables ;
- avant quorum : décision `pending` ;
- une identité peut changer son vote, sans le dupliquer ;
- les identifiants sont hachés en SHA-256 avant persistance ;
- votes, propositions et demandes d’installation sont audités.

Ces valeurs sont configurables avec `STORE_QUORUM` et
`STORE_APPROVAL_PERCENT`.

## Limite d’identité

Le MVP utilise un identifiant local choisi par l’utilisateur. Il rend les votes
lisibles et dédoublonnés sur une instance, mais il n’est pas résistant aux
attaques Sybil. Il ne faut donc pas présenter le résultat comme un vote public
fortement authentifié. La prochaine étape est une identité GitHub/OIDC et une
preuve publique liée à l’issue de proposition.

## Revue obligatoire après vote

Avant qu’une app approuvée entre dans le catalogue installable, un mainteneur
vérifie :

1. dépôt et licence publics ;
2. commit ou tag immuable ;
3. Dockerfile et chaîne de dépendances ;
4. concordance entre permissions déclarées et comportement ;
5. absence de mode privilégié, Docker socket, secrets et ports inutiles ;
6. fonctionnement ARM64/AMD64 déclaré ;
7. désinstallation et persistance des données.

Dans le MVP, `POST /api/apps/:id/install-requests` ne fait qu’enregistrer une
demande. Aucune requête HTTP ne peut lancer un Compose arbitraire.

## Données et reprise

L’état vit dans `/data/store/store.json`. Chaque écriture utilise un fichier
temporaire puis un renommage atomique. Un fichier corrompu fait échouer le
démarrage : il n’est jamais remplacé silencieusement par le catalogue initial.
La sauvegarde et la restauration sont décrites dans [le runbook](RUNBOOK.md).
