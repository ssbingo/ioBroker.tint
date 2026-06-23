![Logo](../../admin/tint.png)
# ioBroker.tint

## Адаптер tint для ioBroker

Управление **умными лампами Müller Licht tint** Zigbee через шлюз **deCONZ / ConBee**.
Адаптер обеспечивает полное управление отдельными лампами, группами и сценами,
а также декодирует все события кнопок и цветового колеса пульта дистанционного управления Tint.

## Отказ от ответственности

Названия **Müller Licht** и **tint** являются товарными знаками Müller-Licht International GmbH.
Этот адаптер является независимым проектом сообщества и не аффилирован с Müller-Licht.
Взаимодействие осуществляется исключительно через открытый REST-API deCONZ от dresden elektronik.

## Функции

- **Лампы** – включение/выключение, диммирование, цветовая температура (2000–6500 K), цвет RGB (hex, XY, hue/насыщенность)
- **Световые эффекты** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Группы** – управление всеми лампами группы одним датапоинтом
- **Сцены** – вызов именованных сцен для каждой группы
- **Пульт Tint** – полное декодирование событий кнопок (короткое нажатие, удержание, отпускание) и выбора зоны (1–3 / все)
- **Цветовое колесо** – координаты CIE XY и hex-цвет из каждой позиции колеса; опциональное автоприменение к активной зоне
- **Колесо цветовой температуры** – значение цветовой температуры в Кельвинах для каждого события пульта
- **Реалтайм-push** – WebSocket deCONZ для мгновенного обновления состояний
- **Резервный polling** – настраиваемый интервал REST-опроса для надёжности
- **Заряд и доступность** – мониторинг для каждого пульта

## Требования

- Шлюз deCONZ / ConBee (ConBee I/II/III или RaspBee) с ПО deCONZ ≥ 2.x
- Лампы Müller Licht tint, сопряжённые с шлюзом deCONZ
- API-ключ deCONZ (получить в приложении deCONZ или веб-интерфейсе Phoscon)
- Node.js ≥ 20

## Настройка

## Структура объектов

### Лампы (`lights.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название лампы из deCONZ |
| `info.modelid` | string | R | Идентификатор модели |
| `info.manufacturer` | string | R | Название производителя |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `info.uniqueid` | string | R | IEEE-адрес Zigbee |
| `state.on` | boolean | R/W | Включено / выключено |
| `state.brightness` | число (%) | R/W | Яркость 0–100 % |
| `state.colorTemp` | число (K) | R/W | Цветовая температура 2000–6500 K |
| `state.hue` | число | R/W | Оттенок 0–65535 |
| `state.saturation` | число | R/W | Насыщенность 0–254 |
| `state.hex` | string | R/W | RGB-цвет в виде hex-строки `#RRGGBB` |
| `state.x` | число | R/W | CIE x хроматичность (исходное значение) |
| `state.y` | число | R/W | CIE y хроматичность (исходное значение) |
| `state.colorMode` | string | R | Активный режим цвета (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Световой эффект (`none`, `colorloop`, …) |
| `state.effectSpeed` | число | R/W | Скорость эффекта 0–255 |
| `state.transitionTime` | число (×100 ms) | R/W | Индивидуальное время перехода для этой лампы |

### Группы (`groups.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название группы |
| `info.memberCount` | число | R | Количество ламп в группе |
| `info.allOn` | boolean | R | `true`, если все лампы группы включены |
| `info.anyOn` | boolean | R | `true`, если хотя бы одна лампа включена |
| `action.on` | boolean | R/W | Включает/выключает все лампы группы |
| `action.brightness` | число (%) | R/W | Яркость группы 0–100 % |
| `action.colorTemp` | число (K) | R/W | Цветовая температура группы 2000–6500 K |
| `action.hex` | string | R/W | RGB-цвет группы как `#RRGGBB` |
| `action.effect` | string | R/W | Световой эффект группы |
| `action.transitionTime` | число (×100 ms) | R/W | Время перехода группы |
| `action.activateScene` | string | R/W | Запишите имя сцены, чтобы вызвать её |
| `scenes.<name>` | boolean | R/W | Установите `true`, чтобы вызвать эту сцену |

### Пульты (`remotes.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название пульта |
| `info.battery` | число (%) | R | Уровень заряда батареи |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `info.lastSeen` | string | R | Время последнего контакта |
| `button.lastEvent` | число | R | Исходный код события кнопки от deCONZ |
| `button.lastEventName` | string | R | Понятное название события |
| `button.pressType` | string | R | `short`, `hold` или `release` |
| `button.activeZone` | число | R | Активная зона: 0 = все, 1–3 = зона 1–3 |
| `colorWheel.angle` | число (°) | R | Угол цветового колеса 0–359 ° |
| `colorWheel.x` | число | R | CIE x выбранного цвета |
| `colorWheel.y` | число | R | CIE y выбранного цвета |
| `colorWheel.hex` | string | R | Выбранный цвет как `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Кратко принимает `true` при каждом событии колеса |
| `colorTemp.value` | число (K) | R | Выбранная цветовая температура в Кельвинах |
| `colorTemp.mired` | число | R | Выбранная цветовая температура в миред |
| `colorTemp.pressType` | string | R | `short` или `hold` |

### Розетки (`plugs.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название розетки из deCONZ |
| `info.modelid` | string | R | Идентификатор модели |
| `info.manufacturer` | string | R | Название производителя |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `info.uniqueid` | string | R | IEEE-адрес Zigbee |
| `state.on` | boolean | R/W | Включено / выключено |

### Жалюзи (`covers.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название жалюзи из deCONZ |
| `info.modelid` | string | R | Идентификатор модели |
| `info.manufacturer` | string | R | Название производителя |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `info.uniqueid` | string | R | IEEE-адрес Zigbee |
| `state.position` | число (%) | R/W | Положение, 0 = закрыто, 100 = открыто |
| `state.stop` | boolean | R/W | Запишите `true`, чтобы остановить движение |

### Выключатели (`switches.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название выключателя из deCONZ |
| `info.battery` | число (%) | R | Уровень заряда батареи |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `info.lastSeen` | string | R | Время последнего контакта |
| `button.lastEvent` | число | R | Исходный код события кнопки от deCONZ |
| `button.lastEventName` | string | R | Понятное название события |

### Датчики (`sensors.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название датчика из deCONZ |
| `info.battery` | число (%) | R | Уровень заряда батареи |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `info.lastSeen` | string | R | Время последнего контакта |
| `value.temperature` | число (°C) | R | Температура (датчики ZHATemperature) |
| `value.humidity` | число (%) | R | Влажность (датчики ZHAHumidity) |
| `value.pressure` | число (hPa) | R | Атмосферное давление (датчики ZHAPressure) |
| `value.open` | boolean | R | Состояние открыто/закрыто (датчики ZHAOpenClose) |
| `value.presence` | boolean | R | Обнаружено движение (датчики ZHAPresence) |
| `value.brightness` | число (lux) | R | Уровень освещённости (датчики ZHALightLevel) |
| `value.power` | число (W) | R | Потребляемая мощность (датчики ZHAPower) |
| `value.consumption` | число (kWh) | R | Потребление энергии (датчики ZHAConsumption) |
| `value.raw` | mixed | R | Резервное необработанное значение для нераспознанных типов датчиков |

### Термостаты (`thermostats.<id>.*`)

| Параметр | Тип | R/W | Описание |
|---|---|---|---|
| `info.name` | string | R | Название термостата из deCONZ |
| `info.battery` | число (%) | R | Уровень заряда батареи |
| `info.reachable` | boolean | R | Доступность Zigbee |
| `state.temperature` | число (°C) | R | Измеренная температура |
| `state.valve` | число (%) | R | Процент открытия клапана |
| `state.setpoint` | число (°C) | R/W | Целевая температура, 5–32 °C |

## Changelog

### 0.3.1 (2026-06-23)
* (ssbingo) Завершена документация структуры объектов (Розетки, Жалюзи, Выключатели, Датчики, Термостаты) во всех 11 файлах README; changelog ограничен 5 записями, более старая история перемещена в CHANGELOG_OLD.md

### 0.3.0 (2026-06-23)
* (ssbingo) Исправление: вкладки устройств больше не вызывают ложное предупреждение "сменить хост" в админке (React 18 + MUI v6 теперь общие с админкой); удалена устаревшая вкладка "tint" в боковой панели

### 0.2.6 (2026-06-17)
* (ssbingo) Исправление: кнопка sendTo заменена собственным компонентом PairButton — надёжное получение API-ключа с визуальной обратной связью

### 0.2.5 (2026-06-16)
* (ssbingo) Исправление: кнопка сопряжения всегда видима как пользовательская панель; бандлы добавлены в git (пустые вкладки исправлены)

### 0.2.4 (2026-06-16)
* (ssbingo) Pairing UX improved: click button first, adapter polls deCONZ every 3s (max 60s) - no time pressure

## Документация

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Более старые записи изменений можно найти в файле [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Лицензия

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
