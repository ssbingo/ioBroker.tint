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

| Parametro | Predefinito | Descrizione |
|-----------|-------------|-------------|
| Indirizzo IP | `192.168.1.100` | Indirizzo IP del gateway deCONZ / ConBee |
| Porta REST | `80` | Porta HTTP dell'API REST deCONZ |
| Porta WebSocket | `443` | Porta WebSocket per gli eventi push deCONZ |
| Chiave API | *(vuoto)* | Chiave API deCONZ |
| Intervallo di polling | `60` | Intervallo di polling REST di riserva in secondi |
| Applica automaticamente la ruota dei colori | `true` | Impostare automaticamente il colore scelto sulla zona attiva |
| Tempo di transizione | `4` | Tempo di transizione luce predefinito in passi da 100 ms (4 = 400 ms) |
| Watchdog (minuti) | `120` | Timeout del watchdog; riconnessione dopo N minuti senza evento WebSocket |

## Changelog

### 0.2.3 (2026-06-15)
* (ssbingo) Aggiunto accoppiamento automatico chiave API: nuovo pulsante in Impostazioni richiede la chiave a deCONZ e la compila automaticamente

### 0.2.2 (2026-06-15)
* (ssbingo) Etichette corrette · Descrizioni aggiunte · UX migliorato con verifica alive e timeout

### 0.2.1 (2026-06-15)
* (ssbingo) Correzione: i pannelli erano vuoti perché `window.React` non è un global in admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: schede luci e gruppi nelle impostazioni dell'adattatore; gestione gruppi (creare, modificare, eliminare); Node.js >= 22 richiesto

### 0.1.0 (2026-06-15)
* (ssbingo) Versione iniziale: luci, gruppi, scene, telecomando Tint con ruota dei colori

## Licenza

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
