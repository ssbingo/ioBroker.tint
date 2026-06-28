![Logo](../../admin/tint.png)
# ioBroker.tint

## tint adapter voor ioBroker

Bedien **Müller Licht tint** Zigbee slimme lampen via een **deCONZ / ConBee** gateway.
De adapter biedt volledige controle over individuele lampen, groepen en scènes,
en decodeert alle knop- en kleurenwiel-events van de Tint afstandsbediening.

## Disclaimer

De namen **Müller Licht** en **tint** zijn handelsmerken van Müller-Licht International GmbH.
Deze adapter is een onafhankelijk community-project en heeft geen verbinding met Müller-Licht.
De communicatie verloopt uitsluitend via de open deCONZ REST-API van dresden elektronik.

## Functies

- **Lampen** – aan/uit, dimmen, kleurtemperatuur (2000–6500 K), RGB-kleur (hex, XY, tint/verzadiging)
- **Lichteffecten** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Groepen** – alle lampen in een groep met één datapunt aansturen
- **Scènes** – benoemde scènes per groep oproepen
- **Tint afstandsbediening** – volledige decodering van knopevents (kort, houden, loslaten) en zoneselectie (1–3 / alle)
- **Kleurenwiel** – CIE XY-coördinaten en hex-kleur van elke wielpositie; optioneel automatisch toepassen op de actieve zone
- **Kleurtemperatuurwiel** – kleurtemperatuurwaarde in Kelvin per afstandsbedieningsevent
- **Realtime push** – deCONZ WebSocket voor directe statusupdates
- **Fallback polling** – configureerbaar REST-polling-interval voor veerkracht
- **Batterij & bereikbaarheid** – bewaakt voor elke afstandsbediening

## Vereisten

- deCONZ / ConBee gateway (ConBee I/II/III of RaspBee) met deCONZ software ≥ 2.x
- Müller Licht tint lampen reeds gekoppeld aan de deCONZ gateway
- deCONZ API-sleutel (ontgrendelen in de deCONZ-app of Phoscon webinterface)
- Node.js ≥ 20

## Configuratie

## Objectstructuur

### Lampen (`lights.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Lampnaam uit deCONZ |
| `info.modelid` | string | R | Model-ID |
| `info.manufacturer` | string | R | Fabrikantnaam |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `info.uniqueid` | string | R | Zigbee IEEE-adres |
| `state.on` | boolean | R/W | Aan / uit |
| `state.brightness` | getal (%) | R/W | Helderheid 0–100 % |
| `state.colorTemp` | getal (K) | R/W | Kleurtemperatuur 2000–6500 K |
| `state.hue` | getal | R/W | Tint 0–65535 |
| `state.saturation` | getal | R/W | Verzadiging 0–254 |
| `state.hex` | string | R/W | RGB-kleur als `#RRGGBB` hex-string |
| `state.x` | getal | R/W | CIE x-chromaticiteit (ruw) |
| `state.y` | getal | R/W | CIE y-chromaticiteit (ruw) |
| `state.colorMode` | string | R | Actieve kleurmodus (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Lichteffect (`none`, `colorloop`, …) |
| `state.effectSpeed` | getal | R/W | Effectsnelheid 0–255 |
| `state.transitionTime` | getal (×100 ms) | R/W | Overgangstijd specifiek voor deze lamp |

### Groepen (`groups.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Groepsnaam |
| `info.memberCount` | getal | R | Aantal lampen in de groep |
| `info.allOn` | boolean | R | `true` als alle lampen in de groep aan staan |
| `info.anyOn` | boolean | R | `true` als minstens één lamp aan staat |
| `action.on` | boolean | R/W | Alle lampen in de groep schakelen |
| `action.brightness` | getal (%) | R/W | Groepshelderheid 0–100 % |
| `action.colorTemp` | getal (K) | R/W | Groepskleurtemperatuur 2000–6500 K |
| `action.hex` | string | R/W | Groeps-RGB-kleur als `#RRGGBB` |
| `action.effect` | string | R/W | Lichteffect van de groep |
| `action.transitionTime` | getal (×100 ms) | R/W | Overgangstijd van de groep |
| `action.activateScene` | string | R/W | Schrijf een scènenaam om deze op te roepen |
| `scenes.<name>` | boolean | R/W | Zet op `true` om deze scène op te roepen |

### Afstandsbedieningen (`remotes.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Naam van de afstandsbediening |
| `info.battery` | getal (%) | R | Batterijniveau |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `info.lastSeen` | string | R | Tijdstempel laatst gezien |
| `button.lastEvent` | getal | R | Ruwe deCONZ-knopgebeurteniscode |
| `button.lastEventName` | string | R | Leesbare gebeurtenisnaam |
| `button.pressType` | string | R | `short`, `hold` of `release` |
| `button.activeZone` | getal | R | Actieve zone: 0 = alle, 1–3 = zone 1–3 |
| `colorWheel.angle` | getal (°) | R | Hoek van het kleurenwiel 0–359 ° |
| `colorWheel.x` | getal | R | CIE x van de gekozen kleur |
| `colorWheel.y` | getal | R | CIE y van de gekozen kleur |
| `colorWheel.hex` | string | R | Gekozen kleur als `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Wordt kort `true` bij elke wielgebeurtenis |
| `colorTemp.value` | getal (K) | R | Gekozen kleurtemperatuur in Kelvin |
| `colorTemp.mired` | getal | R | Gekozen kleurtemperatuur in mired |
| `colorTemp.pressType` | string | R | `short` of `hold` |

### Stekkers (`plugs.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Stekkernaam uit deCONZ |
| `info.modelid` | string | R | Model-ID |
| `info.manufacturer` | string | R | Fabrikantnaam |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `info.uniqueid` | string | R | Zigbee IEEE-adres |
| `state.on` | boolean | R/W | Aan / uit |

### Rolluiken (`covers.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Naam van het rolluik uit deCONZ |
| `info.modelid` | string | R | Model-ID |
| `info.manufacturer` | string | R | Fabrikantnaam |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `info.uniqueid` | string | R | Zigbee IEEE-adres |
| `state.position` | getal (%) | R/W | Positie, 0 = dicht, 100 = open |
| `state.stop` | boolean | R/W | Schrijf `true` om de beweging te stoppen |

### Schakelaars (`switches.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Naam van de schakelaar uit deCONZ |
| `info.battery` | getal (%) | R | Batterijniveau |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `info.lastSeen` | string | R | Tijdstempel laatst gezien |
| `button.lastEvent` | getal | R | Ruwe deCONZ-knopgebeurteniscode |
| `button.lastEventName` | string | R | Leesbare gebeurtenisnaam |

### Sensoren (`sensors.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Naam van de sensor uit deCONZ |
| `info.battery` | getal (%) | R | Batterijniveau |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `info.lastSeen` | string | R | Tijdstempel laatst gezien |
| `value.temperature` | getal (°C) | R | Temperatuur (ZHATemperature-sensoren) |
| `value.humidity` | getal (%) | R | Luchtvochtigheid (ZHAHumidity-sensoren) |
| `value.pressure` | getal (hPa) | R | Luchtdruk (ZHAPressure-sensoren) |
| `value.open` | boolean | R | Open/dicht-status (ZHAOpenClose-sensoren) |
| `value.presence` | boolean | R | Beweging gedetecteerd (ZHAPresence-sensoren) |
| `value.brightness` | getal (lux) | R | Lichtniveau (ZHALightLevel-sensoren) |
| `value.power` | getal (W) | R | Stroomverbruik (ZHAPower-sensoren) |
| `value.consumption` | getal (kWh) | R | Energieverbruik (ZHAConsumption-sensoren) |
| `value.raw` | mixed | R | Ruwe waarde als fallback voor onbekende sensortypes |

### Thermostaten (`thermostats.<id>.*`)

| Datapunt | Type | R/W | Beschrijving |
|---|---|---|---|
| `info.name` | string | R | Naam van de thermostaat uit deCONZ |
| `info.battery` | getal (%) | R | Batterijniveau |
| `info.reachable` | boolean | R | Zigbee-bereikbaarheid |
| `state.temperature` | getal (°C) | R | Gemeten temperatuur |
| `state.valve` | getal (%) | R | Klepopeningspercentage |
| `state.setpoint` | getal (°C) | R/W | Doeltemperatuur, 5–32 °C |

## Changelog




### 0.3.7 (2026-06-28)
* (ssbingo) Bugfix: xs/md/lg/xl-rasterattributen toegevoegd aan staticText-items (E5507); i18n-sleutel 'deCONZ Pairing' toegevoegd (E5612); adapter.setTimeout doorgegeven aan DeconzWebSocket (E5005); CI bijgewerkt naar Node.js 24, adapter-tests vereist check-and-lint (E3022/E3014); dependabot-cooldown en negeren @types/node-majorversies (E8917/E8915)
### 0.3.6 (2026-06-28)
* (ssbingo) Bugfix: repository-URL in package.json ingesteld op HTTPS-formaat zodat de ioBroker-adapter-checker de GitHub raw-URL kan oplossen
### 0.3.5 (2026-06-28)
* (ssbingo) Afhankelijkheidsupdates: vite 8.1, @vitejs/plugin-react v6 (Vite 8-compatibiliteit), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Bugfix: logo (admin/tint.png) was 300×358 (niet vierkant), wat de repository-checker meldde; opgevuld tot 358×358 met transparante rand, geen inhoud bijgesneden of vervormd

### 0.3.3 (2026-06-23)
* (ssbingo) Repository-onderhoud: minimale admin-versie verhoogd naar 7.6.20, common.news-items voor nooit op npm gepubliceerde versies verwijderd, this.setTimeout() gebruikt in de koppel-pollinglus, ioBroker-keyword toegevoegd, tsconfig gemigreerd naar @tsconfig/node22, verouderde .prettierignore verwijderd, dependabot-configuratie toegevoegd


## Documentatie

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Oudere wijzigingslogboeken zijn te vinden in [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Licentie

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
