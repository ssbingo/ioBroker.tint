![Logo](../../admin/tint.png)
# ioBroker.tint

## Adaptador tint para ioBroker

Controla las luces inteligentes **Müller Licht tint** Zigbee a través de una pasarela **deCONZ / ConBee**.
El adaptador proporciona control completo sobre luces individuales, grupos y escenas,
y decodifica todos los eventos de botones y de la rueda de colores del mando Tint.

## Aviso legal

Los nombres **Müller Licht** y **tint** son marcas comerciales de Müller-Licht International GmbH.
Este adaptador es un proyecto comunitario independiente y no está afiliado a Müller-Licht.
La comunicación se realiza exclusivamente a través de la API REST abierta deCONZ de dresden elektronik.

## Funcionalidades

- **Luces** – encendido/apagado, regulación, temperatura de color (2000–6500 K), color RGB (hex, XY, tono/saturación)
- **Efectos de luz** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Grupos** – controlar todas las luces de un grupo con un único punto de datos
- **Escenas** – recuperar escenas nombradas por grupo
- **Mando Tint** – decodificación completa de eventos de botones (pulsación corta, mantenida, liberada) y selección de zona (1–3 / todas)
- **Rueda de colores** – coordenadas CIE XY y color hex de cada posición de la rueda; aplicación automática opcional a la zona activa
- **Rueda de temperatura de color** – valor de temperatura de color en Kelvin por evento del mando
- **Push en tiempo real** – WebSocket deCONZ para actualizaciones de estado instantáneas
- **Polling de reserva** – intervalo de polling REST configurable para resiliencia
- **Batería y accesibilidad** – monitorizados para cada mando

## Requisitos

- Pasarela deCONZ / ConBee (ConBee I/II/III o RaspBee) con software deCONZ ≥ 2.x
- Bombillas Müller Licht tint ya emparejadas con la pasarela deCONZ
- Clave de API deCONZ (desbloquear en la app deCONZ o la interfaz web Phoscon)
- Node.js ≥ 20

## Configuración

## Estructura de objetos

### Luces (`lights.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre de la luz en deCONZ |
| `info.modelid` | string | R | Identificador del modelo |
| `info.manufacturer` | string | R | Nombre del fabricante |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `info.uniqueid` | string | R | Dirección IEEE Zigbee |
| `state.on` | boolean | R/W | Encendido / apagado |
| `state.brightness` | número (%) | R/W | Brillo 0–100 % |
| `state.colorTemp` | número (K) | R/W | Temperatura de color 2000–6500 K |
| `state.hue` | número | R/W | Tono 0–65535 |
| `state.saturation` | número | R/W | Saturación 0–254 |
| `state.hex` | string | R/W | Color RGB como cadena hex `#RRGGBB` |
| `state.x` | número | R/W | Cromaticidad CIE x (en bruto) |
| `state.y` | número | R/W | Cromaticidad CIE y (en bruto) |
| `state.colorMode` | string | R | Modo de color activo (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Efecto de luz (`none`, `colorloop`, …) |
| `state.effectSpeed` | número | R/W | Velocidad del efecto 0–255 |
| `state.transitionTime` | número (×100 ms) | R/W | Tiempo de transición específico de la luz |

### Grupos (`groups.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre del grupo |
| `info.memberCount` | número | R | Número de luces en el grupo |
| `info.allOn` | boolean | R | `true` cuando todas las luces del grupo están encendidas |
| `info.anyOn` | boolean | R | `true` cuando al menos una luz está encendida |
| `action.on` | boolean | R/W | Encender/apagar todas las luces del grupo |
| `action.brightness` | número (%) | R/W | Brillo del grupo 0–100 % |
| `action.colorTemp` | número (K) | R/W | Temperatura de color del grupo 2000–6500 K |
| `action.hex` | string | R/W | Color RGB del grupo como `#RRGGBB` |
| `action.effect` | string | R/W | Efecto de luz del grupo |
| `action.transitionTime` | número (×100 ms) | R/W | Tiempo de transición del grupo |
| `action.activateScene` | string | R/W | Escribe el nombre de una escena para recuperarla |
| `scenes.<name>` | boolean | R/W | Establecer en `true` para recuperar esta escena |

### Mandos (`remotes.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre del mando |
| `info.battery` | número (%) | R | Nivel de batería |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `info.lastSeen` | string | R | Marca de tiempo de la última conexión |
| `button.lastEvent` | número | R | Código de evento de botón en bruto de deCONZ |
| `button.lastEventName` | string | R | Nombre legible del evento |
| `button.pressType` | string | R | `short`, `hold` o `release` |
| `button.activeZone` | número | R | Zona activa: 0 = todas, 1–3 = zona 1–3 |
| `colorWheel.angle` | número (°) | R | Ángulo de la rueda de colores 0–359 ° |
| `colorWheel.x` | número | R | CIE x del color seleccionado |
| `colorWheel.y` | número | R | CIE y del color seleccionado |
| `colorWheel.hex` | string | R | Color seleccionado como `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Se pone en `true` brevemente en cada evento de la rueda |
| `colorTemp.value` | número (K) | R | Temperatura de color seleccionada en Kelvin |
| `colorTemp.mired` | número | R | Temperatura de color seleccionada en mired |
| `colorTemp.pressType` | string | R | `short` o `hold` |

### Enchufes (`plugs.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre del enchufe en deCONZ |
| `info.modelid` | string | R | Identificador del modelo |
| `info.manufacturer` | string | R | Nombre del fabricante |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `info.uniqueid` | string | R | Dirección IEEE Zigbee |
| `state.on` | boolean | R/W | Encendido / apagado |

### Persianas (`covers.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre de la persiana en deCONZ |
| `info.modelid` | string | R | Identificador del modelo |
| `info.manufacturer` | string | R | Nombre del fabricante |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `info.uniqueid` | string | R | Dirección IEEE Zigbee |
| `state.position` | número (%) | R/W | Posición, 0 = cerrada, 100 = abierta |
| `state.stop` | boolean | R/W | Escribe `true` para detener el movimiento |

### Interruptores (`switches.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre del interruptor en deCONZ |
| `info.battery` | número (%) | R | Nivel de batería |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `info.lastSeen` | string | R | Marca de tiempo de la última conexión |
| `button.lastEvent` | número | R | Código de evento de botón en bruto de deCONZ |
| `button.lastEventName` | string | R | Nombre legible del evento |

### Sensores (`sensors.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre del sensor en deCONZ |
| `info.battery` | número (%) | R | Nivel de batería |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `info.lastSeen` | string | R | Marca de tiempo de la última conexión |
| `value.temperature` | número (°C) | R | Temperatura (sensores ZHATemperature) |
| `value.humidity` | número (%) | R | Humedad (sensores ZHAHumidity) |
| `value.pressure` | número (hPa) | R | Presión atmosférica (sensores ZHAPressure) |
| `value.open` | boolean | R | Estado abierto/cerrado (sensores ZHAOpenClose) |
| `value.presence` | boolean | R | Movimiento detectado (sensores ZHAPresence) |
| `value.brightness` | número (lux) | R | Nivel de luz (sensores ZHALightLevel) |
| `value.power` | número (W) | R | Consumo de potencia (sensores ZHAPower) |
| `value.consumption` | número (kWh) | R | Consumo de energía (sensores ZHAConsumption) |
| `value.raw` | mixed | R | Valor en bruto de respaldo para tipos de sensor no reconocidos |

### Termostatos (`thermostats.<id>.*`)

| Estado | Tipo | R/W | Descripción |
|---|---|---|---|
| `info.name` | string | R | Nombre del termostato en deCONZ |
| `info.battery` | número (%) | R | Nivel de batería |
| `info.reachable` | boolean | R | Accesibilidad Zigbee |
| `state.temperature` | número (°C) | R | Temperatura medida |
| `state.valve` | número (%) | R | Porcentaje de apertura de la válvula |
| `state.setpoint` | número (°C) | R/W | Temperatura objetivo, 5–32 °C |

## Changelog

### 0.3.2 (2026-06-23)
* (ssbingo) Eliminada la línea redundante "Other languages" del README.md (ya presente en la sección Documentation); deshabilitada la notificación de versión de Sentry en CI (fallaba sin token configurado)

### 0.3.1 (2026-06-23)
* (ssbingo) Documentación de la estructura de objetos completada (Enchufes, Persianas, Interruptores, Sensores, Termostatos) en los 11 archivos README; changelog limitado a 5 entradas, historial anterior movido a CHANGELOG_OLD.md

### 0.3.0 (2026-06-23)
* (ssbingo) Corrección: las pestañas de dispositivos ya no generan una falsa advertencia de "cambiar de host" en admin (React 18 + MUI v6 ahora compartidos con admin); eliminada la pestaña lateral obsoleta "tint"

### 0.2.6 (2026-06-17)
* (ssbingo) Corrección: botón sendTo reemplazado por componente PairButton personalizado — obtención fiable de clave API con feedback visual

### 0.2.5 (2026-06-16)
* (ssbingo) Corrección: botón de emparejamiento siempre visible como panel personalizado; bundles añadidos a git (pestañas vacías corregidas)

## Documentación

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Los registros de cambios anteriores se encuentran en [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Licencia

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
