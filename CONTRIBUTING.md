# Contribuer à NOD-I Revival

Merci de contribuer. Le dépôt accepte le code, les tests matériels, la
documentation, l’UX, la sécurité et les propositions d’apps.

## Choisir une contribution

1. Ouvrez ou commentez une issue pour éviter les doublons.
2. Gardez une branche et une pull request centrées sur un seul résultat.
3. Expliquez le matériel, l’architecture et les commandes réellement testées.
4. Ne publiez aucun `.env`, secret, seed, clé, IP publique ni log sensible.

Pour une app communautaire, utilisez le modèle d’issue « App proposal » et
ajoutez son manifeste sous `catalog/<app-id>/app.nodi.json` uniquement après la
phase de vote et de revue.

## Installer et vérifier

```bash
npm install
npm run check
```

Si Docker est disponible :

```bash
./scripts/bootstrap.sh
docker compose config
docker compose build
```

Une modification du pilote écran doit aussi fournir un rendu PNG avec la
fixture et préciser si elle a été testée sur un ST7789 réel.

## Conditions de fusion

- le comportement et les limites sont documentés ;
- les manifestes et règles de gouvernance ont des tests ;
- les versions externes sont épinglées ;
- aucun service web ne monte `/var/run/docker.sock` ;
- un changement privilégié ou matériel est explicite et réversible ;
- la PR indique honnêtement ce qui n’a pas été testé.

## Revue renforcée

Une double revue mainteneur est requise pour le stockage, les permissions root,
le réseau public, Bitcoin RPC, la chaîne d’installation, le pilote matériel et
toute nouvelle permission SDK. Le wallet et le formatage automatique restent
hors périmètre du MVP.
