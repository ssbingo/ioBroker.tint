![Logo](../../admin/tint.png)
# ioBroker.tint

## Adattatore tint per ioBroker

Controlla le luci intelligenti **Müller Licht tint** Zigbee tramite un gateway **deCONZ / ConBee**.
L'adattatore offre il controllo completo di singole luci, gruppi e scene,
e decodifica tutti gli eventi dei pulsanti e della ruota dei colori del telecomando Tint.

## Disclaimer

I nomi **Müller Licht** e **tint** sono marchi di Müller-Licht International GmbH.
Questo adattatore è un progetto comunitario indipendente e non è affiliato a Müller-Licht.
La comunicazione avviene esclusivamente tramite l'API REST aperta deCONZ di dresden elektronik.

## Funzionalità

- **Luci** – accensione/spegnimento, dimmer, temperatura colore (2000–6500 K), colore RGB (hex, XY, tonalità/saturazione)
- **Effetti luminosi** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Gruppi** – controllare tutte le luci di un gruppo con un singolo punto dati
- **Scene** – richiamare scene nominate per gruppo
- **Telecomando Tint** – decodifica completa degli eventi dei pulsanti (pressione breve, tenuto, rilasciato) e selezione zona (1–3 / tutte)
- **Ruota dei colori** – coordinate CIE XY e colore hex da ogni posizione della ruota; applicazione automatica opzionale alla zona attiva
- **Ruota temperatura colore** – valore temperatura colore in Kelvin per ogni evento del telecomando
- **Push in tempo reale** – WebSocket deCONZ per aggiornamenti di stato istantanei
- **Polling di riserva** – intervallo di polling REST configurabile per la resilienza
- **Batteria e raggiungibilità** – monitorati per ogni telecomando

## Requisiti

- Gateway deCONZ / ConBee (ConBee I/II/III o RaspBee) con software deCONZ ≥ 2.x
- Lampadine Müller Licht tint già abbinate al gateway deCONZ
- Chiave API deCONZ (sbloccare nell'app deCONZ o nell'interfaccia web Phoscon)
- Node.js ≥ 20

## Configurazione

## Struttura degli oggetti

### Luci (`lights.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome della luce da deCONZ |
| `info.modelid` | string | R | Identificativo del modello |
| `info.manufacturer` | string | R | Nome del produttore |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `info.uniqueid` | string | R | Indirizzo IEEE Zigbee |
| `state.on` | boolean | R/W | Acceso / spento |
| `state.brightness` | numero (%) | R/W | Luminosità 0–100 % |
| `state.colorTemp` | numero (K) | R/W | Temperatura colore 2000–6500 K |
| `state.hue` | numero | R/W | Tonalità 0–65535 |
| `state.saturation` | numero | R/W | Saturazione 0–254 |
| `state.hex` | string | R/W | Colore RGB come stringa hex `#RRGGBB` |
| `state.x` | numero | R/W | Cromaticità CIE x (grezza) |
| `state.y` | numero | R/W | Cromaticità CIE y (grezza) |
| `state.colorMode` | string | R | Modalità colore attiva (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Effetto luminoso (`none`, `colorloop`, …) |
| `state.effectSpeed` | numero | R/W | Velocità dell'effetto 0–255 |
| `state.transitionTime` | numero (×100 ms) | R/W | Tempo di transizione specifico della luce |

### Gruppi (`groups.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome del gruppo |
| `info.memberCount` | numero | R | Numero di luci nel gruppo |
| `info.allOn` | boolean | R | `true` quando tutte le luci del gruppo sono accese |
| `info.anyOn` | boolean | R | `true` quando almeno una luce è accesa |
| `action.on` | boolean | R/W | Accendi/spegni tutte le luci del gruppo |
| `action.brightness` | numero (%) | R/W | Luminosità del gruppo 0–100 % |
| `action.colorTemp` | numero (K) | R/W | Temperatura colore del gruppo 2000–6500 K |
| `action.hex` | string | R/W | Colore RGB del gruppo come `#RRGGBB` |
| `action.effect` | string | R/W | Effetto luminoso del gruppo |
| `action.transitionTime` | numero (×100 ms) | R/W | Tempo di transizione del gruppo |
| `action.activateScene` | string | R/W | Scrivi il nome di una scena per richiamarla |
| `scenes.<name>` | boolean | R/W | Imposta su `true` per richiamare questa scena |

### Telecomandi (`remotes.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome del telecomando |
| `info.battery` | numero (%) | R | Livello batteria |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `info.lastSeen` | string | R | Timestamp dell'ultimo contatto |
| `button.lastEvent` | numero | R | Codice evento pulsante grezzo di deCONZ |
| `button.lastEventName` | string | R | Nome leggibile dell'evento |
| `button.pressType` | string | R | `short`, `hold` o `release` |
| `button.activeZone` | numero | R | Zona attiva: 0 = tutte, 1–3 = zona 1–3 |
| `colorWheel.angle` | numero (°) | R | Angolo della ruota dei colori 0–359 ° |
| `colorWheel.x` | numero | R | CIE x del colore selezionato |
| `colorWheel.y` | numero | R | CIE y del colore selezionato |
| `colorWheel.hex` | string | R | Colore selezionato come `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Passa brevemente a `true` a ogni evento della ruota |
| `colorTemp.value` | numero (K) | R | Temperatura colore selezionata in Kelvin |
| `colorTemp.mired` | numero | R | Temperatura colore selezionata in mired |
| `colorTemp.pressType` | string | R | `short` o `hold` |

### Prese (`plugs.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome della presa da deCONZ |
| `info.modelid` | string | R | Identificativo del modello |
| `info.manufacturer` | string | R | Nome del produttore |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `info.uniqueid` | string | R | Indirizzo IEEE Zigbee |
| `state.on` | boolean | R/W | Acceso / spento |

### Tapparelle (`covers.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome della tapparella da deCONZ |
| `info.modelid` | string | R | Identificativo del modello |
| `info.manufacturer` | string | R | Nome del produttore |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `info.uniqueid` | string | R | Indirizzo IEEE Zigbee |
| `state.position` | numero (%) | R/W | Posizione, 0 = chiusa, 100 = aperta |
| `state.stop` | boolean | R/W | Scrivi `true` per arrestare il movimento |

### Interruttori (`switches.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome dell'interruttore da deCONZ |
| `info.battery` | numero (%) | R | Livello batteria |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `info.lastSeen` | string | R | Timestamp dell'ultimo contatto |
| `button.lastEvent` | numero | R | Codice evento pulsante grezzo di deCONZ |
| `button.lastEventName` | string | R | Nome leggibile dell'evento |

### Sensori (`sensors.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome del sensore da deCONZ |
| `info.battery` | numero (%) | R | Livello batteria |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `info.lastSeen` | string | R | Timestamp dell'ultimo contatto |
| `value.temperature` | numero (°C) | R | Temperatura (sensori ZHATemperature) |
| `value.humidity` | numero (%) | R | Umidità (sensori ZHAHumidity) |
| `value.pressure` | numero (hPa) | R | Pressione atmosferica (sensori ZHAPressure) |
| `value.open` | boolean | R | Stato aperto/chiuso (sensori ZHAOpenClose) |
| `value.presence` | boolean | R | Movimento rilevato (sensori ZHAPresence) |
| `value.brightness` | numero (lux) | R | Livello di luce (sensori ZHALightLevel) |
| `value.power` | numero (W) | R | Potenza assorbita (sensori ZHAPower) |
| `value.consumption` | numero (kWh) | R | Consumo energetico (sensori ZHAConsumption) |
| `value.raw` | mixed | R | Valore grezzo di riserva per tipi di sensore non riconosciuti |

### Termostati (`thermostats.<id>.*`)

| Stato | Tipo | R/W | Descrizione |
|---|---|---|---|
| `info.name` | string | R | Nome del termostato da deCONZ |
| `info.battery` | numero (%) | R | Livello batteria |
| `info.reachable` | boolean | R | Raggiungibilità Zigbee |
| `state.temperature` | numero (°C) | R | Temperatura misurata |
| `state.valve` | numero (%) | R | Percentuale di apertura della valvola |
| `state.setpoint` | numero (°C) | R/W | Temperatura obiettivo, 5–32 °C |

## Changelog




### 0.3.8 (2026-06-28)
* (ssbingo) Aggiunto tab della barra laterale Admin per il controllo dei dispositivi (Luci, Gruppi, Prese, Tende, Interruttori, Sensori, Termostati); attivare tramite "enableAdminTab" nella scheda Connessione delle impostazioni dell'adattatore
### 0.3.7 (2026-06-28)
* (ssbingo) Correzioni: attributi xs/md/lg/xl aggiunti agli elementi staticText (E5507); chiave i18n 'deCONZ Pairing' aggiunta (E5612); adapter.setTimeout passato a DeconzWebSocket (E5005); CI aggiornato a Node.js 24, adapter-tests dipende da check-and-lint (E3022/E3014); cooldown dependabot e ignorare versioni major @types/node (E8917/E8915)
### 0.3.6 (2026-06-28)
* (ssbingo) Correzione: URL del repository in package.json impostato in formato HTTPS affinché il checker dell'adattatore ioBroker possa risolvere l'URL raw di GitHub
### 0.3.5 (2026-06-28)
* (ssbingo) Aggiornamenti delle dipendenze: vite 8.1, @vitejs/plugin-react v6 (compatibilità con Vite 8), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Correzione: il logo (admin/tint.png) era 300×358 (non quadrato), segnalato dal checker del repository; riempito a 358×358 con bordo trasparente, senza ritagliare o distorcere il contenuto

## Documentazione

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

I changelog meno recenti si trovano in [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Licenza

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
