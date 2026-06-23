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

| Parámetro | Predeterminado | Descripción |
|-----------|----------------|-------------|
| Dirección IP | `192.168.1.100` | Dirección IP de la pasarela deCONZ / ConBee |
| Puerto REST | `80` | Puerto HTTP de la API REST deCONZ |
| Puerto WebSocket | `443` | Puerto WebSocket para eventos push deCONZ |
| Clave de API | *(vacío)* | Clave de API deCONZ |
| Intervalo de polling | `60` | Intervalo de polling REST de reserva en segundos |
| Aplicar automáticamente la rueda de colores | `true` | Establecer automáticamente el color elegido en la zona activa |
| Tiempo de transición | `4` | Tiempo de transición de luz predeterminado en pasos de 100 ms (4 = 400 ms) |
| Watchdog (minutos) | `120` | Tiempo de espera del watchdog; reconexión tras N minutos sin evento WebSocket |

## Changelog

### 0.3.0 (2026-06-23)
* (ssbingo) Corrección: las pestañas de dispositivos ya no generan una falsa advertencia de "cambiar de host" en admin (React 18 + MUI v6 ahora compartidos con admin); eliminada la pestaña lateral obsoleta "tint"

### 0.2.6 (2026-06-17)
* (ssbingo) Corrección: botón sendTo reemplazado por componente PairButton personalizado — obtención fiable de clave API con feedback visual

### 0.2.5 (2026-06-16)
* (ssbingo) Corrección: botón de emparejamiento siempre visible como panel personalizado; bundles añadidos a git (pestañas vacías corregidas)

### 0.2.4 (2026-06-16)
* (ssbingo) Pairing UX improved: click button first, adapter polls deCONZ every 3s (max 60s) - no time pressure

### 0.2.3 (2026-06-15)
* (ssbingo) Emparejamiento automatico de clave API anadido: nuevo boton en Ajustes solicita la clave a deCONZ y la rellena automaticamente

### 0.2.2 (2026-06-15)
* (ssbingo) Etiquetas corregidas · Descripciones añadidas · UX mejorado con comprobación alive y timeout

### 0.2.1 (2026-06-15)
* (ssbingo) Corrección: los paneles estaban vacíos porque `window.React` no es un global en admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: pestañas de luces y grupos en la configuración del adaptador; gestión de grupos (crear, editar, eliminar); Node.js >= 22 requerido

### 0.1.0 (2026-06-15)
* (ssbingo) Versión inicial: luces, grupos, escenas, mando a distancia Tint con rueda de colores

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
