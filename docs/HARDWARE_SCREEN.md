# Écran ST7789 320×240

L’écran physique est une synthèse de lecture : synchronisation Bitcoin, état du
mineur, température, candidats du store et première alerte. Les actions restent
dans le cockpit web pour éviter une opération sensible par erreur.

## Prévisualiser sans matériel

```bash
python3 -m venv .venv-screen
.venv-screen/bin/pip install -r hardware/screen-agent/requirements-preview.txt
.venv-screen/bin/python hardware/screen-agent/screen_agent.py \
  --fixture hardware/screen-agent/fixture.json \
  --output hardware/screen-agent/preview.png
```

Le PNG doit mesurer exactement 320×240 et rester lisible à taille réelle.

## Brochage NOD-I v1 validé

Le fichier `hardware/screen-agent/config.example.json` reprend la configuration
historique validée sur un NOD-I v1 réel : SPI0 CS0, DC 23, reset 24 et
rétroéclairage 6.
La rotation logicielle par défaut est `0`, valeur compatible avec la matrice
rectangulaire 320×240 du pilote ; utilisez `180` si le boîtier est inversé.
Les révisions matérielles peuvent différer. Vérifiez le câblage avant de lancer
le service ; le script d’installation conserve toujours un fichier
`/etc/nodi/screen.json` existant. Le contrôleur tactile ST1633I historique
n’est volontairement pas utilisé : l’écran du MVP reste en lecture seule.

## Installer sur le boîtier

Activez SPI dans le système, puis depuis le dépôt :

```bash
sudo hardware/screen-agent/install.sh
sudoedit /etc/nodi/screen.json
sudo systemctl restart nodi-screen
sudo journalctl -u nodi-screen -f
```

Le service crée un utilisateur non connecté `nodi-screen`, une virtualenv
dédiée et un service systemd durci. Il ne modifie ni les partitions ni le
stockage Bitcoin.

Validation réalisée sur le boîtier de référence : service sous utilisateur non
privilégié, accès par groupes `spi` et `gpio`, rendu réel 320×240 et API locale
sans secret. L’ancienne boucle d’affichage sans temporisation consommait plus de
la moitié d’un cœur ; l’agent Revival attend cinq secondes entre deux images.

## API consommée

`GET /api/screen` retourne un petit JSON stable. L’agent n’a besoin d’aucun
secret et ne contacte pas Bitcoin RPC directement. En cas d’échec réseau, la
dernière image reste affichée et l’erreur est envoyée au journal systemd.
