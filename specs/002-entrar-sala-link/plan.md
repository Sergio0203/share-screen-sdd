# Implementation Plan: T02 · Entrar na sala pelo link

**Branch**: `002-entrar-sala-link` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-entrar-sala-link/spec.md`

## Summary

Quem abre o link vê uma tela de nome (ou "Sala cheia"/"não existe"), entra e passa a ver a lista de
participantes, atualizada em tempo real para todos. O criador informa o nome na página inicial. A
sala aceita 6 pessoas e o papel de anfitrião passa ao participante mais antigo se o anfitrião ficar
10 s fora. Abordagem: estender o código da T01 sem dependências novas — chave secreta de
participante por navegador e sala (substitui o `tokenAnfitriao`), registro de salas com
participantes, capacidade e transferência de anfitrião (relógio injetável), lista completa enviada
pelo WebSocket a cada mudança, *ping* de 1 s para detectar quedas, e `GET /api/salas/<id>` para
verificar a sala antes de pedir o nome. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T01)

**Primary Dependencies**: `ws` (já instalado). Dev: `prettier`. Nenhuma nova

**Storage**: em memória no servidor; `localStorage` no navegador (`nomeExibicao`, `sala:<id>`)

**Testing**: `node:test` (unitários + integração com servidor real em porta aleatória); roteiro
manual com várias janelas

**Target Platform**: igual à T01

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: lista atualizada para todos em ≤ 3 s após entrada/saída (detecção de queda
≤ ~2 s via *ping*)

**Constraints**: máx. 6 participantes por sala; transferência de anfitrião após 10 s; nome 1–30
caracteres; textos de [contracts/ui.md](contracts/ui.md)

**Scale/Scope**: grupos de até 6 pessoas por sala; 5 telas (início, nome, sala, sala cheia,
inexistente)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Nenhuma dependência nova; lista enviada inteira; regras de entrada/anfitrião num único registro; *ping* e `GET /api/salas/<id>` justificados por FR-006 e FR-010 | ✅ |
| II. Código legível | Validação de nome num módulo único usado nos dois lados; rótulos da lista em módulo puro; `app.js` só com DOM/fluxo | ✅ |
| III. Testes da lógica principal | Entrada, capacidade, corrida pela última vaga, substituição de conexão, transferência de anfitrião, *ping* e validação de nome cobertos por testes | ✅ |
| IV. Erros claros em pt-BR | Cada código de erro do servidor tem texto em [contracts/ui.md](contracts/ui.md) | ✅ |
| V. Interface em pt-BR | Todos os textos novos em `textos.js` | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código da T01** (necessárias, não violações): `tokenAnfitriao` → `chave`; `entrar`
passa a exigir `nome`; página inicial ganha campo de nome; mensagem de sala inexistente muda; testes
da T01 são atualizados.

## Project Structure

### Documentation (this feature)

```text
specs/002-entrar-sala-link/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http.md
│   ├── websocket.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── servidor.js          # ALTERADO: GET /api/salas/<id>, novo protocolo WS, lista para todos, ping
├── salas.js             # ALTERADO: participantes, capacidade, chaves, transferência de anfitrião
└── ids.js               # sem mudança
public/
├── index.html           # sem mudança
├── estilos.css          # ALTERADO: formulário de nome, lista de participantes
└── js/
    ├── app.js           # ALTERADO: campo de nome no início, telas de nome/cheia/inexistente, lista
    ├── copiar.js        # sem mudança
    ├── textos.js        # ALTERADO: textos de contracts/ui.md (T02)
    ├── nome.js          # NOVO: normalizarNome (usado também pelo servidor)
    └── participantes.js # NOVO: rótulos da lista ("(você)", "anfitrião")
tests/
├── unit/
│   ├── salas.test.js           # ALTERADO + novos casos
│   ├── nome.test.js            # NOVO
│   └── participantes.test.js   # NOVO
└── integration/
    ├── api-salas.test.js       # ALTERADO: chave, GET /api/salas/<id>
    └── websocket.test.js       # ALTERADO + novos casos (lista, cheia, substituição, ping)
```

**Structure Decision**: mesmo projeto único da T01; dois módulos novos pequenos no front-end, um
deles (`nome.js`) compartilhado com o servidor por import relativo.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
