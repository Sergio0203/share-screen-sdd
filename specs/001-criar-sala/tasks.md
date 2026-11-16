---

description: "Task list for T01 · Criar uma sala"
---

# Tasks: T01 · Criar uma sala

**Input**: Design documents from `/specs/001-criar-sala/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos. A constituição (Princípio III) exige testes automatizados para a lógica
principal; cada história traz seus testes antes da implementação.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único na raiz: `src/` (servidor), `public/` (front-end estático), `tests/` (unit e
integration). Ver [plan.md](plan.md).

**Regras gerais para todas as tarefas**: JavaScript com módulos ES (`"type": "module"`), Node.js 22,
sem frameworks além de `ws`. Todo texto visível vem de `public/js/textos.js`, com os textos exatos de
[contracts/ui.md](contracts/ui.md). Nomes de variáveis e funções em português, como nos contratos.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicializar o projeto Node.js.

- [X] T001 Criar `package.json` na raiz com `"type": "module"`, `"engines": { "node": ">=22" }`, dependência `ws`, devDependency `prettier`, e scripts `"start": "node src/servidor.js"`, `"test": "node --test tests/"`, `"format": "prettier --write ."`, `"format:check": "prettier --check ."`; rodar `npm install` para gerar `package-lock.json`
- [X] T002 [P] Criar `.gitignore` na raiz com `node_modules/`, e `.prettierignore` na raiz com `node_modules/`, `package-lock.json` e `.specify/`
- [X] T003 [P] Criar `.prettierrc.json` na raiz com `{ "printWidth": 100 }`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Servidor HTTP mínimo e textos compartilhados, necessários para todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Criar `public/js/textos.js` exportando um objeto `TEXTOS` com exatamente todos os textos de [contracts/ui.md](contracts/ui.md) (`criarSala: "Criar sala"`, `criandoSala: "Criando sala…"`, `erroCriar`, `tituloSala: "Sua sala"`, `voceEAnfitriao: "Você é o anfitrião desta sala"`, `copiarLink: "Copiar link"`, `linkCopiado: "Link copiado!"`, `erroCopiar`, `salaInexistente: "Esta sala não existe mais."`, `criarNovaSala: "Criar nova sala"`, `conexaoPerdida`)
- [X] T005 [P] Criar `public/index.html` (`<html lang="pt-BR">`, título "Compartilhar tela") com dois contêineres `<main id="tela-inicio" hidden>` e `<main id="tela-sala" hidden>`, uma área de mensagens `<p id="mensagem" role="status" aria-live="polite">`, carregando `/estilos.css` e `<script type="module" src="/js/app.js">`; e `public/estilos.css` com layout simples centralizado
- [X] T006 Criar `src/servidor.js` exportando `criarServidor()` que retorna um `http.Server` (sem chamar `listen`) que: serve `public/index.html` para `GET /` e para `GET /sala/<qualquer coisa>`; serve arquivos de `public/` para outros `GET` com `Content-Type` correto por extensão (`.html`, `.js`, `.css`), recusando com 404 qualquer caminho que, resolvido, saia de `public/`; responde 404 para o resto. Se o arquivo for executado diretamente (`import.meta.url` igual ao script principal), chamar `listen(process.env.PORT ?? 3000)` e logar a URL
- [X] T007 Criar `tests/integration/auxiliares.js` exportando `subirServidor()` que chama `criarServidor()` (aceitando opções repassadas), faz `listen(0)` e devolve `{ url, urlWs, fechar }`
- [X] T008 Criar `tests/integration/estaticos.test.js` verificando: `GET /` e `GET /sala/abc` devolvem 200 com o HTML; `GET /js/textos.js` devolve 200 com `Content-Type` JavaScript; `GET /../package.json` (caminho codificado `%2e%2e`) devolve 404

**Checkpoint**: `npm start` serve a página vazia; `npm test` passa.

---

## Phase 3: User Story 1 - Criar sala com um clique e receber o link copiado (Priority: P1) 🎯 MVP

**Goal**: Um clique em "Criar sala" cria a sala, leva a pessoa para dentro como anfitriã e copia o
link automaticamente, com confirmação "Link copiado!".

**Independent Test**: Em navegador que permite cópia automática, clicar em "Criar sala" → dentro de
`/sala/<id>`, ver "Você é o anfitrião desta sala" e "Link copiado!"; colar resulta no link. Recarregar
mantém a sala e o papel de anfitrião.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Criar `tests/unit/ids.test.js`: `gerarSegredo()` devolve string que casa com `^[A-Za-z0-9_-]{22}$`; 10.000 chamadas não repetem valor (SC-003); `idValido()` aceita só `^[A-Za-z0-9_-]{22}$`; `segredosIguais(a, b)` é `true` para iguais, `false` para diferentes, para tamanhos diferentes e para `undefined`
- [X] T010 [P] [US1] Criar `tests/unit/salas.test.js` usando relógio falso (funções `agendar`/`cancelar` injetadas que guardam callbacks para disparo manual): `criar()` devolve `{ id, tokenAnfitriao }` distintos e a sala existe; sala criada sem ninguém expira após o prazo de 60 s; `entrar(id, conexao, token)` com token correto → `{ anfitriao: true }`, sem token ou com token errado → `{ anfitriao: false }`; `entrar` em id inexistente → `null`; entrar cancela a expiração; `sair` da última conexão agenda expiração de 60 s e, disparada, remove a sala; entrar de novo antes do disparo mantém a sala e o anfitrião (FR-010, FR-014, FR-015); `sair` com outra pessoa ainda presente não agenda expiração
- [X] T011 [P] [US1] Criar `tests/integration/api-salas.test.js`: `POST /api/salas` → 201 com JSON `{ id, link, tokenAnfitriao }`, `link` igual a `${url}/sala/${id}`; dois POSTs → ids diferentes; `GET /api/salas` → 405 com `{ "erro": "Método não permitido." }`
- [X] T012 [P] [US1] Criar `tests/integration/websocket.test.js` (usando o cliente `ws`): após `POST /api/salas`, conectar em `/ws` e enviar `{ tipo: "entrar", idSala, tokenAnfitriao }` → recebe `{ tipo: "entrou", idSala, anfitriao: true }`; segunda conexão sem token → `anfitriao: false`; id inexistente → `{ tipo: "erro", codigo: "sala-inexistente" }` e conexão fechada; JSON inválido, `tipo` desconhecido ou `entrar` repetido → `{ tipo: "erro", codigo: "mensagem-invalida" }` e conexão fechada; com `toleranciaMs` pequena injetada no servidor, fechar a única conexão e esperar o prazo → nova conexão recebe `sala-inexistente`

### Implementation for User Story 1

- [X] T013 [P] [US1] Criar `src/ids.js` com `gerarSegredo()` (`crypto.randomBytes(16).toString("base64url")`, 22 caracteres), `idValido(texto)` (regex `^[A-Za-z0-9_-]{22}$`) e `segredosIguais(a, b)` (strings; `false` se algum não for string ou se tamanhos diferirem; senão `crypto.timingSafeEqual`)
- [X] T014 [US1] Criar `src/salas.js` exportando `criarRegistroSalas({ toleranciaMs = 60_000, agendar = setTimeout, cancelar = clearTimeout } = {})` com estado num `Map` de salas `{ id, tokenAnfitriao, criadaEm, conexoes: Set, expiracao }` conforme [data-model.md](data-model.md), e métodos: `criar()` (gera id com `gerarSegredo`, repetindo se já existir; agenda expiração; devolve `{ id, tokenAnfitriao }`), `existe(id)`, `entrar(id, conexao, token)` (devolve `null` se não existe; cancela expiração; adiciona conexão; devolve `{ anfitriao: segredosIguais(token, sala.tokenAnfitriao) }`), `sair(id, conexao)` (remove conexão; se vazia, agenda remoção após `toleranciaMs`). Fazer T010 passar
- [X] T015 [US1] Em `src/servidor.js`, fazer `criarServidor({ registro = criarRegistroSalas(opcoes) })` aceitar opções e adicionar `POST /api/salas` conforme [contracts/http.md](contracts/http.md): cria sala, monta `link` a partir do cabeçalho `Host` e do protocolo (`x-forwarded-proto` se presente, senão `http`), responde 201 JSON; outros métodos em `/api/salas` → 405 `{ "erro": "Método não permitido." }`; exceção inesperada → 500 `{ "erro": "Não foi possível criar a sala. Tente novamente." }` (sem stack trace na resposta). Fazer T011 passar
- [X] T016 [US1] Em `src/servidor.js`, criar um `WebSocketServer` do `ws` com `noServer: true` e tratar `upgrade` apenas em `/ws` (outros caminhos: destruir o socket). Implementar [contracts/websocket.md](contracts/websocket.md): primeira mensagem deve ser `entrar` com `idSala` válido (`idValido`) e existente → `registro.entrar` e responde `entrou`; casos de erro respondem `erro` com o `codigo` e fecham; no evento `close` chamar `registro.sair` se a conexão tiver entrado. Fazer T012 passar
- [X] T017 [P] [US1] Criar `public/js/copiar.js` exportando `copiarAoCriar(promessaLink, { clipboard = navigator.clipboard, ClipboardItemCls = globalThis.ClipboardItem } = {})`: deve ser chamada **sincronamente** dentro do handler do clique; se `ClipboardItemCls` e `clipboard.write` existirem, chama `clipboard.write([new ClipboardItemCls({ "text/plain": promessaLink.then(l => new Blob([l], { type: "text/plain" })) })])`; senão aguarda `promessaLink` e chama `clipboard.writeText(link)`; devolve `Promise<boolean>` (`true` se copiou, `false` em qualquer rejeição ou se `clipboard` não existir — nunca rejeita). Ver [research.md](research.md) §5
- [X] T018 [P] [US1] Criar `tests/unit/copiar.test.js` para `copiarAoCriar` com área de transferência e `ClipboardItem` falsos: caminho `write` com sucesso → `true` e o blob contém o link; `write` rejeita → `false`; sem `ClipboardItemCls` usa `writeText` com o link → `true`; `writeText` rejeita → `false`; `clipboard` indefinido → `false`
- [X] T019 [US1] Criar `public/js/app.js` com roteamento por caminho: `/` → tela inicial; `/sala/<id>` → tela da sala; `popstate` re-renderiza. **Tela inicial**: botão `TEXTOS.criarSala`; no clique: desabilita o botão com `TEXTOS.criandoSala` (FR-011), dispara `fetch("POST /api/salas")`, chama **no mesmo tique** `copiarAoCriar(promessaLink)`; ao receber a resposta, salva `localStorage["anfitriao:<id>"] = tokenAnfitriao`, faz `history.pushState` para `/sala/<id>` e mostra a tela da sala; se o fetch falhar (rede ou status ≠ 201), mostra `TEXTOS.erroCriar` em `#mensagem` e reabilita o botão. Quando `copiarAoCriar` resolver `true`, mostrar `TEXTOS.linkCopiado` por ~2,5 s e depois limpar
- [X] T020 [US1] Em `public/js/app.js`, implementar a **tela da sala**: título `TEXTOS.tituloSala`; link completo (`location.origin + "/sala/" + id`) em um `<input readonly>` selecionável; abre WebSocket em `ws(s)://<host>/ws` e envia `entrar` com o token de `localStorage["anfitriao:<id>"]` se existir; em `entrou` com `anfitriao: true`, mostra `TEXTOS.voceEAnfitriao` (FR-016); em `erro` `sala-inexistente`, troca a tela por `TEXTOS.salaInexistente` + botão `TEXTOS.criarNovaSala` que leva a `/`; em fechamento inesperado da conexão, mostra `TEXTOS.conexaoPerdida`. Recarregar `/sala/<id>` deve funcionar pelo mesmo caminho (FR-010)

**Checkpoint**: História 1 completa — passos 1, 3, 4, 5, 7 e 8 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 4: User Story 2 - Copiar o link quando a cópia automática é bloqueada (Priority: P2)

**Goal**: Se o navegador bloquear a cópia automática, o link fica visível e o botão "Copiar link"
copia de verdade; se até isso falhar, uma mensagem em pt-BR orienta a copiar manualmente.

**Independent Test**: Com a área de transferência bloqueada, criar sala → sem "Link copiado!", link
visível e botão "Copiar link" funcionando (passo 6 do [quickstart.md](quickstart.md)).

### Tests for User Story 2 ⚠️

- [X] T021 [P] [US2] Em `tests/unit/copiar.test.js`, adicionar testes para `copiarLink(link, { clipboard })`: `writeText` com sucesso → `true` e recebeu o link; `writeText` rejeita → `false`; `clipboard` indefinido → `false`

### Implementation for User Story 2

- [X] T022 [US2] Em `public/js/copiar.js`, adicionar `copiarLink(link, { clipboard = navigator.clipboard } = {})` que chama `clipboard.writeText(link)` e devolve `Promise<boolean>` (nunca rejeita). Fazer T021 passar
- [X] T023 [US2] Em `public/js/app.js`, quando `copiarAoCriar` resolver `false`: não mostrar confirmação; dar destaque visual ao botão `TEXTOS.copiarLink` da tela da sala (classe CSS `destaque` em `public/estilos.css`). No clique de "Copiar link": `copiarLink(link)` → `true` mostra `TEXTOS.linkCopiado` por ~2,5 s; `false` mostra `TEXTOS.erroCopiar` e seleciona o texto do `<input>` do link (`input.select()`)

**Checkpoint**: Histórias 1 e 2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Copiar o link de novo a qualquer momento dentro da sala (Priority: P3)

**Goal**: O botão "Copiar link" está sempre visível na sala (sem menus nem rolagem) e pode ser usado
quantas vezes a pessoa quiser.

**Independent Test**: Entrar numa sala (criando ou recarregando), clicar em "Copiar link" duas vezes
→ "Link copiado!" aparece nas duas (passo 2 do [quickstart.md](quickstart.md)).

### Implementation for User Story 3

- [X] T024 [US3] Em `public/js/app.js` e `public/estilos.css`, garantir que o botão `TEXTOS.copiarLink` e o link são renderizados sempre na tela da sala — após criar (com ou sem cópia automática) e após recarregar —, posicionados no topo da tela, visíveis sem rolagem em janela de 1280×720
- [X] T025 [US3] Em `public/js/app.js`, garantir que cliques repetidos em "Copiar link" reiniciam a confirmação: cancelar o temporizador anterior de ~2,5 s antes de mostrar `TEXTOS.linkCopiado` de novo, para que a mensagem não desapareça antes do tempo

**Checkpoint**: Todas as histórias funcionam de forma independente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T026 [P] Criar `README.md` na raiz em pt-BR com: o que é o app, pré-requisitos (Node.js 22), `npm install`, `npm start`, `npm test`, `npm run format`
- [X] T027 [P] Revisar `public/` e `src/` garantindo que nenhum texto visível ao usuário está fora de `public/js/textos.js` e que nenhuma resposta do servidor inclui stack trace (Princípios IV e V)
- [X] T028 Rodar `npm run format` e depois `npm run format:check` e `npm test`, corrigindo o que falhar
- [ ] T029 Executar o roteiro manual completo do [quickstart.md](quickstart.md) (passos 1–8) em Chrome e em mais um navegador (Firefox ou Safari) e registrar o resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências
- **Foundational (Phase 2)**: depende do Setup; bloqueia todas as histórias
- **US1 (Phase 3)**: depende da Foundational
- **US2 (Phase 4)**: depende da tela da sala de US1 (T020) e de `copiar.js` (T017)
- **US3 (Phase 5)**: depende da tela da sala de US1 (T020) e de `copiarLink` (T022)
- **Polish (Phase 6)**: depende de todas as histórias

### Within User Story 1

- T009–T012 (testes) antes de T013–T016
- T013 → T014 → T015 → T016 (servidor depende do registro, que depende dos ids)
- T017/T018 independentes do servidor
- T019 depende de T004, T005, T015, T017; T020 depende de T016 e T019

### Parallel Opportunities

- Setup: T002 e T003 em paralelo, após T001
- Foundational: T004 e T005 em paralelo com T006
- US1: T009, T010, T011, T012 e T018 em paralelo; T013 e T017 em paralelo
- Polish: T026 e T027 em paralelo

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "tests/unit/ids.test.js"            # T009
Task: "tests/unit/salas.test.js"          # T010
Task: "tests/integration/api-salas.test.js"   # T011
Task: "tests/integration/websocket.test.js"   # T012
Task: "tests/unit/copiar.test.js"         # T018

# Módulos independentes juntos:
Task: "src/ids.js"                        # T013
Task: "public/js/copiar.js"               # T017
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: User Story 1
4. **PARAR e VALIDAR**: `npm test` + passos 1, 3, 4, 5, 7, 8 do quickstart

### Incremental Delivery

1. Setup + Foundational → servidor no ar
2. US1 → criar sala, anfitrião, cópia automática (MVP)
3. US2 → funciona em navegadores que bloqueiam a cópia
4. US3 → cópia sempre disponível e repetível
5. Polish → README, formatação, roteiro manual completo

## Notes

- [P] = arquivos diferentes, sem dependência de tarefas incompletas
- Verificar que os testes falham antes de implementar
- Fazer commit após cada tarefa ou grupo lógico
