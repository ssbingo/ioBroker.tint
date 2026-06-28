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

## Objektstruktur

### Lampen (`lights.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
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
| `state.transitionTime` | Zahl (×100 ms) | R/W | Übergangszeit-Überschreibung pro Lampe |

### Gruppen (`groups.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `info.name` | string | R | Gruppenname |
| `info.memberCount` | Zahl | R | Anzahl der Lampen in der Gruppe |
| `info.allOn` | boolean | R | `true` wenn alle Lampen der Gruppe an sind |
| `info.anyOn` | boolean | R | `true` wenn mindestens eine Lampe an ist |
| `action.on` | boolean | R/W | Alle Lampen der Gruppe schalten |
| `action.brightness` | Zahl (%) | R/W | Gruppenhelligkeit 0–100 % |
| `action.colorTemp` | Zahl (K) | R/W | Gruppen-Farbtemperatur 2000–6500 K |
| `action.hex` | string | R/W | Gruppen-RGB-Farbe als `#RRGGBB` |
| `action.effect` | string | R/W | Gruppen-Lichteffekt |
| `action.transitionTime` | Zahl (×100 ms) | R/W | Gruppen-Übergangszeit-Überschreibung |
| `action.activateScene` | string | R/W | Szene durch Schreiben des Namens abrufen |
| `scenes.<name>` | boolean | R/W | `true` setzen, um die Szene abzurufen |

### Fernbedienungen (`remotes.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
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

### Steckdosen (`plugs.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `info.name` | string | R | Steckdosenname aus deCONZ |
| `info.modelid` | string | R | Modell-ID |
| `info.manufacturer` | string | R | Herstellername |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `info.uniqueid` | string | R | Zigbee IEEE-Adresse |
| `state.on` | boolean | R/W | Ein / Aus |

### Rollos (`covers.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `info.name` | string | R | Rollo-Name aus deCONZ |
| `info.modelid` | string | R | Modell-ID |
| `info.manufacturer` | string | R | Herstellername |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `info.uniqueid` | string | R | Zigbee IEEE-Adresse |
| `state.position` | Zahl (%) | R/W | Position, 0 = geschlossen, 100 = offen |
| `state.stop` | boolean | R/W | `true` schreiben, um die Bewegung zu stoppen |

### Schalter (`switches.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `info.name` | string | R | Schaltername aus deCONZ |
| `info.battery` | Zahl (%) | R | Akkustand |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `info.lastSeen` | string | R | Zuletzt gesehen Zeitstempel |
| `button.lastEvent` | Zahl | R | Roher deCONZ-Tastenereignis-Code |
| `button.lastEventName` | string | R | Lesbarer Ereignisname |

### Sensoren (`sensors.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `info.name` | string | R | Sensorname aus deCONZ |
| `info.battery` | Zahl (%) | R | Akkustand |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `info.lastSeen` | string | R | Zuletzt gesehen Zeitstempel |
| `value.temperature` | Zahl (°C) | R | Temperatur (ZHATemperature-Sensoren) |
| `value.humidity` | Zahl (%) | R | Luftfeuchtigkeit (ZHAHumidity-Sensoren) |
| `value.pressure` | Zahl (hPa) | R | Luftdruck (ZHAPressure-Sensoren) |
| `value.open` | boolean | R | Offen/Geschlossen-Zustand (ZHAOpenClose-Sensoren) |
| `value.presence` | boolean | R | Bewegung erkannt (ZHAPresence-Sensoren) |
| `value.brightness` | Zahl (lux) | R | Helligkeit (ZHALightLevel-Sensoren) |
| `value.power` | Zahl (W) | R | Leistungsaufnahme (ZHAPower-Sensoren) |
| `value.consumption` | Zahl (kWh) | R | Energieverbrauch (ZHAConsumption-Sensoren) |
| `value.raw` | mixed | R | Rohwert-Fallback für nicht erkannte Sensortypen |

### Thermostate (`thermostats.<id>.*`)

| Datenpunkt | Typ | R/W | Beschreibung |
|---|---|---|---|
| `info.name` | string | R | Thermostatname aus deCONZ |
| `info.battery` | Zahl (%) | R | Akkustand |
| `info.reachable` | boolean | R | Zigbee-Erreichbarkeit |
| `state.temperature` | Zahl (°C) | R | Gemessene Temperatur |
| `state.valve` | Zahl (%) | R | Ventilöffnung in Prozent |
| `state.setpoint` | Zahl (°C) | R/W | Zieltemperatur, 5–32 °C |

## Changelog




### 0.3.9 (2026-06-28)
* (ssbingo) Bugfix: @mui/material devDep von v9 auf v6 zurückgesetzt — das v9-Fallback-Bundle hat beim MF-Shared-Module-Abgleich Admins Emotion v6 zum Absturz gebracht und verhinderte das Öffnen der Adaptereinstellungen

### 0.3.8 (2026-06-28)
* (ssbingo) Admin-Seitenleisten-Tab zur Gerätesteuerung hinzugefügt (Leuchten, Gruppen, Steckdosen, Rollos, Schalter, Sensoren, Thermostate); Aktivierung über „enableAdminTab" im Verbindungs-Tab der Adaptereinstellungen
### 0.3.7 (2026-06-28)
* (ssbingo) Bugfix: xs/md/lg/xl-Grid-Attribute zu staticText-Elementen ergänzt (E5507); i18n-Schlüssel 'deCONZ Pairing' hinzugefügt (E5612); adapter.setTimeout an DeconzWebSocket übergeben (E5005); CI auf Node.js 24 aktualisiert, adapter-tests braucht check-and-lint (E3022/E3014); dependabot-Cooldown und @types/node-Major-Version-Ignorierung ergänzt (E8917/E8915)
### 0.3.6 (2026-06-28)
* (ssbingo) Bugfix: Repository-URL in package.json auf HTTPS-Format gesetzt, damit der ioBroker-Adapter-Checker die GitHub-Raw-URL auflösen kann
### 0.3.5 (2026-06-28)
* (ssbingo) Abhängigkeits-Updates: vite 8.1, @vitejs/plugin-react v6 (Vite-8-Kompatibilität), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Bugfix: Logo (admin/tint.png) war 300×358 (nicht quadratisch), was der Repository-Checker bemängelt; auf 358×358 mit transparentem Rand aufgefüllt, kein Bildinhalt beschnitten oder verzerrt

## Dokumentation

- 🇬🇧 [English documentation](../../README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Ältere Änderungsprotokolle findest du in [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

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
