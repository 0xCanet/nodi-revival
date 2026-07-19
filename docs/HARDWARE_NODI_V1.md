# Matériel NOD-I v1 et récupération

Ce document décrit un boîtier NOD-I v1 observé le 19 juillet 2026. Il sert de
point de départ reproductible, pas de garantie pour toutes les révisions.

## Inventaire du boîtier de référence

| Élément | Valeur observée |
| --- | --- |
| Calcul | Raspberry Pi Compute Module 4 rev. 1.1, ARM64, 4 cœurs Cortex-A72 |
| Mémoire | 4 Go |
| Système | Debian 12 sur eMMC d’environ 16 Go |
| Données | NVMe PNY CS1030 1 To, contrôleur Silicon Motion SM2263 |
| Écran | ST7789 320×240, SPI0 CS0, DC 23, RESET 24, backlight 6 |
| Tactile historique | ST1633I, I²C 10, adresse `0x55`, RESET 20, INT 26 |
| Réseau | Ethernet RJ45 |

Le MVP n’utilise pas le tactile : les actions risquées restent dans le cockpit
web. Le ventilateur et les LED historiques sont inventoriés séparément avant
toute réécriture de leur service.

## Connecteur DEBUG et boutons

La carte porte un second USB-C interne marqué `DEBUG`, ainsi que `SW1 RESET` et
`SW2 BOOT`. Pour demander le mode de démarrage USB du Compute Module :

1. éteignez complètement le boîtier ;
2. reliez `DEBUG` au Mac ou au PC avec un câble USB-C qui transporte les données ;
3. maintenez `SW2 BOOT` ;
4. appuyez brièvement sur `SW1 RESET` ;
5. relâchez `SW2 BOOT` puis vérifiez l’énumération USB côté ordinateur.

Une variation du ventilateur ne prouve pas que le mode USB est actif. Vérifiez
la présence du périphérique avec l’outil hôte utilisé pour `rpiboot`. Le port
DEBUG n’est pas nécessaire pour un démarrage normal par eMMC et SSH.

## NVMe et blockchain existante

> [!CAUTION]
> N’exécutez aucun ancien script NOD-I qui appelle automatiquement `wipefs`,
> `parted`, `mkfs` ou supprime le contenu de `/mnt`. La présence ou l’absence
> d’un simple fichier marqueur ne constitue pas une protection de données.

Un contrôleur NVMe peut être visible sur le bus PCIe sans exposer sa partition
après un redémarrage à chaud. Sur le boîtier de référence, un arrêt électrique
complet d’environ 60 secondes a restauré le namespace. N’en déduisez jamais que
le disque est vide et ne le reformatez pas.

Première inspection, sans écriture :

```bash
sudo install -d -m 0755 /mnt/nodi-recovery
sudo mount -o ro,noload,nosuid,nodev,noexec \
  /dev/nvme0n1p1 /mnt/nodi-recovery
findmnt /mnt/nodi-recovery
sudo du -xhd2 /mnt/nodi-recovery
sudo umount /mnt/nodi-recovery
sudo e2fsck -f -n /dev/nvme0n1p1
```

`noload` empêche la relecture du journal ext4, donc le montage reste une vue de
récupération. `e2fsck -n` ne corrige rien. Avant un montage normal, une relecture
du journal ou un `e2fsck` avec écriture, effectuez une image complète sur un
autre disque de capacité suffisante ou acceptez explicitement que la blockchain
est retéléchargeable. Ne sauvegardez ni ne publiez les cookies RPC, mots de
passe, seeds ou métadonnées de wallet.

## Démarrage sûr du Revival

Pour afficher le MVP sans toucher au NVMe, laissez la partition démontée et
utilisez le [mode cockpit seulement](RUNBOOK.md#mode-cockpit-seulement). Il ne
démarre ni Bitcoin, ni mineur, ni wallet historique. Installez ensuite l’écran
avec [le guide ST7789](HARDWARE_SCREEN.md).

Avant de réutiliser une blockchain existante en lecture/écriture :

1. désactivez les anciens services de récupération automatique ;
2. sauvegardez les petites configurations sans exposer de secret ;
3. réalisez le contrôle de système de fichiers hors montage ;
4. définissez un nouveau point de montage explicite, jamais un chemin attendu
   par un ancien script ;
5. démarrez Bitcoin avec `-disablewallet=1` et sans RPC public ;
6. vérifiez la hauteur, les pairs, les logs et un redémarrage complet.
