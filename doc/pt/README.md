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

### 0.1.0 (2026-06-15)
* (ssbingo) Lançamento inicial: luzes, grupos, cenas, controlo remoto Tint com roda de cores

## Licença

MIT License

Copyright (c) 2026 ssbingo <s.sternitzke@online.de>
