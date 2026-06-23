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

| Parâmetro | Predefinição | Descrição |
|-----------|-------------|-----------|
| Endereço IP | `192.168.1.100` | Endereço IP do gateway deCONZ / ConBee |
| Porta REST | `80` | Porta HTTP da API REST deCONZ |
| Porta WebSocket | `443` | Porta WebSocket para eventos push deCONZ |
| Chave de API | *(vazio)* | Chave de API deCONZ |
| Intervalo de polling | `60` | Intervalo de polling REST de reserva em segundos |
| Auto-aplicar roda de cores | `true` | Definir automaticamente a cor escolhida na zona ativa |
| Tempo de transição | `4` | Tempo de transição de luz padrão em passos de 100 ms (4 = 400 ms) |
| Watchdog (minutos) | `120` | Timeout do watchdog; o adaptador reconecta após N minutos sem evento WebSocket |

## Changelog

### 0.3.0 (2026-06-23)
* (ssbingo) Correção: as abas de dispositivos já não geram um aviso falso de "mudar de host" no admin (React 18 + MUI v6 agora partilhados com o admin); removida a aba lateral "tint" obsoleta

### 0.2.6 (2026-06-17)
* (ssbingo) Correção: botão sendTo substituído por componente PairButton personalizado — obtenção fiável da chave API com feedback visual

### 0.2.5 (2026-06-16)
* (ssbingo) Correção: botão de emparelhamento sempre visível como painel personalizado; bundles adicionados ao git (abas vazias resolvidas)

### 0.2.4 (2026-06-16)
* (ssbingo) Pairing UX improved: click button first, adapter polls deCONZ every 3s (max 60s) - no time pressure

### 0.2.3 (2026-06-15)
* (ssbingo) Emparelhamento automatico de chave API adicionado: novo botao nas Definicoes solicita a chave ao deCONZ e preenche-a automaticamente

### 0.2.2 (2026-06-15)
* (ssbingo) Corrigidas etiquetas · Adicionadas descrições estáticas · UX melhorado com alive-check e timeout

### 0.2.1 (2026-06-15)
* (ssbingo) Correção: os painéis estavam vazios porque `window.React` não é global no admin 7

### 0.2.0 (2026-06-15)
* (ssbingo) Admin UI: abas de luzes e grupos nas configurações do adaptador; gestão de grupos (criar, editar, eliminar); necessário Node.js >= 22

### 0.1.0 (2026-06-15)
* (ssbingo) Lançamento inicial: luzes, grupos, cenas, controlo remoto Tint com roda de cores

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
