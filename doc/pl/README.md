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

| Parametr | Domyślny | Opis |
|----------|----------|------|
| Adres IP | `192.168.1.100` | Adres IP bramki deCONZ / ConBee |
| Port REST | `80` | Port HTTP REST API deCONZ |
| Port WebSocket | `443` | Port WebSocket dla zdarzeń push deCONZ |
| Klucz API | *(pusty)* | Klucz API deCONZ |
| Interwał polling | `60` | Awaryjny interwał polling REST w sekundach |
| Automatyczne stosowanie koła kolorów | `true` | Automatycznie ustawiać wybrany kolor na aktywnej strefie |
| Czas przejścia | `4` | Domyślny czas przejścia światła w krokach po 100 ms (4 = 400 ms) |
| Watchdog (minuty) | `120` | Limit czasu watchdog; ponowne połączenie po N minutach bez zdarzenia WebSocket |

## Changelog

### 0.3.0 (2026-06-23)
* (ssbingo) Poprawka: zakładki urządzeń nie wywołują już fałszywego ostrzeżenia "zmień hosta" w admin (React 18 + MUI v6 są teraz współdzielone z admin); usunięto przestarzałą zakładkę boczną "tint"

### 0.2.6 (2026-06-17)
* (ssbingo) Poprawka: przycisk sendTo zastąpiony własnym komponentem PairButton — niezawodne pobieranie klucza API z informacją zwrotną

### 0.2.5 (2026-06-16)
* (ssbingo) Poprawka: przycisk parowania zawsze widoczny jako niestandardowy panel; bundle dodane do git (puste zakładki naprawione)

### 0.2.4 (2026-06-16)
* (ssbingo) Pairing UX improved: click button first, adapter polls deCONZ every 3s (max 60s) - no time pressure

### 0.2.3 (2026-06-15)
* (ssbingo) Dodano automatyczne parowanie klucza API: nowy przycisk w Ustawieniach pobiera klucz z deCONZ i automatycznie go wpisuje

### 0.2.2 (2026-06-15)
* (ssbingo) Poprawiono etykiety · Dodano opisy · Poprawiono UX z kontrolą alive i limitem czasu

### 0.2.1 (2026-06-15)
* (ssbingo) Poprawka: panele były puste, ponieważ `window.React` nie jest globalnym w admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: zakładki świateł i grup w ustawieniach adaptera; zarządzanie grupami (tworzenie, edycja, usuwanie); wymagany Node.js >= 22

### 0.1.0 (2026-06-15)
* (ssbingo) Pierwsza wersja: światła, grupy, sceny, pilot Tint z kołem kolorów

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
