![Logo](../../admin/tint.png)
# ioBroker.tint

## Adaptateur tint pour ioBroker

Contrôlez les éclairages intelligents **Müller Licht tint** Zigbee via une passerelle **deCONZ / ConBee**.
L'adaptateur offre un contrôle complet des lampes individuelles, des groupes et des scènes,
et décode tous les événements des boutons et de la roue chromatique de la télécommande Tint.

## Avertissement

Les noms **Müller Licht** et **tint** sont des marques commerciales de Müller-Licht International GmbH.
Cet adaptateur est un projet communautaire indépendant et n'est pas affilié à Müller-Licht.
La communication s'effectue exclusivement via l'API REST ouverte deCONZ de dresden elektronik.

## Fonctionnalités

- **Lampes** – allumer/éteindre, variation, température de couleur (2000–6500 K), couleur RGB (hex, XY, teinte/saturation)
- **Effets lumineux** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Groupes** – contrôler toutes les lampes d'un groupe avec un seul point de données
- **Scènes** – rappeler des scènes nommées par groupe
- **Télécommande Tint** – décodage complet des événements de boutons (pression courte, maintien, relâchement) et sélection de zone (1–3 / toutes)
- **Roue chromatique** – coordonnées CIE XY et couleur hex de chaque position de la roue ; application automatique optionnelle à la zone active
- **Roue de température de couleur** – valeur de température de couleur en Kelvin par événement de télécommande
- **Push en temps réel** – WebSocket deCONZ pour des mises à jour d'état instantanées
- **Polling de secours** – intervalle de polling REST configurable pour la résilience
- **Batterie et accessibilité** – surveillées pour chaque télécommande

## Prérequis

- Passerelle deCONZ / ConBee (ConBee I/II/III ou RaspBee) avec logiciel deCONZ ≥ 2.x
- Ampoules Müller Licht tint déjà associées à la passerelle deCONZ
- Clé API deCONZ (déverrouiller dans l'app deCONZ ou l'interface web Phoscon)
- Node.js ≥ 20

## Configuration

## Structure des objets

### Lampes (`lights.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom de la lampe dans deCONZ |
| `info.modelid` | string | R | Identifiant du modèle |
| `info.manufacturer` | string | R | Nom du fabricant |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `info.uniqueid` | string | R | Adresse IEEE Zigbee |
| `state.on` | boolean | R/W | Allumé / éteint |
| `state.brightness` | nombre (%) | R/W | Luminosité 0–100 % |
| `state.colorTemp` | nombre (K) | R/W | Température de couleur 2000–6500 K |
| `state.hue` | nombre | R/W | Teinte 0–65535 |
| `state.saturation` | nombre | R/W | Saturation 0–254 |
| `state.hex` | string | R/W | Couleur RGB sous forme de chaîne hex `#RRGGBB` |
| `state.x` | nombre | R/W | Chromaticité CIE x (brute) |
| `state.y` | nombre | R/W | Chromaticité CIE y (brute) |
| `state.colorMode` | string | R | Mode de couleur actif (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Effet lumineux (`none`, `colorloop`, …) |
| `state.effectSpeed` | nombre | R/W | Vitesse de l'effet 0–255 |
| `state.transitionTime` | nombre (×100 ms) | R/W | Temps de transition spécifique à la lampe |

### Groupes (`groups.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom du groupe |
| `info.memberCount` | nombre | R | Nombre de lampes dans le groupe |
| `info.allOn` | boolean | R | `true` quand toutes les lampes du groupe sont allumées |
| `info.anyOn` | boolean | R | `true` quand au moins une lampe est allumée |
| `action.on` | boolean | R/W | Allumer/éteindre toutes les lampes du groupe |
| `action.brightness` | nombre (%) | R/W | Luminosité du groupe 0–100 % |
| `action.colorTemp` | nombre (K) | R/W | Température de couleur du groupe 2000–6500 K |
| `action.hex` | string | R/W | Couleur RGB du groupe sous forme `#RRGGBB` |
| `action.effect` | string | R/W | Effet lumineux du groupe |
| `action.transitionTime` | nombre (×100 ms) | R/W | Temps de transition du groupe |
| `action.activateScene` | string | R/W | Écrire le nom d'une scène pour la rappeler |
| `scenes.<name>` | boolean | R/W | Mettre à `true` pour rappeler cette scène |

### Télécommandes (`remotes.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom de la télécommande |
| `info.battery` | nombre (%) | R | Niveau de batterie |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `info.lastSeen` | string | R | Horodatage de la dernière connexion |
| `button.lastEvent` | nombre | R | Code d'événement de bouton brut de deCONZ |
| `button.lastEventName` | string | R | Nom d'événement lisible |
| `button.pressType` | string | R | `short`, `hold` ou `release` |
| `button.activeZone` | nombre | R | Zone active : 0 = toutes, 1–3 = zone 1–3 |
| `colorWheel.angle` | nombre (°) | R | Angle de la roue chromatique 0–359 ° |
| `colorWheel.x` | nombre | R | CIE x de la couleur sélectionnée |
| `colorWheel.y` | nombre | R | CIE y de la couleur sélectionnée |
| `colorWheel.hex` | string | R | Couleur sélectionnée sous forme `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Passe brièvement à `true` à chaque événement de la roue |
| `colorTemp.value` | nombre (K) | R | Température de couleur sélectionnée en Kelvin |
| `colorTemp.mired` | nombre | R | Température de couleur sélectionnée en mired |
| `colorTemp.pressType` | string | R | `short` ou `hold` |

### Prises (`plugs.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom de la prise dans deCONZ |
| `info.modelid` | string | R | Identifiant du modèle |
| `info.manufacturer` | string | R | Nom du fabricant |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `info.uniqueid` | string | R | Adresse IEEE Zigbee |
| `state.on` | boolean | R/W | Allumé / éteint |

### Volets (`covers.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom du volet dans deCONZ |
| `info.modelid` | string | R | Identifiant du modèle |
| `info.manufacturer` | string | R | Nom du fabricant |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `info.uniqueid` | string | R | Adresse IEEE Zigbee |
| `state.position` | nombre (%) | R/W | Position, 0 = fermé, 100 = ouvert |
| `state.stop` | boolean | R/W | Écrire `true` pour arrêter le mouvement |

### Interrupteurs (`switches.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom de l'interrupteur dans deCONZ |
| `info.battery` | nombre (%) | R | Niveau de batterie |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `info.lastSeen` | string | R | Horodatage de la dernière connexion |
| `button.lastEvent` | nombre | R | Code d'événement de bouton brut de deCONZ |
| `button.lastEventName` | string | R | Nom d'événement lisible |

### Capteurs (`sensors.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom du capteur dans deCONZ |
| `info.battery` | nombre (%) | R | Niveau de batterie |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `info.lastSeen` | string | R | Horodatage de la dernière connexion |
| `value.temperature` | nombre (°C) | R | Température (capteurs ZHATemperature) |
| `value.humidity` | nombre (%) | R | Humidité (capteurs ZHAHumidity) |
| `value.pressure` | nombre (hPa) | R | Pression atmosphérique (capteurs ZHAPressure) |
| `value.open` | boolean | R | État ouvert/fermé (capteurs ZHAOpenClose) |
| `value.presence` | boolean | R | Mouvement détecté (capteurs ZHAPresence) |
| `value.brightness` | nombre (lux) | R | Niveau de lumière (capteurs ZHALightLevel) |
| `value.power` | nombre (W) | R | Puissance consommée (capteurs ZHAPower) |
| `value.consumption` | nombre (kWh) | R | Consommation d'énergie (capteurs ZHAConsumption) |
| `value.raw` | mixed | R | Valeur brute de repli pour les types de capteur non reconnus |

### Thermostats (`thermostats.<id>.*`)

| État | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Nom du thermostat dans deCONZ |
| `info.battery` | nombre (%) | R | Niveau de batterie |
| `info.reachable` | boolean | R | Accessibilité Zigbee |
| `state.temperature` | nombre (°C) | R | Température mesurée |
| `state.valve` | nombre (%) | R | Pourcentage d'ouverture de la vanne |
| `state.setpoint` | nombre (°C) | R/W | Température cible, 5–32 °C |

## Changelog




### 0.3.8 (2026-06-28)
* (ssbingo) Ajout d'un onglet de la barre latérale Admin pour le contrôle des appareils (Éclairages, Groupes, Prises, Volets, Interrupteurs, Capteurs, Thermostats) ; activation via « enableAdminTab » dans l'onglet Connexion des paramètres de l'adaptateur
### 0.3.7 (2026-06-28)
* (ssbingo) Correctifs: attributs xs/md/lg/xl ajoutés aux éléments staticText (E5507) ; clé i18n 'deCONZ Pairing' ajoutée (E5612) ; adapter.setTimeout transmis à DeconzWebSocket (E5005) ; CI mis à jour Node.js 24, adapter-tests dépend de check-and-lint (E3022/E3014) ; cooldown dependabot et ignorance versions majeures @types/node (E8917/E8915)
### 0.3.6 (2026-06-28)
* (ssbingo) Correctif : URL du dépôt dans package.json définie en format HTTPS pour que le vérificateur d'adaptateur ioBroker puisse résoudre l'URL raw de GitHub
### 0.3.5 (2026-06-28)
* (ssbingo) Mises à jour des dépendances : vite 8.1, @vitejs/plugin-react v6 (compatibilité Vite 8), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Correctif : le logo (admin/tint.png) était en 300×358 (non carré), ce que signalait le vérificateur du dépôt ; complété à 358×358 avec une bordure transparente, sans rogner ni déformer le contenu

## Documentation

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Les anciens journaux des modifications se trouvent dans [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Licence

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
