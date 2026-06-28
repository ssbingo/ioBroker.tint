![Logo](../../admin/tint.png)
# ioBroker.tint

## Adaptador tint para ioBroker

Controle luzes inteligentes **Müller Licht tint** Zigbee através de um gateway **deCONZ / ConBee**.
O adaptador fornece controlo completo sobre luzes individuais, grupos de luzes e cenas,
e descodifica todos os eventos de botões e da roda de cores do telecomando Tint.

## Aviso legal

Os nomes **Müller Licht** e **tint** são marcas registadas da Müller-Licht International GmbH.
Este adaptador é um projeto independente da comunidade e não tem qualquer afiliação com a Müller-Licht.
A comunicação é feita exclusivamente através da API REST aberta deCONZ fornecida pela dresden elektronik.

## Funcionalidades

- **Luzes** – ligar/desligar, dimer, temperatura de cor (2000–6500 K), cor RGB (hex, XY, matiz/saturação)
- **Efeitos de luz** – colorloop, sunset, party, worklight, campfire, romance, nightlight
- **Grupos** – controlar todas as luzes de um grupo com um único ponto de dados
- **Cenas** – chamar cenas nomeadas por grupo
- **Telecomando Tint** – descodificação completa de eventos de botões (pressão curta, manter, soltar) e seleção de zona (1–3 / todas)
- **Roda de cores** – coordenadas CIE XY e cor hex de cada posição da roda; aplicação automática opcional à zona ativa
- **Roda de temperatura de cor** – valor de temperatura de cor em Kelvin por evento do telecomando
- **Push em tempo real** – WebSocket deCONZ para atualizações de estado instantâneas
- **Polling de reserva** – intervalo de polling REST configurável para resiliência
- **Bateria e alcançabilidade** – monitorizados para cada telecomando

## Requisitos

- Gateway deCONZ / ConBee (ConBee I/II/III ou RaspBee) com software deCONZ ≥ 2.x
- Lâmpadas Müller Licht tint já emparelhadas com o gateway deCONZ
- Chave de API deCONZ (desbloquear na app deCONZ ou interface web Phoscon)
- Node.js ≥ 20

## Configuração

## Estrutura de objetos

### Luzes (`lights.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome da luz no deCONZ |
| `info.modelid` | string | R | Identificador do modelo |
| `info.manufacturer` | string | R | Nome do fabricante |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `info.uniqueid` | string | R | Endereço IEEE Zigbee |
| `state.on` | boolean | R/W | Ligado / desligado |
| `state.brightness` | número (%) | R/W | Brilho 0–100 % |
| `state.colorTemp` | número (K) | R/W | Temperatura de cor 2000–6500 K |
| `state.hue` | número | R/W | Matiz 0–65535 |
| `state.saturation` | número | R/W | Saturação 0–254 |
| `state.hex` | string | R/W | Cor RGB como string hex `#RRGGBB` |
| `state.x` | número | R/W | Cromaticidade CIE x (em bruto) |
| `state.y` | número | R/W | Cromaticidade CIE y (em bruto) |
| `state.colorMode` | string | R | Modo de cor ativo (`ct`, `xy`, `hs`) |
| `state.effect` | string | R/W | Efeito de luz (`none`, `colorloop`, …) |
| `state.effectSpeed` | número | R/W | Velocidade do efeito 0–255 |
| `state.transitionTime` | número (×100 ms) | R/W | Tempo de transição específico desta luz |

### Grupos (`groups.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome do grupo |
| `info.memberCount` | número | R | Número de luzes no grupo |
| `info.allOn` | boolean | R | `true` quando todas as luzes do grupo estão ligadas |
| `info.anyOn` | boolean | R | `true` quando pelo menos uma luz está ligada |
| `action.on` | boolean | R/W | Liga/desliga todas as luzes do grupo |
| `action.brightness` | número (%) | R/W | Brilho do grupo 0–100 % |
| `action.colorTemp` | número (K) | R/W | Temperatura de cor do grupo 2000–6500 K |
| `action.hex` | string | R/W | Cor RGB do grupo como `#RRGGBB` |
| `action.effect` | string | R/W | Efeito de luz do grupo |
| `action.transitionTime` | número (×100 ms) | R/W | Tempo de transição do grupo |
| `action.activateScene` | string | R/W | Escreve o nome de uma cena para a chamar |
| `scenes.<name>` | boolean | R/W | Definir como `true` para chamar esta cena |

### Telecomandos (`remotes.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome do telecomando |
| `info.battery` | número (%) | R | Nível de bateria |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `info.lastSeen` | string | R | Marca temporal da última ligação |
| `button.lastEvent` | número | R | Código de evento de botão em bruto do deCONZ |
| `button.lastEventName` | string | R | Nome legível do evento |
| `button.pressType` | string | R | `short`, `hold` ou `release` |
| `button.activeZone` | número | R | Zona ativa: 0 = todas, 1–3 = zona 1–3 |
| `colorWheel.angle` | número (°) | R | Ângulo da roda de cores 0–359 ° |
| `colorWheel.x` | número | R | CIE x da cor selecionada |
| `colorWheel.y` | número | R | CIE y da cor selecionada |
| `colorWheel.hex` | string | R | Cor selecionada como `#RRGGBB` |
| `colorWheel.triggered` | boolean | R | Passa brevemente a `true` em cada evento da roda |
| `colorTemp.value` | número (K) | R | Temperatura de cor selecionada em Kelvin |
| `colorTemp.mired` | número | R | Temperatura de cor selecionada em mired |
| `colorTemp.pressType` | string | R | `short` ou `hold` |

### Tomadas (`plugs.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome da tomada no deCONZ |
| `info.modelid` | string | R | Identificador do modelo |
| `info.manufacturer` | string | R | Nome do fabricante |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `info.uniqueid` | string | R | Endereço IEEE Zigbee |
| `state.on` | boolean | R/W | Ligado / desligado |

### Estores (`covers.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome do estore no deCONZ |
| `info.modelid` | string | R | Identificador do modelo |
| `info.manufacturer` | string | R | Nome do fabricante |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `info.uniqueid` | string | R | Endereço IEEE Zigbee |
| `state.position` | número (%) | R/W | Posição, 0 = fechado, 100 = aberto |
| `state.stop` | boolean | R/W | Escreva `true` para parar o movimento |

### Interruptores (`switches.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome do interruptor no deCONZ |
| `info.battery` | número (%) | R | Nível de bateria |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `info.lastSeen` | string | R | Marca temporal da última ligação |
| `button.lastEvent` | número | R | Código de evento de botão em bruto do deCONZ |
| `button.lastEventName` | string | R | Nome legível do evento |

### Sensores (`sensors.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome do sensor no deCONZ |
| `info.battery` | número (%) | R | Nível de bateria |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `info.lastSeen` | string | R | Marca temporal da última ligação |
| `value.temperature` | número (°C) | R | Temperatura (sensores ZHATemperature) |
| `value.humidity` | número (%) | R | Humidade (sensores ZHAHumidity) |
| `value.pressure` | número (hPa) | R | Pressão atmosférica (sensores ZHAPressure) |
| `value.open` | boolean | R | Estado aberto/fechado (sensores ZHAOpenClose) |
| `value.presence` | boolean | R | Movimento detetado (sensores ZHAPresence) |
| `value.brightness` | número (lux) | R | Nível de luz (sensores ZHALightLevel) |
| `value.power` | número (W) | R | Consumo de potência (sensores ZHAPower) |
| `value.consumption` | número (kWh) | R | Consumo de energia (sensores ZHAConsumption) |
| `value.raw` | mixed | R | Valor em bruto de reserva para tipos de sensor não reconhecidos |

### Termostatos (`thermostats.<id>.*`)

| Estado | Tipo | R/W | Descrição |
|---|---|---|---|
| `info.name` | string | R | Nome do termostato no deCONZ |
| `info.battery` | número (%) | R | Nível de bateria |
| `info.reachable` | boolean | R | Alcançabilidade Zigbee |
| `state.temperature` | número (°C) | R | Temperatura medida |
| `state.valve` | número (%) | R | Percentagem de abertura da válvula |
| `state.setpoint` | número (°C) | R/W | Temperatura alvo, 5–32 °C |

## Changelog



### 0.3.6 (2026-06-28)
* (ssbingo) Correção: URL do repositório em package.json definida em formato HTTPS para que o verificador do adaptador ioBroker possa resolver o URL raw do GitHub
### 0.3.5 (2026-06-28)
* (ssbingo) Atualizações de dependências: vite 8.1, @vitejs/plugin-react v6 (compatibilidade com Vite 8), @module-federation/vite 1.16.10, @mui/material devDep 9.1.2, axios 1.18.1, @types/node 26, CI testing-action-check v2
### 0.3.4 (2026-06-23)
* (ssbingo) Correção: o logótipo (admin/tint.png) tinha 300×358 (não era quadrado), o que o verificador do repositório assinalava; preenchido para 358×358 com borda transparente, sem cortar ou distorcer o conteúdo

### 0.3.3 (2026-06-23)
* (ssbingo) Manutenção do repositório: versão mínima do admin elevada para 7.6.20, removidas entradas de common.news para versões nunca publicadas no npm, uso de this.setTimeout() no loop de polling de emparelhamento, adicionada palavra-chave ioBroker, tsconfig migrado para @tsconfig/node22, removido .prettierignore obsoleto, adicionada configuração do dependabot

### 0.3.2 (2026-06-23)
* (ssbingo) Removida a linha redundante "Other languages" do README.md (já presente na secção Documentation); desativada a notificação de lançamento do Sentry no CI (falhava sem token configurado)


## Documentação

- 🇬🇧 [English documentation](../../README.md)
- 🇩🇪 [Deutsche Dokumentation](../de/README.md)
- 🇷🇺 [Документация на русском](../ru/README.md)
- 🇳🇱 [Nederlandse documentatie](../nl/README.md)
- 🇫🇷 [Documentation française](../fr/README.md)
- 🇮🇹 [Documentazione italiana](../it/README.md)
- 🇪🇸 [Documentación en español](../es/README.md)
- 🇵🇱 [Dokumentacja polska](../pl/README.md)
- 🇺🇦 [Документація українською](../uk/README.md)
- 🇨🇳 [简体中文文档](../zh-cn/README.md)

Os registos de alterações mais antigos encontram-se em [CHANGELOG_OLD.md](../../CHANGELOG_OLD.md).

## Licença

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
