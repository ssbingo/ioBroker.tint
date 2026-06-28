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

## Object structure

### Lights (`lights.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Light name from deCONZ |
| `info.modelid` | string | R | Model identifier |
| `info.manufacturer` | string | R | Manufacturer name |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.uniqueid` | string | R | Zigbee IEEE address |
| `state.on` | boolean | R/W | On / off |
| `state.brightness` | number (%) | R/W | Brightness 0–100 % |
| `state.colorTemp` | number (K) | R/W | Color temperature 2000–6500 K |
| `state.hue` | number | R/W | Hue 0–65535 |
| `state.saturation` | number | R/W | Saturation 0–254 |
| `state.hex` | string | R/W | RGB color as `#RRGGBB` hex string |
| `state.x` | number | R/W | CIE x chromaticity (raw) |
| `state.y` | number | R/W | CIE y chromaticity (raw) |
| `state.colorMode` | string | R | Active color mode (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Light effect (`none`, `colorloop`, …) |
| `state.effectSpeed` | number | R/W | Effect speed 0–255 |
| `state.transitionTime` | number (×100 ms) | R/W | Per-light transition time override |

### Groups (`groups.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Group name |
| `info.memberCount` | number | R | Number of lights in the group |
| `info.allOn` | boolean | R | `true` when all lights in the group are on |
| `info.anyOn` | boolean | R | `true` when at least one light is on |
| `action.on` | boolean | R/W | Switch all lights in the group |
| `action.brightness` | number (%) | R/W | Group brightness 0–100 % |
| `action.colorTemp` | number (K) | R/W | Group color temperature 2000–6500 K |
| `action.hex` | string | R/W | Group RGB color as `#RRGGBB` |
| `action.effect` | string | R/W | Group light effect |
| `action.transitionTime` | number (×100 ms) | R/W | Group transition time override |
| `action.activateScene` | string | R/W | Write a scene name to recall it |
| `scenes.<name>` | boolean | R/W | Set to `true` to recall this scene |

### Remotes (`remotes.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Remote name |
| `info.battery` | number (%) | R | Battery charge level |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.lastSeen` | string | R | Last seen timestamp |
| `button.lastEvent` | number | R | Raw deCONZ button event code |
| `button.lastEventName` | string | R | Human-readable event name |
| `button.pressType` | string | R | `short`, `hold`, or `release` |
| `button.activeZone` | number | R | Active zone: 0 = all, 1–3 = zone 1–3 |
| `colorWheel.angle` | number (°) | R | Color wheel angle 0–359 ° |
| `colorWheel.x` | number | R | CIE x of the selected color |
| `colorWheel.y` | number | R | CIE y of the selected color |
| `colorWheel.hex` | string | R | Selected color as `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Pulses `true` on each wheel event |
| `colorTemp.value` | number (K) | R | Selected color temperature in Kelvin |
| `colorTemp.mired` | number | R | Selected color temperature in mired |
| `colorTemp.pressType` | string | R | `short` or `hold` |

### Plugs (`plugs.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Plug name from deCONZ |
| `info.modelid` | string | R | Model identifier |
| `info.manufacturer` | string | R | Manufacturer name |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.uniqueid` | string | R | Zigbee IEEE address |
| `state.on` | boolean | R/W | On / off |

### Covers (`covers.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Cover name from deCONZ |
| `info.modelid` | string | R | Model identifier |
| `info.manufacturer` | string | R | Manufacturer name |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.uniqueid` | string | R | Zigbee IEEE address |
| `state.position` | number (%) | R/W | Cover position, 0 = closed, 100 = open |
| `state.stop` | boolean | R/W | Write `true` to stop movement |

### Switches (`switches.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Switch name from deCONZ |
| `info.battery` | number (%) | R | Battery charge level |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.lastSeen` | string | R | Last seen timestamp |
| `button.lastEvent` | number | R | Raw deCONZ button event code |
| `button.lastEventName` | string | R | Human-readable event name |

### Sensors (`sensors.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Sensor name from deCONZ |
| `info.battery` | number (%) | R | Battery charge level |
| `info.reachable` | boolean | R | Zigbee reachability |
| `info.lastSeen` | string | R | Last seen timestamp |
| `value.temperature` | number (°C) | R | Temperature (ZHATemperature sensors) |
| `value.humidity` | number (%) | R | Humidity (ZHAHumidity sensors) |
| `value.pressure` | number (hPa) | R | Air pressure (ZHAPressure sensors) |
| `value.open` | boolean | R | Open/close state (ZHAOpenClose sensors) |
| `value.presence` | boolean | R | Motion detected (ZHAPresence sensors) |
| `value.brightness` | number (lux) | R | Light level (ZHALightLevel sensors) |
| `value.power` | number (W) | R | Power draw (ZHAPower sensors) |
| `value.consumption` | number (kWh) | R | Energy consumption (ZHAConsumption sensors) |
| `value.raw` | mixed | R | Raw value fallback for unrecognized sensor types |

### Thermostats (`thermostats.<id>.*`)

| State | Type | R/W | Description |
|---|---|---|---|
| `info.name` | string | R | Thermostat name from deCONZ |
| `info.battery` | number (%) | R | Battery charge level |
| `info.reachable` | boolean | R | Zigbee reachability |
| `state.temperature` | number (°C) | R | Measured temperature |
| `state.valve` | number (%) | R | Valve opening percentage |
| `state.setpoint` | number (°C) | R/W | Target temperature, 5–32 °C |

## Changelog

<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->

### 0.3.7 (2026-06-28)
* (ssbingo) Fix: add xs/md/lg/xl grid attributes to jsonConfig staticText items (E5507); add deCONZ Pairing i18n key (E5612); pass adapter.setTimeout to DeconzWebSocket (E5005); update CI Node.js to 24 and add needs: check-and-lint for adapter-tests (E3022/E3014); add dependabot cooldown and @types/node major-version ignore rule (E8917/E8915)

### 0.3.6 (2026-06-28)
* (ssbingo) Fix: set repository URL to HTTPS format in package.json so the ioBroker adapter checker can resolve the GitHub raw file URL

### 0.3.5 (2026-06-28)
* (ssbingo) Dependency updates: vite 8.1, @vitejs/plugin-react v6 (Vite 8 compatibility), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2

### 0.3.4 (2026-06-23)
* (ssbingo) Fix: logo (admin/tint.png) was 300×358 (not square), which the repository checker flags; padded to 358×358 with a transparent border, no content cropped or distorted

### 0.3.3 (2026-06-23)
* (ssbingo) Repository hygiene: bump minimum admin version to 7.6.20, drop common.news entries for versions never published to npm, use this.setTimeout() in the pairing poll loop, add ioBroker keyword, migrate tsconfig to @tsconfig/node22, remove obsolete .prettierignore, add dependabot config


## Documentation

- 🇩🇪 [Deutsche Dokumentation](doc/de/README.md)
- 🇷🇺 [Документация на русском](doc/ru/README.md)
- 🇳🇱 [Nederlandse documentatie](doc/nl/README.md)
- 🇫🇷 [Documentation française](doc/fr/README.md)
- 🇮🇹 [Documentazione italiana](doc/it/README.md)
- 🇪🇸 [Documentación en español](doc/es/README.md)
- 🇵🇱 [Dokumentacja polska](doc/pl/README.md)
- 🇵🇹 [Documentação portuguesa](doc/pt/README.md)
- 🇺🇦 [Документація українською](doc/uk/README.md)
- 🇨🇳 [简体中文文档](doc/zh-cn/README.md)

Older changelogs can be found in [CHANGELOG_OLD.md](CHANGELOG_OLD.md).

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
