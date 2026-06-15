![Logo](../../admin/tint.png)
# ioBroker.tint

## tint Adapter für ioBroker

Steuerung von **Müller Licht tint** Zigbee-Leuchten über ein **deCONZ / ConBee** Gateway.
Der Adapter bietet vollständige Kontrolle über einzelne Lampen, Lampengruppen und Szenen und
dekodiert alle Tasten- und Farbrad-Ereignisse der Tint-Fernbedienung.

## Haftungsausschluss

Die Namen **Müller Licht** und **tint** sind Marken der Müller-Licht International GmbH.
Dieser Adapter ist ein unabhängiges Community-Projekt und steht in keiner Verbindung zu Müller-Licht.
Die Kommunikation erfolgt ausschließlich über die offene deCONZ REST-API von dresden elektronik.

## Funktionen

- **Einzellampen** – ein/aus, dimmen, Farbtemperatur (2000–6500 K), RGB-Farbe (Hex, XY, Hue/Sättigung)
- **Lichteffekte** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Gruppen** – alle Lampen einer Gruppe mit einem Datenpunkt steuern
- **Szenen** – benannte Szenen pro Gruppe abrufen
- **Tint-Fernbedienung** – vollständige Dekodierung von Tastenereignissen (kurz, gehalten, loslassen) und Zonen-Auswahl (1–3 / alle)
- **Farbrad** – CIE-XY-Koordinaten und Hex-Farbe aus jeder Raddrehung; optionale automatische Anwendung auf die aktive Zone
- **Farbtemperaturrad** – Farbtemperaturwert in Kelvin für jedes Fernbedienungsereignis
- **Echtzeit-Push** – deCONZ WebSocket für sofortige Zustandsaktualisierungen
- **Fallback-Polling** – konfigurierbares REST-Abfrageintervall für Ausfallsicherheit
- **Akku & Erreichbarkeit** – für jede Fernbedienung überwacht

## Voraussetzungen

- deCONZ / ConBee Gateway (ConBee I/II/III oder RaspBee) mit deCONZ Software ≥ 2.x
- Müller Licht tint Lampen, die bereits mit dem deCONZ Gateway gekoppelt sind
- deCONZ API-Schlüssel (freischalten über die deCONZ-App oder das Phoscon-Webinterface)
- Node.js ≥ 20

## Konfiguration

| Parameter | Standard | Beschreibung |
|-----------|----------|--------------|
| IP-Adresse | `192.168.1.100` | IP-Adresse des deCONZ / ConBee Gateways |
| REST-Port | `80` | HTTP-Port der deCONZ REST-API |
| WebSocket-Port | `443` | WebSocket-Port für Push-Ereignisse von deCONZ |
| API-Schlüssel | *(leer)* | deCONZ API-Schlüssel (in Phoscon / deCONZ-Einstellungen freischalten) |
| Abfrageintervall | `60` | Fallback REST-Abfrageintervall in Sekunden |
| Farbrad automatisch anwenden | `true` | Gewählte Farbe automatisch auf die aktive Zone setzen, wenn das Farbrad der Fernbedienung gedreht wird |
| Übergangszeit | `4` | Standard-Lichtübergangszeit in Schritten von 100 ms (4 = 400 ms) |
| Watchdog (Minuten) | `120` | Watchdog-Timeout; Adapter stellt Verbindung wieder her nach so vielen Minuten ohne WebSocket-Ereignis |

### API-Schlüssel ermitteln

1. Phoscon-Webinterface öffnen (meistens `http://<gateway-ip>/pwa`).
2. **Einstellungen → Gateway → Erweitert** aufrufen.
3. Auf **App authentifizieren** klicken und den generierten API-Schlüssel kopieren.

## Objektstruktur

### Lampen (`lights.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|------------|-----|-----|--------------|
| `info.name` | string | R | Lampennamen aus deCONZ |
| `info.modelid` | string | R | Modell-ID |
| `info.manufacturer` | string | R | Herstellername |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `info.uniqueid` | string | R | Zigbee IEEE-Adresse |
| `state.on` | boolean | R/W | Ein / Aus |
| `state.brightness` | Zahl (%) | R/W | Helligkeit 0–100 % |
| `state.colorTemp` | Zahl (K) | R/W | Farbtemperatur 2000–6500 K |
| `state.hue` | Zahl | R/W | Farbton 0–65535 |
| `state.saturation` | Zahl | R/W | Sättigung 0–254 |
| `state.hex` | string | R/W | RGB-Farbe als `#RRGGBB` |
| `state.x` | Zahl | R/W | CIE-x-Chromatizität (Rohwert) |
| `state.y` | Zahl | R/W | CIE-y-Chromatizität (Rohwert) |
| `state.colorMode` | string | R | Aktiver Farbmodus (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Lichteffekt (`none`, `colorloop`, …) |
| `state.effectSpeed` | Zahl | R/W | Effektgeschwindigkeit 0–255 |
| `state.transitionTime` | Zahl (×100 ms) | R/W | Übergangszeit-Überschreibung pro Lampe |

### Gruppen (`groups.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|------------|-----|-----|--------------|
| `info.name` | string | R | Gruppenname |
| `info.memberCount` | Zahl | R | Anzahl der Lampen in der Gruppe |
| `info.allOn` | boolean | R | `true` wenn alle Lampen der Gruppe an sind |
| `info.anyOn` | boolean | R | `true` wenn mindestens eine Lampe an ist |
| `action.on` | boolean | R/W | Alle Lampen der Gruppe schalten |
| `action.brightness` | Zahl (%) | R/W | Gruppenhelligkeit 0–100 % |
| `action.colorTemp` | Zahl (K) | R/W | Gruppen-Farbtemperatur 2000–6500 K |
| `action.hex` | string | R/W | Gruppen-RGB-Farbe als `#RRGGBB` |
| `action.effect` | string | R/W | Gruppen-Lichteffekt |
| `action.transitionTime` | Zahl (×100 ms) | R/W | Gruppen-Übergangszeit-Überschreibung |
| `action.activateScene` | string | R/W | Szene durch Schreiben des Namens abrufen |
| `scenes.<name>` | boolean | R/W | `true` setzen, um die Szene abzurufen |

### Fernbedienungen (`remotes.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|------------|-----|-----|--------------|
| `info.name` | string | R | Name der Fernbedienung |
| `info.battery` | Zahl (%) | R | Akkustand |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `info.lastSeen` | string | R | Zuletzt gesehen Zeitstempel |
| `button.lastEvent` | Zahl | R | Roher deCONZ-Tastenereignis-Code |
| `button.lastEventName` | string | R | Lesbarer Ereignisname |
| `button.pressType` | string | R | `short`, `hold` oder `release` |
| `button.activeZone` | Zahl | R | Aktive Zone: 0 = alle, 1–3 = Zone 1–3 |
| `colorWheel.angle` | Zahl (°) | R | Farbrad-Winkel 0–359 ° |
| `colorWheel.x` | Zahl | R | CIE-x der gewählten Farbe |
| `colorWheel.y` | Zahl | R | CIE-y der gewählten Farbe |
| `colorWheel.hex` | string | R | Gewählte Farbe als `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Pulsiert bei jedem Farbrad-Ereignis |
| `colorTemp.value` | Zahl (K) | R | Gewählte Farbtemperatur in Kelvin |
| `colorTemp.mired` | Zahl | R | Gewählte Farbtemperatur in Mired |
| `colorTemp.pressType` | string | R | `short` oder `hold` |

## Changelog

### 0.2.0 (2026-06-15)
* (ssbingo) Admin-UI: Lampen- und Gruppen-Tabs in den Adaptereinstellungen; Gruppenverwaltung (erstellen, bearbeiten, löschen); Node.js >= 22 erforderlich

### 0.1.0 (2026-06-15)
* (ssbingo) Erstveröffentlichung: Lampen, Gruppen, Szenen, Tint-Fernbedienung mit Farbrad

## Lizenz

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>

Hiermit wird unentgeltlich jeder Person, die eine Kopie der Software und der zugehörigen
Dokumentationen (die „Software") erhält, die Erlaubnis erteilt, sie uneingeschränkt zu nutzen,
inklusive und ohne Ausnahme mit dem Recht, sie zu verwenden, zu kopieren, zu ändern,
zusammenzuführen, zu veröffentlichen, zu verbreiten, zu unterlizenzieren und/oder zu verkaufen.

Die Software wird ohne jede ausdrückliche oder implizierte Garantie bereitgestellt,
einschließlich der Garantie zur Tauglichkeit für einen bestimmten Zweck und der
Nichtverletzung von Rechten Dritter.
