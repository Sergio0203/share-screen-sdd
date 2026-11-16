# Implementation Plan: T01 · Criar uma sala

**Branch**: `001-criar-sala` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-criar-sala/spec.md`

## Summary

Um clique em "Criar sala" cria uma sala sem cadastro, leva a pessoa (como anfitriã) para dentro dela
e copia o link para a área de transferência, com fallback visível quando o navegador bloqueia a
cópia. Abordagem: servidor Node.js mínimo (`node:http` + `ws`) mantendo as salas em memória, com id
e token de anfitrião aleatórios de 128 bits; presença medida por conexões WebSocket, com expiração 60 s
após a sala ficar vazia; front-end em HTML/JS puros numa SPA de duas telas, que copia o link no
mesmo gesto do clique via `ClipboardItem` com promessa. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (ES2023, módulos ES) em Node.js 22 LTS e navegadores modernos

**Primary Dependencies**: `ws` (WebSocket no servidor). Dev: `prettier`

**Storage**: em memória (`Map` no processo do servidor); nada persistido

**Testing**: `node:test` + `node:assert` (unitários e integração); roteiro manual no navegador

**Target Platform**: servidor Linux/macOS com Node.js 22; navegadores de desktop atuais (Chrome,
Firefox, Safari)

**Project Type**: aplicação web (servidor + arquivos estáticos no mesmo projeto)

**Performance Goals**: clique em "Criar sala" → dentro da sala com link pronto em < 3 s (SC-001)

**Constraints**: sem cadastro; sem etapa de build; cópia automática precisa ocorrer no mesmo gesto do
clique; textos em pt-BR conforme [contracts/ui.md](contracts/ui.md)

**Scale/Scope**: grupos pequenos de amigos; um único processo de servidor; 2 telas (início e sala)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | 1 dependência de produção; sem framework, sem build, sem banco; tudo justificado por FRs | ✅ |
| II. Código legível | Prettier configurado; módulos pequenos com responsabilidade única (registro de salas, servidor, cópia, telas) | ✅ |
| III. Testes da lógica principal | Registro de salas (ids, anfitrião, presença, expiração), contratos HTTP/WebSocket e lógica de cópia cobertos por `node:test` | ✅ |
| IV. Erros claros em pt-BR | Toda falha mapeada para texto em [contracts/ui.md](contracts/ui.md); servidor não expõe detalhes técnicos | ✅ |
| V. Interface em pt-BR | Todos os textos centralizados em [contracts/ui.md](contracts/ui.md) | ✅ |
| Restrições: sem instalar nada | Tudo roda no navegador | ✅ |

**Re-check pós-design**: ✅ sem violações. O WebSocket é a única peça além do mínimo HTTP e é
exigido por FR-014 (saber quando a sala fica vazia).

## Project Structure

### Documentation (this feature)

```text
specs/001-criar-sala/
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
package.json             # scripts: start, test, format, format:check
src/
├── servidor.js          # node:http: rotas HTTP, arquivos estáticos, upgrade WebSocket
├── salas.js             # registro de salas: criar, entrar, sair, expirar (relógio injetável)
└── ids.js               # geração de ids/tokens aleatórios e comparação segura
public/
├── index.html           # SPA: tela inicial e tela da sala
├── estilos.css
└── js/
    ├── app.js           # roteamento por caminho, telas, WebSocket
    ├── copiar.js        # lógica de cópia (automática/manual), área de transferência injetável
    └── textos.js        # todos os textos pt-BR de contracts/ui.md
tests/
├── unit/
│   ├── salas.test.js
│   ├── ids.test.js
│   └── copiar.test.js
└── integration/
    ├── http.test.js
    └── websocket.test.js
```

**Structure Decision**: projeto único. O servidor (`src/`) também serve o front-end estático
(`public/`); não há separação frontend/backend porque não há build nem deploy separados.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
