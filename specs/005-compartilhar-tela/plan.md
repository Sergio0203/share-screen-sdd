# Implementation Plan: T05 · Compartilhar a tela

**Branch**: `005-compartilhar-tela` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-compartilhar-tela/spec.md`

## Summary

Qualquer pessoa pode compartilhar a tela inteira ou a janela de um app (com som quando o navegador
permitir); os outros veem em destaque, acima das câmeras, com tela cheia; com vários
compartilhamentos, cada pessoa escolhe o destaque e recebe a imagem só dele. Abordagem: as conexões
diretas da T03/T04 ganham dois canais (vídeo e áudio da tela), identificados pela posição; a
mensagem `tela` publica quem compartilha (com um contador do servidor para "o mais recente") e a
mensagem `assistindo` publica o destaque de cada pessoa; quem compartilha só envia a tela para quem
a está assistindo. A escolha do destaque é uma função pura; a área da tela vira um módulo de
interface próprio. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T04)

**Primary Dependencies**: `ws` (já instalado); APIs nativas `getDisplayMedia`, `getUserMedia`,
`RTCPeerConnection`, Fullscreen API; STUN público da T03. Dev: `prettier`. **Nenhuma dependência nova**

**Storage**: em memória no servidor (`tela`, `assistindo` por participante; contador por sala)

**Testing**: `node:test` (unitários + integração com servidor real); roteiro manual com perfis de
navegador, app com som, macOS e celular

**Target Platform**: compartilhar — Chrome, Edge ou Firefox de computador em contexto seguro;
assistir — qualquer navegador moderno, inclusive celular; servidor Node.js

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: começar a ver ≤ 5 s; parar de ver ≤ 3 s; trocar destaque ≤ 2 s; captura até
30 quadros/s priorizando fluidez

**Constraints**: só conexão direta (T03); cada pessoa recebe no máximo uma tela (a do destaque);
quem compartilha envia só para quem assiste; textos de [contracts/ui.md](contracts/ui.md)

**Scale/Scope**: até 6 pessoas, até 6 compartilhamentos simultâneos; 1 botão, 1 área de destaque
com miniaturas e tela cheia, 2 mensagens novas no protocolo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Mesmas conexões e sinalização; canais fixos sem renegociação; estado no mesmo caminho (lista); sem limite manual de taxa; sem dependências | ✅ |
| II. Código legível | Regras de destaque e de erros em funções puras; área da tela num módulo próprio (`area-tela.js`) para não inchar `app.js`; canais com nomes (`CANAIS`) em vez de índices soltos | ✅ |
| III. Testes da lógica principal | Estado da tela/assistindo no servidor, contador, protocolo, escolha de destaque e classificação de erros cobertos; captura/WebRTC/tela cheia reais no roteiro manual | ✅ |
| IV. Erros claros em pt-BR | Mensagens de permissão, falha, sem suporte e destaque com falha em [contracts/ui.md](contracts/ui.md); cancelar não gera erro falso | ✅ |
| V. Interface em pt-BR | Textos novos em `textos.js`; a janela de escolha é do navegador | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código da T04** (necessárias, não violações): canais passam de "por tipo" para "por
posição" (`CANAIS`), pois há dois canais de vídeo; testes da T04 atualizados para `tela` e
`assistindo` nas listas.

## Project Structure

### Documentation (this feature)

```text
specs/005-compartilhar-tela/
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
├── servidor.js          # ALTERADO: mensagens `tela` e `assistindo`
└── salas.js             # ALTERADO: tela/assistindo, contador por sala, definirTela, definirAssistindo
public/
├── estilos.css          # ALTERADO: botão de compartilhar, área da tela, miniaturas, tela cheia
└── js/
    ├── app.js           # ALTERADO: botão de compartilhar, escolha/assistindo, liga area-tela
    ├── textos.js        # ALTERADO: textos de contracts/ui.md (T05)
    ├── midia.js         # ALTERADO: CANAIS por posição, captura da tela, envio só para quem assiste, telaDe(id)
    ├── midia-regras.js  # ALTERADO: classificarErroCompartilhamento
    ├── destaque.js      # NOVO (puro): escolherDestaque
    └── area-tela.js     # NOVO: destaque, miniaturas, tela cheia (DOM)
tests/
├── unit/
│   ├── salas.test.js           # ALTERADO: tela, assistindo, contador
│   ├── destaque.test.js        # NOVO
│   └── midia-regras.test.js    # ALTERADO: classificarErroCompartilhamento
└── integration/
    └── websocket.test.js       # ALTERADO: tela, assistindo, campos nas listas
```

**Structure Decision**: mesmo projeto único; a lógica de destaque fica num módulo puro e a
interface da área da tela num módulo próprio, para manter `app.js` como orquestrador da sala.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
