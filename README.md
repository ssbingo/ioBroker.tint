![Logo](admin/tint.png)
# ioBroker.tint

[![NPM version](https://img.shields.io/npm/v/iobroker.tint.svg)](https://www.npmjs.com/package/iobroker.tint)
[![Downloads](https://img.shields.io/npm/dm/iobroker.tint.svg)](https://www.npmjs.com/package/iobroker.tint)
![Number of Installations](https://iobroker.live/badges/tint-installed.svg)
![Current version in stable repository](https://iobroker.live/badges/tint-stable.svg)

[![NPM](https://nodei.co/npm/iobroker.tint.png?downloads=true)](https://nodei.co/npm/iobroker.tint/)

**Tests:** ![Test and Release](https://github.com/ssbingo/ioBroker.tint/workflows/Test%20and%20Release/badge.svg)

## tint adapter for ioBroker

Control **Müller Licht tint** Zigbee smart lights via a **deCONZ / ConBee** gateway.
This adapter provides full control over individual lights, light groups, and scenes, and
decodes every button and color-wheel event from the Tint remote control.

Other languages: [Deutsch](doc/de/README.md) · [Русский](doc/ru/README.md) · [Português](doc/pt/README.md) · [Nederlands](doc/nl/README.md) · [Français](doc/fr/README.md) · [Italiano](doc/it/README.md) · [Español](doc/es/README.md) · [Polski](doc/pl/README.md) · [Українська](doc/uk/README.md) · [中文](doc/zh-cn/README.md)

## DISCLAIMER

The name **Müller Licht** and the product name **tint** are trademarks of Müller-Licht International GmbH.
This adapter is an independent, community project and is **not** affiliated with or endorsed by Müller-Licht.
The adapter communicates exclusively through the open deCONZ REST API provided by dresden elektronik.

## Features

- **Lights** – switch, dim, change color temperature (2000–6500 K), set RGB color (hex, XY, hue/saturation)
- **Light effects** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Groups** – control all lights in a group with a single state
- **Scenes** – recall named scenes per group
- **Tint remote** – full decoding of button events (short press, hold, release) and zone selection (1–3 / all)
- **Color wheel** – CIE XY coordinates and hex color derived from every wheel position change; optional auto-apply to the active zone
- **Color temperature wheel** – color temperature value in Kelvin delivered per remote event
- **Real-time push** – deCONZ WebSocket for instant state updates (no polling delay)
- **Fallback polling** – configurable REST polling interval for resilience
- **Battery & reachability** – monitored for every remote

## Requirements

- deCONZ / ConBee gateway (ConBee I/II/III or RaspBee) with deCONZ software ≥ 2.x
- Müller Licht tint bulbs already paired to the deCONZ gateway
- deCONZ API key (unlock via the deCONZ app or Phoscon web interface)
- Node.js ≥ 20

## Installation

Install via the ioBroker admin panel (search for **tint**) or from the command line:

```bash
iobroker add tint
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| IP address | `192.168.1.100` | IP address of the deCONZ / ConBee gateway |
| REST port | `80` | HTTP port of the deCONZ REST API |
| WebSocket port | `443` | WebSocket port used by deCONZ for push events |
| API key | *(empty)* | deCONZ API key (unlock in Phoscon / deCONZ settings) |
| Polling interval | `60` | Fallback REST poll interval in seconds |
| Auto-apply color wheel | `true` | Automatically set the chosen color on the active zone when the remote color wheel is turned |
| Transition time | `4` | Default light transition time in steps of 100 ms (4 = 400 ms) |
| Watchdog (minutes) | `120` | Watchdog timeout; adapter reconnects after this many minutes without a WebSocket event |

### Obtaining a deCONZ API key

1. Open the Phoscon web interface (usually `http://<gateway-ip>/pwa`).
2. Go to **Settings → Gateway → Advanced**.
3. Click **Authenticate app** and copy the generated API key.

Alternatively unlock via the deCONZ desktop app: **Menu → Settings → Gateway → Allow new connections** then call `/api` POST endpoint.

## Object structure

### Lights (`lights.<id>.*`)

| State | Type | R/W | Description |
|-------|------|-----|-------------|
| `info.name` | string | R | Light name from deCONZ |
| `info.modelid` | string | R | Model identifier |
| `info.manufacturer` | string | R | Manufacturer name |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.uniqueid` | string | R | Zigbee IEEE address |
| `state.on` | boolean | R/W | On / off |
| `state.brightness` | number (%) | R/W | Brightness 0–100 % |
| `state.colorTemp` | number (K) | R/W | Color temperature 2000–6500 K |
| `state.hue` | number | R/W | Hue 0–65535 |
| `state.saturation` | number | R/W | Saturation 0–254 |
| `state.hex` | string | R/W | RGB color as `#RRGGBB` hex string |
| `state.x` | number | R/W | CIE x chromaticity (raw) |
| `state.y` | number | R/W | CIE y chromaticity (raw) |
| `state.colorMode` | string | R | Active color mode (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Light effect (`none`, `colorloop`, …) |
| `state.effectSpeed` | number | R/W | Effect speed 0–255 |
| `state.transitionTime` | number (×100 ms) | R/W | Per-light transition time override |

### Groups (`groups.<id>.*`)

| State | Type | R/W | Description |
|-------|------|-----|-------------|
| `info.name` | string | R | Group name |
| `info.memberCount` | number | R | Number of lights in the group |
| `info.allOn` | boolean | R | `true` when all lights in the group are on |
| `info.anyOn` | boolean | R | `true` when at least one light is on |
| `action.on` | boolean | R/W | Switch all lights in the group |
| `action.brightness` | number (%) | R/W | Group brightness 0–100 % |
| `action.colorTemp` | number (K) | R/W | Group color temperature 2000–6500 K |
| `action.hex` | string | R/W | Group RGB color as `#RRGGBB` |
| `action.effect` | string | R/W | Group light effect |
| `action.transitionTime` | number (×100 ms) | R/W | Group transition time override |
| `action.activateScene` | string | R/W | Write a scene name to recall it |
| `scenes.<name>` | boolean | R/W | Set to `true` to recall this scene |

### Remotes (`remotes.<id>.*`)

| State | Type | R/W | Description |
|-------|------|-----|-------------|
| `info.name` | string | R | Remote name |
| `info.battery` | number (%) | R | Battery charge level |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.lastSeen` | string | R | Last seen timestamp |
| `button.lastEvent` | number | R | Raw deCONZ button event code |
| `button.lastEventName` | string | R | Human-readable event name |
| `button.pressType` | string | R | `short`, `hold`, or `release` |
| `button.activeZone` | number | R | Active zone: 0 = all, 1–3 = zone 1–3 |
| `colorWheel.angle` | number (°) | R | Color wheel angle 0–359 ° |
| `colorWheel.x` | number | R | CIE x of the selected color |
| `colorWheel.y` | number | R | CIE y of the selected color |
| `colorWheel.hex` | string | R | Selected color as `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Pulses `true` on each wheel event |
| `colorTemp.value` | number (K) | R | Selected color temperature in Kelvin |
| `colorTemp.mired` | number | R | Selected color temperature in mired |
| `colorTemp.pressType` | string | R | `short` or `hold` |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### 0.2.3 (2026-06-15)
* (ssbingo) Add automatic API key pairing: new "Request API key from deCONZ" button in the Settings tab

### 0.2.2 (2026-06-15)
* (ssbingo) Fix tab labels: "Leuchten" and "Gruppen" now shown correctly (i18n keys added to `admin/i18n/`)
* (ssbingo) Add static description text above each panel tab (always visible, even when panel fails to load)
* (ssbingo) Panel components: add sendTo timeout (10 s), alive-check, deferred mount via setTimeout, error boundary
* (ssbingo) Improve LightsTab and GroupsTab UX: status bar with dot indicator, count label, alert boxes for error/empty/offline

### 0.2.1 (2026-06-15)
* (ssbingo) Fix: panels were empty because `window.React` is not a global in admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: lights and groups overview tabs inside the adapter settings dialog
* (ssbingo) Group management: create, edit, and delete deCONZ groups from the admin UI
* (ssbingo) Drop Node 20 support; require Node.js >= 22

### 0.1.0 (2026-06-15)
* (ssbingo) Initial release: lights, groups, scenes, Tint remote with color wheel

## License

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
