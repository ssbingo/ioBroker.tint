![Logo](../../admin/tint.png)
# ioBroker.tint

## Adapter tint dla ioBroker

Steruj inteligentnymi lampami **Müller Licht tint** Zigbee przez bramkę **deCONZ / ConBee**.
Adapter zapewnia pełną kontrolę nad pojedynczymi lampami, grupami i scenami,
oraz dekoduje wszystkie zdarzenia przycisków i koła kolorów pilota Tint.

## Zastrzeżenie

Nazwy **Müller Licht** i **tint** są znakami towarowymi Müller-Licht International GmbH.
Ten adapter jest niezależnym projektem społeczności i nie jest powiązany z Müller-Licht.
Komunikacja odbywa się wyłącznie przez otwarty REST API deCONZ firmy dresden elektronik.

## Funkcje

- **Lampy** – włączanie/wyłączanie, ściemnianie, temperatura barwowa (2000–6500 K), kolor RGB (hex, XY, barwa/nasycenie)
- **Efekty świetlne** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Grupy** – sterowanie wszystkimi lampami grupy jednym punktem danych
- **Sceny** – przywoływanie nazwanych scen dla każdej grupy
- **Pilot Tint** – pełne dekodowanie zdarzeń przycisków (krótkie naciśnięcie, przytrzymanie, zwolnienie) i wyboru strefy (1–3 / wszystkie)
- **Koło kolorów** – współrzędne CIE XY i kolor hex z każdej pozycji koła; opcjonalne automatyczne zastosowanie do aktywnej strefy
- **Koło temperatury barwowej** – wartość temperatury barwowej w Kelwinach dla każdego zdarzenia pilota
- **Push w czasie rzeczywistym** – WebSocket deCONZ dla natychmiastowych aktualizacji stanu
- **Polling awaryjny** – konfigurowalny interwał polling REST dla niezawodności
- **Bateria i osiągalność** – monitorowane dla każdego pilota

## Wymagania

- Bramka deCONZ / ConBee (ConBee I/II/III lub RaspBee) z oprogramowaniem deCONZ ≥ 2.x
- Żarówki Müller Licht tint sparowane już z bramką deCONZ
- Klucz API deCONZ (odblokować w aplikacji deCONZ lub interfejsie web Phoscon)
- Node.js ≥ 20

## Konfiguracja

## Struktura obiektów

### Lampy (`lights.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa lampy z deCONZ |
| `info.modelid` | string | R | Identyfikator modelu |
| `info.manufacturer` | string | R | Nazwa producenta |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `info.uniqueid` | string | R | Adres IEEE Zigbee |
| `state.on` | boolean | R/W | Włączone / wyłączone |
| `state.brightness` | liczba (%) | R/W | Jasność 0–100 % |
| `state.colorTemp` | liczba (K) | R/W | Temperatura barwowa 2000–6500 K |
| `state.hue` | liczba | R/W | Barwa 0–65535 |
| `state.saturation` | liczba | R/W | Nasycenie 0–254 |
| `state.hex` | string | R/W | Kolor RGB jako ciąg hex `#RRGGBB` |
| `state.x` | liczba | R/W | Chromatyczność CIE x (surowa) |
| `state.y` | liczba | R/W | Chromatyczność CIE y (surowa) |
| `state.colorMode` | string | R | Aktywny tryb koloru (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Efekt świetlny (`none`, `colorloop`, …) |
| `state.effectSpeed` | liczba | R/W | Szybkość efektu 0–255 |
| `state.transitionTime` | liczba (×100 ms) | R/W | Indywidualny czas przejścia dla tej lampy |

### Grupy (`groups.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa grupy |
| `info.memberCount` | liczba | R | Liczba lamp w grupie |
| `info.allOn` | boolean | R | `true`, gdy wszystkie lampy w grupie są włączone |
| `info.anyOn` | boolean | R | `true`, gdy przynajmniej jedna lampa jest włączona |
| `action.on` | boolean | R/W | Przełącza wszystkie lampy w grupie |
| `action.brightness` | liczba (%) | R/W | Jasność grupy 0–100 % |
| `action.colorTemp` | liczba (K) | R/W | Temperatura barwowa grupy 2000–6500 K |
| `action.hex` | string | R/W | Kolor RGB grupy jako `#RRGGBB` |
| `action.effect` | string | R/W | Efekt świetlny grupy |
| `action.transitionTime` | liczba (×100 ms) | R/W | Czas przejścia grupy |
| `action.activateScene` | string | R/W | Wpisz nazwę scenerii, aby ją przywołać |
| `scenes.<name>` | boolean | R/W | Ustaw na `true`, aby przywołać tę scenerię |

### Piloty (`remotes.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa pilota |
| `info.battery` | liczba (%) | R | Poziom naładowania baterii |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `info.lastSeen` | string | R | Znacznik czasu ostatniego kontaktu |
| `button.lastEvent` | liczba | R | Surowy kod zdarzenia przycisku z deCONZ |
| `button.lastEventName` | string | R | Czytelna nazwa zdarzenia |
| `button.pressType` | string | R | `short`, `hold` lub `release` |
| `button.activeZone` | liczba | R | Aktywna strefa: 0 = wszystkie, 1–3 = strefa 1–3 |
| `colorWheel.angle` | liczba (°) | R | Kąt koła kolorów 0–359 ° |
| `colorWheel.x` | liczba | R | CIE x wybranego koloru |
| `colorWheel.y` | liczba | R | CIE y wybranego koloru |
| `colorWheel.hex` | string | R | Wybrany kolor jako `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Krótko przyjmuje `true` przy każdym zdarzeniu koła |
| `colorTemp.value` | liczba (K) | R | Wybrana temperatura barwowa w kelwinach |
| `colorTemp.mired` | liczba | R | Wybrana temperatura barwowa w miredach |
| `colorTemp.pressType` | string | R | `short` lub `hold` |

### Gniazdka (`plugs.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa gniazdka z deCONZ |
| `info.modelid` | string | R | Identyfikator modelu |
| `info.manufacturer` | string | R | Nazwa producenta |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `info.uniqueid` | string | R | Adres IEEE Zigbee |
| `state.on` | boolean | R/W | Włączone / wyłączone |

### Rolety (`covers.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa rolety z deCONZ |
| `info.modelid` | string | R | Identyfikator modelu |
| `info.manufacturer` | string | R | Nazwa producenta |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `info.uniqueid` | string | R | Adres IEEE Zigbee |
| `state.position` | liczba (%) | R/W | Pozycja, 0 = zamknięta, 100 = otwarta |
| `state.stop` | boolean | R/W | Wpisz `true`, aby zatrzymać ruch |

### Przełączniki (`switches.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa przełącznika z deCONZ |
| `info.battery` | liczba (%) | R | Poziom naładowania baterii |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `info.lastSeen` | string | R | Znacznik czasu ostatniego kontaktu |
| `button.lastEvent` | liczba | R | Surowy kod zdarzenia przycisku z deCONZ |
| `button.lastEventName` | string | R | Czytelna nazwa zdarzenia |

### Czujniki (`sensors.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa czujnika z deCONZ |
| `info.battery` | liczba (%) | R | Poziom naładowania baterii |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `info.lastSeen` | string | R | Znacznik czasu ostatniego kontaktu |
| `value.temperature` | liczba (°C) | R | Temperatura (czujniki ZHATemperature) |
| `value.humidity` | liczba (%) | R | Wilgotność (czujniki ZHAHumidity) |
| `value.pressure` | liczba (hPa) | R | Ciśnienie atmosferyczne (czujniki ZHAPressure) |
| `value.open` | boolean | R | Stan otwarte/zamknięte (czujniki ZHAOpenClose) |
| `value.presence` | boolean | R | Wykryty ruch (czujniki ZHAPresence) |
| `value.brightness` | liczba (lux) | R | Poziom światła (czujniki ZHALightLevel) |
| `value.power` | liczba (W) | R | Pobór mocy (czujniki ZHAPower) |
| `value.consumption` | liczba (kWh) | R | Zużycie energii (czujniki ZHAConsumption) |
| `value.raw` | mixed | R | Surowa wartość zastępcza dla nierozpoznanych typów czujników |

### Termostaty (`thermostats.<id>.*`)

| Stan | Typ | R/W | Opis |
|---|---|---|---|
| `info.name` | string | R | Nazwa termostatu z deCONZ |
| `info.battery` | liczba (%) | R | Poziom naładowania baterii |
| `info.reachable` | boolean | R | Osiągalność Zigbee |
| `state.temperature` | liczba (°C) | R | Zmierzona temperatura |
| `state.valve` | liczba (%) | R | Procent otwarcia zaworu |
| `state.setpoint` | liczba (°C) | R/W | Temperatura docelowa, 5–32 °C |

## Changelog




### 0.3.7 (2026-06-28)
* (ssbingo) Poprawki: atrybuty xs/md/lg/xl dodane do elementów staticText (E5507); klucz i18n 'deCONZ Pairing' dodany (E5612); adapter.setTimeout przekazany do DeconzWebSocket (E5005); CI zaktualizowany do Node.js 24, adapter-tests wymaga check-and-lint (E3022/E3014); cooldown dependabot i ignorowanie wersji major @types/node (E8917/E8915)
### 0.3.6 (2026-06-28)
* (ssbingo) Poprawka: URL repozytorium w package.json ustawiony na format HTTPS, aby sprawdzacz adaptera ioBroker mógł rozwiązać raw URL GitHub
### 0.3.5 (2026-06-28)
* (ssbingo) Aktualizacje zależności: vite 8.1, @vitejs/plugin-react v6 (zgodność z Vite 8), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Poprawka: logo (admin/tint.png) miało wymiary 300×358 (nie kwadrat), na co wskazywał checker repozytorium; uzupełnione do 358×358 przezroczystą ramką, bez przycinania czy zniekształcania treści

### 0.3.3 (2026-06-23)
* (ssbingo) Porządki w repozytorium: minimalna wersja admin podniesiona do 7.6.20, usunięto wpisy common.news dla wersji nigdy nieopublikowanych na npm, użyto this.setTimeout() w pętli odpytywania parowania, dodano słowo kluczowe ioBroker, tsconfig przeniesiono na @tsconfig/node22, usunięto przestarzały .prettierignore, dodano konfigurację dependabot


## Dokumentacja

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Starsze wpisy dziennika zmian znajdziesz w [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Licencja

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
