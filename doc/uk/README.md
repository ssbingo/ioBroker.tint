![Logo](../../admin/tint.png)
# ioBroker.tint

## Адаптер tint для ioBroker

Керуйте розумними лампами **Müller Licht tint** Zigbee через шлюз **deCONZ / ConBee**.
Адаптер забезпечує повне керування окремими лампами, групами та сценами,
а також декодує всі події кнопок і колеса кольорів пульта дистанційного керування Tint.

## Відмова від відповідальності

Назви **Müller Licht** і **tint** є товарними знаками Müller-Licht International GmbH.
Цей адаптер є незалежним проектом спільноти та не пов'язаний з Müller-Licht.
Зв'язок здійснюється виключно через відкритий REST API deCONZ від dresden elektronik.

## Функції

- **Лампи** – увімкнення/вимкнення, диммінг, колірна температура (2000–6500 K), RGB-колір (hex, XY, відтінок/насиченість)
- **Світлові ефекти** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Групи** – керування всіма лампами групи одним датапоінтом
- **Сцени** – виклик іменованих сцен для кожної групи
- **Пульт Tint** – повне декодування подій кнопок (коротке натискання, утримання, відпускання) і вибору зони (1–3 / всі)
- **Колесо кольорів** – координати CIE XY і hex-колір з кожної позиції колеса; опціональне автозастосування до активної зони
- **Колесо колірної температури** – значення колірної температури в Кельвінах для кожної події пульта
- **Push у реальному часі** – WebSocket deCONZ для миттєвих оновлень стану
- **Резервний polling** – налаштований інтервал REST-опиту для надійності
- **Акумулятор і доступність** – моніторинг для кожного пульта

## Вимоги

- Шлюз deCONZ / ConBee (ConBee I/II/III або RaspBee) з програмним забезпеченням deCONZ ≥ 2.x
- Лампи Müller Licht tint, вже підключені до шлюзу deCONZ
- API-ключ deCONZ (отримати в додатку deCONZ або веб-інтерфейсі Phoscon)
- Node.js ≥ 20

## Налаштування

## Структура об'єктів

### Лампи (`lights.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва лампи з deCONZ |
| `info.modelid` | string | R | Ідентифікатор моделі |
| `info.manufacturer` | string | R | Назва виробника |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `info.uniqueid` | string | R | IEEE-адреса Zigbee |
| `state.on` | boolean | R/W | Увімкнено / вимкнено |
| `state.brightness` | число (%) | R/W | Яскравість 0–100 % |
| `state.colorTemp` | число (K) | R/W | Колірна температура 2000–6500 K |
| `state.hue` | число | R/W | Відтінок 0–65535 |
| `state.saturation` | число | R/W | Насиченість 0–254 |
| `state.hex` | string | R/W | RGB-колір у вигляді hex-рядка `#RRGGBB` |
| `state.x` | число | R/W | CIE x хроматичність (необроблене значення) |
| `state.y` | число | R/W | CIE y хроматичність (необроблене значення) |
| `state.colorMode` | string | R | Активний режим кольору (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Світловий ефект (`none`, `colorloop`, …) |
| `state.effectSpeed` | число | R/W | Швидкість ефекту 0–255 |
| `state.transitionTime` | число (×100 ms) | R/W | Індивідуальний час переходу для цієї лампи |

### Групи (`groups.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва групи |
| `info.memberCount` | число | R | Кількість ламп у групі |
| `info.allOn` | boolean | R | `true`, якщо всі лампи групи увімкнені |
| `info.anyOn` | boolean | R | `true`, якщо хоча б одна лампа увімкнена |
| `action.on` | boolean | R/W | Увімкнення/вимкнення всіх ламп групи |
| `action.brightness` | число (%) | R/W | Яскравість групи 0–100 % |
| `action.colorTemp` | число (K) | R/W | Колірна температура групи 2000–6500 K |
| `action.hex` | string | R/W | RGB-колір групи як `#RRGGBB` |
| `action.effect` | string | R/W | Світловий ефект групи |
| `action.transitionTime` | число (×100 ms) | R/W | Час переходу групи |
| `action.activateScene` | string | R/W | Запишіть назву сцени, щоб викликати її |
| `scenes.<name>` | boolean | R/W | Встановіть `true`, щоб викликати цю сцену |

### Пульти (`remotes.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва пульта |
| `info.battery` | число (%) | R | Рівень заряду батареї |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `info.lastSeen` | string | R | Час останнього контакту |
| `button.lastEvent` | число | R | Необроблений код події кнопки від deCONZ |
| `button.lastEventName` | string | R | Зрозуміла назва події |
| `button.pressType` | string | R | `short`, `hold` або `release` |
| `button.activeZone` | число | R | Активна зона: 0 = всі, 1–3 = зона 1–3 |
| `colorWheel.angle` | число (°) | R | Кут колеса кольорів 0–359 ° |
| `colorWheel.x` | число | R | CIE x вибраного кольору |
| `colorWheel.y` | число | R | CIE y вибраного кольору |
| `colorWheel.hex` | string | R | Вибраний колір як `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Короткочасно набуває `true` при кожній події колеса |
| `colorTemp.value` | число (K) | R | Вибрана колірна температура в Кельвінах |
| `colorTemp.mired` | число | R | Вибрана колірна температура в міред |
| `colorTemp.pressType` | string | R | `short` або `hold` |

### Розетки (`plugs.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва розетки з deCONZ |
| `info.modelid` | string | R | Ідентифікатор моделі |
| `info.manufacturer` | string | R | Назва виробника |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `info.uniqueid` | string | R | IEEE-адреса Zigbee |
| `state.on` | boolean | R/W | Увімкнено / вимкнено |

### Жалюзі (`covers.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва жалюзі з deCONZ |
| `info.modelid` | string | R | Ідентифікатор моделі |
| `info.manufacturer` | string | R | Назва виробника |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `info.uniqueid` | string | R | IEEE-адреса Zigbee |
| `state.position` | число (%) | R/W | Положення, 0 = закрито, 100 = відкрито |
| `state.stop` | boolean | R/W | Запишіть `true`, щоб зупинити рух |

### Вимикачі (`switches.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва вимикача з deCONZ |
| `info.battery` | число (%) | R | Рівень заряду батареї |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `info.lastSeen` | string | R | Час останнього контакту |
| `button.lastEvent` | число | R | Необроблений код події кнопки від deCONZ |
| `button.lastEventName` | string | R | Зрозуміла назва події |

### Датчики (`sensors.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва датчика з deCONZ |
| `info.battery` | число (%) | R | Рівень заряду батареї |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `info.lastSeen` | string | R | Час останнього контакту |
| `value.temperature` | число (°C) | R | Температура (датчики ZHATemperature) |
| `value.humidity` | число (%) | R | Вологість (датчики ZHAHumidity) |
| `value.pressure` | число (hPa) | R | Атмосферний тиск (датчики ZHAPressure) |
| `value.open` | boolean | R | Стан відкрито/закрито (датчики ZHAOpenClose) |
| `value.presence` | boolean | R | Виявлено рух (датчики ZHAPresence) |
| `value.brightness` | число (lux) | R | Рівень освітленості (датчики ZHALightLevel) |
| `value.power` | число (W) | R | Споживана потужність (датчики ZHAPower) |
| `value.consumption` | число (kWh) | R | Споживання енергії (датчики ZHAConsumption) |
| `value.raw` | mixed | R | Резервне необроблене значення для нерозпізнаних типів датчиків |

### Термостати (`thermostats.<id>.*`)

| Параметр | Тип | R/W | Опис |
|---|---|---|---|
| `info.name` | string | R | Назва термостата з deCONZ |
| `info.battery` | число (%) | R | Рівень заряду батареї |
| `info.reachable` | boolean | R | Доступність Zigbee |
| `state.temperature` | число (°C) | R | Виміряна температура |
| `state.valve` | число (%) | R | Відсоток відкриття клапана |
| `state.setpoint` | число (°C) | R/W | Цільова температура, 5–32 °C |

## Changelog


### 0.3.5 (2026-06-28)
* (ssbingo) Оновлення залежностей: vite 8.1, @vitejs/plugin-react v6 (сумісність з Vite 8), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Виправлення: логотип (admin/tint.png) мав розмір 300×358 (не квадратний), на що вказував чекер репозиторію; доповнено до 358×358 прозорою рамкою, без обрізання чи спотворення вмісту

### 0.3.3 (2026-06-23)
* (ssbingo) Гігієна репозиторію: мінімальну версію admin підвищено до 7.6.20, видалено записи common.news для версій, які ніколи не публікувалися на npm, використано this.setTimeout() у циклі опитування сполучення, додано ключове слово ioBroker, tsconfig перенесено на @tsconfig/node22, видалено застарілий .prettierignore, додано конфігурацію dependabot

### 0.3.2 (2026-06-23)
* (ssbingo) Видалено зайвий рядок "Other languages" з README.md (уже є в розділі Documentation); вимкнено сповіщення про реліз Sentry в CI (завершувалося помилкою без налаштованого токена)

### 0.3.1 (2026-06-23)
* (ssbingo) Завершено документацію структури об'єктів (Розетки, Жалюзі, Вимикачі, Датчики, Термостати) у всіх 11 файлах README; журнал змін обмежено 5 записами, старішу історію перенесено до CHANGELOG_OLD.md


## Документація

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Старіші записи журналу змін можна знайти у файлі [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Ліцензія

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
