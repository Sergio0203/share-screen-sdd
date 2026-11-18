# Implementation Plan: T10 · Mídia passando por um servidor (modelo Discord)

**Branch**: `010-midia-por-servidor` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-midia-por-servidor/spec.md`

## Summary

Trocar a malha de conexões diretas (T03–T05) por um servidor de mídia que recebe uma cópia de cada
voz, câmera e tela e repassa aos outros da sala, sem mudar nada para quem usa além de uma mensagem
nova para quando o servidor de mídia estiver fora do ar.

Abordagem: **LiveKit** auto-hospedado em container ao lado do app (research §1); o navegador usa
`livekit-client`, servido como um único módulo ES a partir de `node_modules` (§2). O app emite uma
permissão JWT de 30 s só para quem entrou na sala, presa à sala e à pessoa (§3), expulsa quem sai e
confere cada entrada por webhook (§4). Cada pessoa publica no máximo uma trilha por fonte, sem
simulcast (§5, §7); cada navegador assina vozes e câmeras de todos e só a tela em destaque (§6). A
captura continua igual; se o servidor de mídia cai, as trilhas locais ficam vivas e são
republicadas quando ele volta (§8, §9). Um `docker-compose.yml` com Caddy (porta 443 para o site e
para o TURN/TLS por SNI), LiveKit e o app cobre redes restritas (§10).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual a T01–T09)

**Primary Dependencies**: `ws` (existente); **novas**: `livekit-client` 2.x (npm, Apache-2.0, só no
navegador) e o servidor **LiveKit** (container `livekit/livekit-server`, Apache-2.0) + **Caddy com
camada 4** (container `livekit/caddyl4`) na implantação. JWT e verificação de webhook com
`node:crypto`, sem SDK de servidor

**Storage**: N/A (nada em disco; salas em memória como hoje)

**Testing**: `node:test` — unitários (token, webhook, regras de assinatura/republicação/estado,
`midia.js` com `Room` falso) e integração (WebSocket `midia`/`pedir-midia`, webhook, LiveKit falso
recebendo `RemoveParticipant`, rota do `livekit-client`); roteiro manual em
[quickstart.md](quickstart.md) com LiveKit real

**Target Platform**: servidor Linux com Docker (app + LiveKit + Caddy, domínio próprio e HTTPS);
navegadores modernos de computador para publicar, qualquer navegador moderno para assistir

**Project Type**: aplicação web (servidor Node + estáticos no mesmo projeto) + configuração de
implantação

**Performance Goals**: 1 transmissão por mídia por pessoa (SC-001/002); 6 pessoas, 6 câmeras e tela
1080p30 sem congelar > 1 s (SC-004); mesmos tempos de T03–T09 (SC-003); mensagem e volta em ≤ 10 s
(SC-006)

**Constraints**: nada instalado por quem usa; nenhum serviço pago (FR-010); só a porta 443 basta para
a mídia em redes restritas (FR-011); uma qualidade por mídia (FR-002a); interface e textos da T09
inalterados exceto `midiaIndisponivel` (FR-009)

**Scale/Scope**: salas de até 6 pessoas; servidor ≈ 60 Mbit/s de saída por sala cheia; ~3 módulos
novos (`src/permissao-midia.js`, `src/livekit.js`, `public/js/midia-estado.js`), `midia.js`
reescrito (~mesmo tamanho), servidor com 2 rotas e 2 mensagens novas e 1 removida, 3 arquivos de
implantação (`docker-compose.yml`, `livekit.yaml`, `Caddyfile`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Duas dependências novas e dois serviços de implantação, exigidos por critérios concretos (uma transmissão por mídia, acesso por sala, redes só-HTTPS); escolhida a opção com **menos código próprio** (research §1). Sem SDK de servidor nem empacotador. Remove a malha (`compararPares`, `CANAIS`, `sinal`). Justificativa em Complexity Tracking | ✅ (justificado) |
| II. Código legível | Regras novas como funções puras nomeadas em pt-BR (`assinaturasDesejadas`, `trilhasParaPublicar`, `proximoEstadoMidia`, `criarPermissaoMidia`, `verificarAvisoLivekit`); `midia.js` mantém a mesma interface para `app.js` | ✅ |
| III. Testes da lógica principal | Acesso à mídia (emissão, revogação, webhook) é gerenciamento de conexões e participantes → testes de unidade e integração; republicação e estados de conexão testados como funções puras; `midia.js` testado com `Room` falso | ✅ |
| IV. Erros claros em pt-BR | Única mensagem nova: "Não foi possível conectar voz, câmera e tela. Tentando de novo…" (diz o que houve e que está tentando); falhas do LiveKit nunca mostram código | ✅ |
| V. Interface em pt-BR | Nenhum texto em inglês na interface; textos do `livekit-client` não chegam à tela | ✅ |
| Restrição: nada a instalar | Tudo continua no navegador | ✅ |
| Restrição: escala de amigos | Mesmo limite de 6; sem escala horizontal | ✅ |

**Re-check pós-design**: ✅ sem violações novas; Complexity Tracking abaixo.

**Mudanças em código de tarefas anteriores** (necessárias, não violações):

- T03–T05: malha WebRTC, `sinal`, `devoIniciar`, `compararPares`, `CANAIS`, `transceptorDe`,
  `enviaTelaPara` removidos; `midia-regras.test.js` perde os testes da malha; `midia.test.js`
  reescrito com `Room` falso (mesmos comportamentos).
- T02: registro de salas ganha `aoSair` e `participanteNaSala`; `conexaoPorId`/`idPorConexao` saem.
- T04: o quadro "falhou" passa a valer para trilha assinada que não chega (`TrackSubscriptionFailed`).
- T05: `assistindo` passa a decidir **assinatura** em quem assiste, não envio em quem compartilha.
- T06: a qualidade é aplicada no `sender` da publicação; `qualidades.js` sem mudança.
- Implantação: `Dockerfile` igual; `docker-compose.yml`, `livekit.yaml` e `Caddyfile` novos; README
  ganha "Como rodar com mídia" e "Implantação".

## Project Structure

### Documentation (this feature)

```text
specs/010-midia-por-servidor/
├── plan.md              # este arquivo
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── websocket.md     # `midia`, `pedir-midia`; `sinal` removida
│   ├── livekit.md       # navegador ↔ LiveKit, app → LiveKit, webhook, configuração
│   └── ui.md            # mensagem e botões com o servidor de mídia fora do ar
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── servidor.js            # + mensagem `midia` após `entrou`, `pedir-midia`, rota
│                          #   POST /api/livekit/eventos, rota GET /js/livekit-client.js;
│                          #   − `sinal`
├── salas.js               # + aoSair, participanteNaSala; − conexaoPorId, idPorConexao
├── permissao-midia.js     # novo: JWT HS256 (permissão e administração), verificação do webhook
├── livekit.js             # novo: configuração (env + padrões de dev) e RemoveParticipant
└── ids.js

public/js/
├── midia.js               # reescrito sobre livekit-client; mesma interface + estado da conexão
├── midia-estado.js        # novo: proximoEstadoMidia, trilhasParaPublicar, assinaturasDesejadas
├── midia-regras.js        # − devoIniciar, compararPares
├── app.js                 # pedir/receber `midia`, mensagem e botões por estado; − `sinal`
└── textos.js              # + midiaIndisponivel

tests/
├── unit/
│   ├── permissao-midia.test.js   # novo
│   ├── midia-estado.test.js      # novo
│   ├── midia.test.js             # reescrito (Room falso)
│   ├── midia-regras.test.js      # sem os testes da malha
│   └── salas.test.js             # + aoSair, participanteNaSala
└── integration/
    ├── midia-acesso.test.js      # novo: `midia`, `pedir-midia`, webhook, RemoveParticipant
    ├── websocket.test.js         # − testes de `sinal`
    └── estaticos.test.js         # + /js/livekit-client.js

docker-compose.yml          # novo: caddy, livekit, app
livekit.yaml                # novo
Caddyfile                   # novo
.env.exemplo                # novo (sem segredos reais)
README.md                   # + rodar com mídia, implantação
```

**Structure Decision**: mesma estrutura de projeto único (`src/` servidor, `public/` navegador,
`tests/`), com arquivos de implantação na raiz ao lado do `Dockerfile` existente.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Servidor de mídia LiveKit (serviço novo) | O pedido é exatamente "a mídia passa por um servidor" (uma transmissão por mídia, SC-001/002/004) | Malha direta: é o problema relatado. mediasoup embutido: mais código próprio (sinalização SFU, empacotar o cliente) e ainda precisaria de TURN |
| Dependência `livekit-client` | Falar com o LiveKit (negociação, reconexão, assinaturas) | Implementar o protocolo do LiveKit à mão: milhares de linhas |
| Caddy com camada 4 | FR-011: mídia pela mesma porta 443 do site em redes que só liberam HTTPS | Porta TURN separada (ex.: 5349): bloqueada justamente nessas redes; segundo IP: nem toda hospedagem oferece |
| Webhook do LiveKit | FR-006/SC-005: recusar quem já saiu mesmo com token ainda válido ou após o servidor de mídia reiniciar | Só expulsar ao sair: não cobre o reuso do token nos 30 s nem a volta após reinício |
