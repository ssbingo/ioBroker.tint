![Logo](../../admin/tint.png)
# ioBroker.tint

## ioBroker的tint适配器

通过**deCONZ / ConBee**网关控制**Müller Licht tint** Zigbee智能灯。
该适配器提供对单个灯具、灯组和场景的完整控制，
并解码Tint遥控器的所有按键和色轮事件。

## 免责声明

**Müller Licht**和**tint**名称是Müller-Licht International GmbH的商标。
此适配器是独立的社区项目，与Müller-Licht没有任何关联。
通信仅通过dresden elektronik提供的开放deCONZ REST API进行。

## 功能

- **灯具** – 开/关、调光、色温（2000–6500 K）、RGB颜色（十六进制、XY、色调/饱和度）
- **灯光效果** – colorloop、sunset、party、worklight、campfire、romance、nightlight
- **灯组** – 用单个数据点控制组内所有灯具
- **场景** – 按组调用命名场景
- **Tint遥控器** – 完整解码按键事件（短按、长按、释放）和区域选择（1–3 / 全部）
- **色轮** – 从色轮每个位置获取CIE XY坐标和十六进制颜色；可选自动应用到活动区域
- **色温轮** – 每次遥控器事件提供开尔文色温值
- **实时推送** – deCONZ WebSocket实现即时状态更新
- **备用轮询** – 可配置的REST轮询间隔以确保可靠性
- **电量和可达性** – 每个遥控器均受监控

## 要求

- deCONZ / ConBee网关（ConBee I/II/III或RaspBee），deCONZ软件版本 ≥ 2.x
- 已与deCONZ网关配对的Müller Licht tint灯泡
- deCONZ API密钥（在deCONZ应用或Phoscon网页界面解锁）
- Node.js ≥ 20

## 配置

## 对象结构

### 灯具 (`lights.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 来自deCONZ的灯具名称 |
| `info.modelid` | string | R | 型号标识 |
| `info.manufacturer` | string | R | 制造商名称 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `info.uniqueid` | string | R | Zigbee IEEE地址 |
| `state.on` | boolean | R/W | 开 / 关 |
| `state.brightness` | 数字 (%) | R/W | 亮度 0–100 % |
| `state.colorTemp` | 数字 (K) | R/W | 色温 2000–6500 K |
| `state.hue` | 数字 | R/W | 色调 0–65535 |
| `state.saturation` | 数字 | R/W | 饱和度 0–254 |
| `state.hex` | string | R/W | RGB颜色，十六进制字符串 `#RRGGBB` |
| `state.x` | 数字 | R/W | CIE x色度（原始值） |
| `state.y` | 数字 | R/W | CIE y色度（原始值） |
| `state.colorMode` | string | R | 当前色彩模式（`ct`、`xy`、`hs`） |
| `state.effect` | string | R/W | 灯光效果（`none`、`colorloop`……） |
| `state.effectSpeed` | 数字 | R/W | 效果速度 0–255 |
| `state.transitionTime` | 数字 (×100 ms) | R/W | 单灯过渡时间覆盖 |

### 分组 (`groups.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 分组名称 |
| `info.memberCount` | 数字 | R | 分组内灯具数量 |
| `info.allOn` | boolean | R | 分组内所有灯具开启时为 `true` |
| `info.anyOn` | boolean | R | 分组内至少一个灯具开启时为 `true` |
| `action.on` | boolean | R/W | 开关分组内所有灯具 |
| `action.brightness` | 数字 (%) | R/W | 分组亮度 0–100 % |
| `action.colorTemp` | 数字 (K) | R/W | 分组色温 2000–6500 K |
| `action.hex` | string | R/W | 分组RGB颜色 `#RRGGBB` |
| `action.effect` | string | R/W | 分组灯光效果 |
| `action.transitionTime` | 数字 (×100 ms) | R/W | 分组过渡时间覆盖 |
| `action.activateScene` | string | R/W | 写入场景名称以调用该场景 |
| `scenes.<name>` | boolean | R/W | 设为 `true` 以调用该场景 |

### 遥控器 (`remotes.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 遥控器名称 |
| `info.battery` | 数字 (%) | R | 电池电量 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `info.lastSeen` | string | R | 最后在线时间戳 |
| `button.lastEvent` | 数字 | R | deCONZ原始按键事件代码 |
| `button.lastEventName` | string | R | 可读事件名称 |
| `button.pressType` | string | R | `short`、`hold` 或 `release` |
| `button.activeZone` | 数字 | R | 活动区域：0 = 全部，1–3 = 区域1–3 |
| `colorWheel.angle` | 数字 (°) | R | 色轮角度 0–359 ° |
| `colorWheel.x` | 数字 | R | 所选颜色的CIE x值 |
| `colorWheel.y` | 数字 | R | 所选颜色的CIE y值 |
| `colorWheel.hex` | string | R | 所选颜色，格式为 `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | 每次色轮事件时短暂变为 `true` |
| `colorTemp.value` | 数字 (K) | R | 所选色温（开尔文） |
| `colorTemp.mired` | 数字 | R | 所选色温（mired） |
| `colorTemp.pressType` | string | R | `short` 或 `hold` |

### 插座 (`plugs.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 来自deCONZ的插座名称 |
| `info.modelid` | string | R | 型号标识 |
| `info.manufacturer` | string | R | 制造商名称 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `info.uniqueid` | string | R | Zigbee IEEE地址 |
| `state.on` | boolean | R/W | 开 / 关 |

### 窗帘 (`covers.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 来自deCONZ的窗帘名称 |
| `info.modelid` | string | R | 型号标识 |
| `info.manufacturer` | string | R | 制造商名称 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `info.uniqueid` | string | R | Zigbee IEEE地址 |
| `state.position` | 数字 (%) | R/W | 位置，0 = 关闭，100 = 打开 |
| `state.stop` | boolean | R/W | 写入 `true` 以停止移动 |

### 开关 (`switches.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 来自deCONZ的开关名称 |
| `info.battery` | 数字 (%) | R | 电池电量 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `info.lastSeen` | string | R | 最后在线时间戳 |
| `button.lastEvent` | 数字 | R | deCONZ原始按键事件代码 |
| `button.lastEventName` | string | R | 可读事件名称 |

### 传感器 (`sensors.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 来自deCONZ的传感器名称 |
| `info.battery` | 数字 (%) | R | 电池电量 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `info.lastSeen` | string | R | 最后在线时间戳 |
| `value.temperature` | 数字 (°C) | R | 温度（ZHATemperature传感器） |
| `value.humidity` | 数字 (%) | R | 湿度（ZHAHumidity传感器） |
| `value.pressure` | 数字 (hPa) | R | 气压（ZHAPressure传感器） |
| `value.open` | boolean | R | 开/关状态（ZHAOpenClose传感器） |
| `value.presence` | boolean | R | 检测到运动（ZHAPresence传感器） |
| `value.brightness` | 数字 (lux) | R | 光照水平（ZHALightLevel传感器） |
| `value.power` | 数字 (W) | R | 功率（ZHAPower传感器） |
| `value.consumption` | 数字 (kWh) | R | 能耗（ZHAConsumption传感器） |
| `value.raw` | mixed | R | 未识别传感器类型的原始值回退 |

### 温控器 (`thermostats.<id>.*`)

| 状态点 | 类型 | R/W | 说明 |
|---|---|---|---|
| `info.name` | string | R | 来自deCONZ的温控器名称 |
| `info.battery` | 数字 (%) | R | 电池电量 |
| `info.reachable` | boolean | R | Zigbee可达性 |
| `state.temperature` | 数字 (°C) | R | 测得温度 |
| `state.valve` | 数字 (%) | R | 阀门开启百分比 |
| `state.setpoint` | 数字 (°C) | R/W | 目标温度，5–32 °C |

## 更新日志

### 0.3.3 (2026-06-23)
* (ssbingo) 仓库整理：admin最低版本提升至7.6.20，移除从未在npm发布版本的common.news条目，配对轮询循环中使用this.setTimeout()，添加ioBroker关键字，tsconfig迁移至@tsconfig/node22，移除过时的.prettierignore，添加dependabot配置

### 0.3.2 (2026-06-23)
* (ssbingo) 移除README.md中多余的"Other languages"行（文档部分已包含此信息）；禁用CI中的Sentry发布通知步骤（因未配置令牌而失败）

### 0.3.1 (2026-06-23)
* (ssbingo) 完成了对象结构文档（插座、窗帘、开关、传感器、温控器）在全部11个README文件中的补充；更新日志限制为5条，较旧的历史记录已移至CHANGELOG_OLD.md

### 0.3.0 (2026-06-23)
* (ssbingo) 修复：设备标签页不再在admin中触发错误的"切换主机"警告（React 18 + MUI v6现已与admin共享）；移除遗留的侧边栏"tint"标签

### 0.2.6 (2026-06-17)
* (ssbingo) 修复：将sendTo按钮替换为自定义PairButton组件，可靠获取API密钥并提供视觉反馈

## 文档

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇵🇹 [Documentação portuguesa](../pt/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)

较旧的更新日志可在 [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md) 中找到。

## 许可证

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
