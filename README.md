# NOD-I Revival

Initiative communautaire pour remettre les boîtiers NOD-I en service avec une
base moderne, documentée et maintenable.

> [!IMPORTANT]
> Ce projet est une initiative indépendante et non officielle. Il n'est pas
> affilié à l'équipe ou à la société NOD-I d'origine. Le code historique reste
> soumis aux licences de ses dépôts respectifs.

## Notre objectif

Livrer rapidement une **NOD-I Community Edition** que l'on peut installer,
mettre à jour, diagnostiquer et restaurer sans dépendre de l'ancienne
infrastructure NOD-I.

Le premier jalon reste volontairement limité :

- Bitcoin Core sur ARM64 et x86_64 ;
- installation reproductible avec Docker Compose ;
- interface locale simple et état de synchronisation ;
- stockage persistant, sauvegarde et restauration documentées ;
- accès distant privé, sans exposer le RPC Bitcoin sur Internet ;
- validation sur plusieurs boîtiers NOD-I réels.

Les sources publiques historiques sont disponibles dans
[l'organisation GitHub NOD-I](https://github.com/NOD-I). Elles servent de
référence et certaines briques pourront être réutilisées après vérification de
leur licence, de leur sécurité et de leur compatibilité actuelle.

## État du projet

**Pré-alpha — organisation et reconstruction du socle.**

Le dépôt ne doit pas encore être utilisé avec des fonds réels. Les anciens
scripts système, mécanismes de wallet et artefacts d'installation ne doivent
jamais être exécutés sur un boîtier sans audit préalable.

## Priorités

### MVP — Bitcoin d'abord

- [ ] Inventorier les modèles de boîtiers et configurations existantes
- [ ] Créer un `compose.yaml` minimal et reproductible
- [ ] Démarrer Bitcoin Core avec une configuration sûre par défaut
- [ ] Restaurer ou reconstruire un dashboard local minimal
- [ ] Ajouter installation, mise à jour, sauvegarde et diagnostic
- [ ] Tester un redémarrage complet sans perte de données
- [ ] Valider l'installation sur au moins trois boîtiers
- [ ] Publier une première release communautaire

### Après le MVP

- [ ] Intégration propre de l'écran, du ventilateur et des LED
- [ ] Découverte locale avec `nodi.local`
- [ ] Image système ou installateur pour un boîtier vierge
- [ ] Lightning/LND après audit des sauvegardes et de la sécurité
- [ ] Catalogue communautaire d'applications

### Hors périmètre pour le moment

- wallet multichaîne et gestion de seeds ;
- conservation de fonds réels ;
- mining et applications expérimentales ;
- dépendance aux anciens domaines, registres Docker ou dépôts Debian NOD-I ;
- exécution automatique de scripts pouvant formater ou repartitionner un disque.

## Comment contribuer

Développeurs, administrateurs système, designers, rédacteurs et propriétaires
de boîtiers peuvent tous aider.

1. Consultez les issues existantes et choisissez une tâche non assignée.
2. Commentez l'issue avant de commencer pour éviter les doublons.
3. Forkez le dépôt et créez une branche courte, par exemple
   `feat/bitcoin-compose` ou `docs/raspberry-pi-5`.
4. Faites une modification ciblée, documentée et testable.
5. Ouvrez une pull request en expliquant le matériel utilisé, les tests
   effectués et les limites connues.

Pour proposer une direction importante, ouvrez d'abord une issue de discussion.
Les changements de stockage, réseau, authentification, wallet ou scripts lancés
avec `sudo` nécessitent une revue de sécurité avant fusion.

## Tester avec un boîtier NOD-I

Les retours matériels sont particulièrement précieux. Dans une issue, indiquez
si possible :

- modèle du boîtier ou du Raspberry Pi ;
- architecture (`arm64` ou `x86_64`) ;
- mémoire disponible ;
- type et capacité du disque ;
- système d'exploitation et version ;
- résultat de `docker version` et `docker compose version` ;
- comportement de l'écran, du ventilateur, des LED et du NVMe ;
- logs utiles après suppression de toute donnée sensible.

Ne publiez jamais de seed, clé privée, mot de passe, cookie, token, adresse IP
publique ou fichier `.env` complet.

## Règles techniques

- Aucun secret ou identifiant personnel dans Git.
- Aucun port RPC ou interface d'administration exposé publiquement par défaut.
- Les scripts destructifs doivent demander une confirmation explicite et
  vérifier précisément leur cible.
- Chaque service doit disposer d'un healthcheck et de données persistantes.
- Les configurations doivent fonctionner sur ARM64 et x86_64 ou documenter
  clairement leur limitation.
- Toute reprise de code historique doit conserver sa licence et son attribution.
- Une pull request doit rester assez petite pour être testée sur du vrai
  matériel.

## Définition du premier succès

Le MVP sera considéré comme utilisable lorsqu'un propriétaire pourra partir
d'un système Debian/Ubuntu propre, lancer une seule procédure d'installation,
ouvrir l'interface en local, redémarrer le boîtier sans perdre les données, puis
effectuer une sauvegarde et une restauration documentées.

## Licence

Les contributions originales de ce dépôt sont publiées sous licence MIT. Les
composants provenant d'autres dépôts conservent leur licence et leur historique
d'attribution d'origine.
