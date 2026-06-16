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

| Paramètre | Défaut | Description |
|-----------|--------|-------------|
| Adresse IP | `192.168.1.100` | Adresse IP de la passerelle deCONZ / ConBee |
| Port REST | `80` | Port HTTP de l'API REST deCONZ |
| Port WebSocket | `443` | Port WebSocket pour les événements push deCONZ |
| Clé API | *(vide)* | Clé API deCONZ |
| Intervalle de polling | `60` | Intervalle de polling REST de secours en secondes |
| Appliquer automatiquement la roue chromatique | `true` | Définir automatiquement la couleur choisie sur la zone active |
| Temps de transition | `4` | Temps de transition lumineux par défaut par pas de 100 ms (4 = 400 ms) |
| Watchdog (minutes) | `120` | Délai d'expiration du watchdog ; reconnexion après N minutes sans événement WebSocket |

## Changelog

### 0.2.4 (2026-06-16)
* (ssbingo) Pairing UX improved: click button first, adapter polls deCONZ every 3s (max 60s) - no time pressure

### 0.2.3 (2026-06-15)
* (ssbingo) Couplage automatique de cle API ajoute: nouveau bouton dans les Parametres demande la cle a deCONZ et la remplit automatiquement

### 0.2.2 (2026-06-15)
* (ssbingo) Libellés corrigés · Descriptions ajoutées · UX amélioré avec vérification alive et délai d'attente

### 0.2.1 (2026-06-15)
* (ssbingo) Correctif: les panneaux étaient vides car `window.React` n'est pas un global dans admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: onglets lampes et groupes dans les paramètres de l'adaptateur; gestion des groupes (créer, modifier, supprimer); Node.js >= 22 requis

### 0.1.0 (2026-06-15)
* (ssbingo) Version initiale : lampes, groupes, scènes, télécommande Tint avec roue chromatique

## Licence

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
