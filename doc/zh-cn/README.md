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

| 参数 | 默认值 | 描述 |
|------|--------|------|
| IP地址 | `192.168.1.100` | deCONZ / ConBee网关的IP地址 |
| REST端口 | `80` | deCONZ REST API的HTTP端口 |
| WebSocket端口 | `443` | deCONZ推送事件的WebSocket端口 |
| API密钥 | *(空)* | deCONZ API密钥 |
| 轮询间隔 | `60` | 备用REST轮询间隔（秒） |
| 自动应用色轮 | `true` | 转动遥控器色轮时自动将选定颜色应用到活动区域 |
| 过渡时间 | `4` | 默认灯光过渡时间（以100毫秒为步长，4 = 400毫秒） |
| 看门狗（分钟） | `120` | 看门狗超时；N分钟内无WebSocket事件后重新连接 |

## 更新日志

### 0.3.0 (2026-06-23)
* (ssbingo) 修复：设备标签页不再在admin中触发错误的"切换主机"警告（React 18 + MUI v6现已与admin共享）；移除遗留的侧边栏"tint"标签

### 0.2.6 (2026-06-17)
* (ssbingo) 修复：将sendTo按钮替换为自定义PairButton组件，可靠获取API密钥并提供视觉反馈

### 0.2.5 (2026-06-16)
* (ssbingo) 修复：配对按钮作为自定义面板始终可见；面板包已提交至git（空标签页问题已解决）

### 0.2.4 (2026-06-16)
* (ssbingo) Pairing UX improved: click button first, adapter polls deCONZ every 3s (max 60s) - no time pressure

### 0.2.3 (2026-06-15)
* (ssbingo) Added automatic API key pairing: new button in Settings requests the key from deCONZ and fills it in automatically

### 0.2.2 (2026-06-15)
* (ssbingo) 修正选项卡标签 · 添加描述 · 通过alive检查和超时改进UX

### 0.2.1 (2026-06-15)
* (ssbingo) 修复：面板为空，因为`window.React`在admin 7中不是全局变量

### 0.2.0 (2026-06-15)
* (ssbingo) 管理界面：适配器设置中的灯具和群组选项卡；群组管理（创建、编辑、删除）；需要Node.js >= 22

### 0.1.0 (2026-06-15)
* (ssbingo) 初始版本：灯具、群组、场景、带色轮的Tint遥控器

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
