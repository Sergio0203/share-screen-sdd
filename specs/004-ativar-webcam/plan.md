# Implementation Plan: T04 · Ativar a webcam

**Branch**: `004-ativar-webcam` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-ativar-webcam/spec.md`

## Summary

Cada pessoa entra com a câmera desligada; um botão liga e desliga a câmera; com ela ligada, todos
veem o vídeo num quadro com o nome; desligar faz o quadro sumir para todos em ≤ 3 s; a lista ganha
um indicador de câmera; falhas só geram mensagem para a própria pessoa. Abordagem: as conexões
diretas da T03 passam a ter também um canal de vídeo, e ligar/desligar a câmera é só trocar a
trilha (sem renegociar); a nova mensagem `camera` atualiza a lista `participantes`, que decide
quais quadros existem e alimenta o indicador. O módulo `voz.js` vira `midia.js`, pois passa a
cuidar de microfone e câmera. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T03)

**Primary Dependencies**: `ws` (já instalado); APIs nativas `getUserMedia` e `RTCPeerConnection`;
STUN público da T03. Dev: `prettier`. **Nenhuma dependência nova**

**Storage**: em memória no servidor (`cameraLigada` por participante); nada novo no `localStorage`

**Testing**: `node:test` (unitários + integração com servidor real); roteiro manual com perfis de
navegador e webcam

**Target Platform**: navegadores de desktop modernos em contexto seguro (`https://` ou `localhost`);
servidor Node.js

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: quadro aparece/some para todos em ≤ 3 s; vídeo 640×360 a ~15 quadros/s
(~300–600 kbit/s por destino); voz sem cortes com 6 câmeras ligadas

**Constraints**: só conexão direta (T03); até 5 vídeos enviados e 5 recebidos por navegador; textos
de [contracts/ui.md](contracts/ui.md)

**Scale/Scope**: grupos de até 6 pessoas; 1 botão novo, área de até 6 quadros, 1 indicador por
participante, 4 mensagens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Mesmas conexões e sinalização da T03; vídeo por troca de trilha, sem renegociar; sem limite manual de taxa; estado da câmera no mesmo caminho do microfone | ✅ |
| II. Código legível | `voz.js` → `midia.js` (nome condiz com o conteúdo); quadros decididos numa função pura; transceptores localizados pelo tipo, não pela posição | ✅ |
| III. Testes da lógica principal | Estado da câmera no servidor, protocolo, quadros, indicador e classificação de erros cobertos; câmera/WebRTC reais no roteiro manual | ✅ |
| IV. Erros claros em pt-BR | Quatro mensagens de câmera e o quadro de falha em [contracts/ui.md](contracts/ui.md) | ✅ |
| V. Interface em pt-BR | Textos novos em `textos.js`; diálogo de permissão é do navegador | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código da T03** (necessárias, não violações): renomes `voz.js` → `midia.js`,
`voz-regras.js` → `midia-regras.js`, `classificarErroMicrofone` → `classificarErroCaptura`
(`semMicrofone` → `semDispositivo`); transceptor de áudio passa a ser localizado pelo tipo; testes
da T03 atualizados para o campo `camera` nas listas.

## Project Structure

### Documentation (this feature)

```text
specs/004-ativar-webcam/
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
├── servidor.js          # ALTERADO: mensagem `camera`
└── salas.js             # ALTERADO: cameraLigada, definirCamera, `camera` em listar, zera na substituição
public/
├── estilos.css          # ALTERADO: botão de câmera, área/grade de vídeos, quadro, indicador de câmera
└── js/
    ├── app.js           # ALTERADO: botão de câmera, área de vídeos, indicador, mensagens de câmera
    ├── textos.js        # ALTERADO: textos de contracts/ui.md (T04)
    ├── participantes.js # ALTERADO: rótulo do indicador de câmera
    ├── quadros.js       # NOVO (puro): quadrosDeVideo
    ├── midia.js         # RENOMEADO de voz.js + câmera, transceptor de vídeo, <video> por par, prévia local
    └── midia-regras.js  # RENOMEADO de voz-regras.js; classificarErroCaptura
tests/
├── unit/
│   ├── salas.test.js           # ALTERADO: câmera
│   ├── participantes.test.js   # ALTERADO: indicador de câmera
│   ├── quadros.test.js         # NOVO
│   └── midia-regras.test.js    # RENOMEADO de voz-regras.test.js
└── integration/
    └── websocket.test.js       # ALTERADO: câmera, `camera` nas listas
```

**Structure Decision**: mesmo projeto único; o módulo de mídia é generalizado em vez de duplicado,
e a decisão de quais quadros mostrar fica num módulo puro testável (`quadros.js`).

## Complexity Tracking

Nenhuma violação da constituição a justificar.
