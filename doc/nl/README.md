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

| Parameter | Standaard | Beschrijving |
|-----------|-----------|--------------|
| IP-adres | `192.168.1.100` | IP-adres van de deCONZ / ConBee gateway |
| REST-poort | `80` | HTTP-poort van de deCONZ REST-API |
| WebSocket-poort | `443` | WebSocket-poort voor deCONZ push-events |
| API-sleutel | *(leeg)* | deCONZ API-sleutel |
| Poll-interval | `60` | Fallback REST-polling-interval in seconden |
| Kleurenwiel automatisch toepassen | `true` | Gekozen kleur automatisch instellen op de actieve zone |
| Overgangstijd | `4` | Standaard lichtovergangstijd in stappen van 100 ms (4 = 400 ms) |
| Watchdog (minuten) | `120` | Watchdog-timeout; adapter herverbindt na N minuten zonder WebSocket-event |

## Changelog

### 0.1.0 (2026-06-15)
* (ssbingo) Eerste versie: lampen, groepen, scènes, Tint-afstandsbediening met kleurenwiel

## Licentie

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
