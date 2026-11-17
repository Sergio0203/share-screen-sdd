# Implementation Plan: T03 · Conversar por voz

**Branch**: `003-conversar-por-voz` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-conversar-por-voz/spec.md`

## Summary

Cada pessoa entra com o microfone desligado; um botão liga e desliga o microfone; com ele ligado, a
voz vai **direto** para os outros da sala; a lista mostra o microfone de cada um; falhas de
permissão ou de microfone só geram uma mensagem para a própria pessoa. Abordagem: WebRTC nativo em
malha (até 5 conexões de áudio por navegador), só com STUN público e sem TURN (clarificação); a
sinalização reaproveita o WebSocket da sala com a nova mensagem `sinal`, que o servidor só repassa
dentro da sala; o estado do microfone vai na lista `participantes` que já é enviada a todos. Ligar e
desligar é `replaceTrack` sem renegociação; quem tem o id menor inicia cada par. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T01/T02)

**Primary Dependencies**: `ws` (já instalado); APIs nativas do navegador `getUserMedia` e
`RTCPeerConnection`. Dev: `prettier`. **Nenhuma dependência npm nova**. Serviço externo: STUN
público (`stun:stun.l.google.com:19302`), sem tráfego de áudio

**Storage**: em memória no servidor (`microfoneLigado` por participante); nada novo no
`localStorage`

**Testing**: `node:test` (unitários + integração com servidor real); roteiro manual com perfis de
navegador e fone de ouvido para áudio e permissões

**Target Platform**: navegadores de desktop modernos em contexto seguro (`https://` ou `localhost`);
servidor Node.js

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: parar de ser ouvido ≤ 1 s após desligar (local, imediato); indicador
atualizado para todos ≤ 3 s; atraso de voz ≲ 1 s (conexão direta)

**Constraints**: voz só por conexão direta (sem servidor de mídia nem TURN); máx. 6 pessoas → até
15 conexões de voz por sala; mensagens WebSocket ≤ 64 KiB; textos de [contracts/ui.md](contracts/ui.md)

**Scale/Scope**: grupos de até 6 pessoas; 1 botão novo, 1 indicador por participante, 5 mensagens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | WebRTC nativo sem biblioteca; sem servidor de mídia nem TURN; sinalização no WebSocket existente; sem renegociação; STUN público justificado por FR-004 (sem ele só funcionaria em rede local) | ✅ |
| II. Código legível | Regras de pares e de erros num módulo puro (`voz-regras.js`); WebRTC/captura em `voz.js`; `app.js` só liga botões e mensagens | ✅ |
| III. Testes da lógica principal | Sinalização (repasse, isolamento por sala, validação), estado do microfone, substituição e regras de pares cobertos por testes; WebRTC/captura reais no roteiro manual | ✅ |
| IV. Erros claros em pt-BR | Cada falha de microfone e de conexão de voz tem mensagem em [contracts/ui.md](contracts/ui.md); nenhuma falha silenciosa (FR-014) | ✅ |
| V. Interface em pt-BR | Textos novos em `textos.js`; o diálogo de permissão é do navegador (exceção prevista) | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código da T02** (necessárias, não violações): a substituição de conexão passa a gerar
um id público novo (research §5); os testes que esperavam o mesmo id são atualizados; o tratamento
de mensagens no servidor deixa de aceitar só `entrar`.

## Project Structure

### Documentation (this feature)

```text
specs/003-conversar-por-voz/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── websocket.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── servidor.js          # ALTERADO: roteia entrar/microfone/sinal; repasse de sinal; maxPayload 64 KiB
├── salas.js             # ALTERADO: microfoneLigado, definirMicrofone, conexaoPorId, idPorConexao; id novo na substituição
└── ids.js               # sem mudança
public/
├── index.html           # sem mudança
├── estilos.css          # ALTERADO: botão de microfone, indicador na lista, botão "Ativar som"
└── js/
    ├── app.js           # ALTERADO: botão de microfone, "Ativar som", indicador, repassa sinal/lista para voz.js
    ├── textos.js        # ALTERADO: textos de contracts/ui.md (T03)
    ├── participantes.js # ALTERADO: rótulo do indicador de microfone
    ├── voz-regras.js    # NOVO (puro): devoIniciar, compararPares, classificarErroMicrofone
    └── voz.js           # NOVO: captura do microfone, conexões RTC por par, <audio> remotos, som bloqueado
tests/
├── unit/
│   ├── salas.test.js           # ALTERADO: microfone, id novo na substituição, busca por id/conexão
│   ├── participantes.test.js   # ALTERADO: indicador de microfone
│   └── voz-regras.test.js      # NOVO
└── integration/
    └── websocket.test.js       # ALTERADO: microfone, sinal, validações, limite de tamanho, substituição
```

**Structure Decision**: mesmo projeto único; dois módulos novos no front-end, separando a lógica
pura testável (`voz-regras.js`) do código que depende das APIs de mídia do navegador (`voz.js`).

## Complexity Tracking

Nenhuma violação da constituição a justificar.
