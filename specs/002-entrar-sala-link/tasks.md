---

description: "Task list for T02 · Entrar na sala pelo link"
---

# Tasks: T02 · Entrar na sala pelo link

**Input**: Design documents from `/specs/002-entrar-sala-link/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único da T01: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md).

**Regras gerais**: estender o código existente da T01 (não reescrever do zero). Todo texto visível
vem de `public/js/textos.js` com os textos exatos de [contracts/ui.md](contracts/ui.md). Protocolo
em [contracts/websocket.md](contracts/websocket.md) e [contracts/http.md](contracts/http.md); regras
de entrada e do anfitrião em [data-model.md](data-model.md). Após cada fase, `npm test` deve passar.

### API do registro de salas (`src/salas.js`) ao fim desta tarefa

Usada por várias tarefas; implementar exatamente com estes nomes:

```text
criarRegistroSalas({ toleranciaMs = 60_000, esperaAnfitriaoMs = 10_000, capacidade = 6,
                     agendar, cancelar, aoMudar = () => {} })
  criar()                              → { id, chave }
  consultar(id)                        → null | { cheia: boolean }
  entrar(id, { chave, nome, conexao }) → { erro: "sala-inexistente" | "nome-invalido" | "sala-cheia" }
                                         | { participante: { id, chave }, conexaoSubstituida: conexao | null }
  sair(id, conexao)                    → void (ignora se `conexao` não é a conexão atual do participante)
  listar(id)                           → [{ id, nome, anfitriao }] em ordem de entrada
  conexoes(id)                         → [conexao] dos participantes presentes
aoMudar(idSala) é chamado após toda entrada, saída e transferência de anfitrião.
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 40 testes da T01 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Textos e validação de nome usados por todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Atualizar `public/js/textos.js` com todos os textos **(T02)** de [contracts/ui.md](contracts/ui.md): `seuNome: "Seu nome"`, `nomeVazio: "Digite seu nome para continuar."`, `nomeLongo: "O nome pode ter no máximo 30 caracteres."`, `tituloEntrar: "Entrar na sala"`, `entrarNaSala: "Entrar na sala"`, `tituloLista` como função `(n) => \`Na sala (${n} de 6)\``, `marcaVoce: " (você)"`, `marcaAnfitriao: " · anfitrião"`, `salaInexistente: "Esta sala não existe ou já foi encerrada."` (substitui o texto da T01), `salaCheiaTitulo: "Sala cheia"`, `salaCheiaTexto: "Esta sala já tem 6 pessoas. Tente de novo quando alguém sair."`, `tentarDeNovo: "Tentar de novo"`, `abertaEmOutraAba: "Esta sala foi aberta em outra aba."`, `erroVerificarSala: "Não foi possível abrir a sala. Verifique sua conexão e tente novamente."`
- [X] T003 [P] Criar `tests/unit/nome.test.js` para `normalizarNome(texto)` e `motivoNomeInvalido(texto)`: `"  Ana  "` → `"Ana"`; `""`, `"   "`, `undefined`, `123` → `null` com motivo `"vazio"`; 30 caracteres → aceito; 31 → `null` com motivo `"longo"`; 30 emojis (`"😀".repeat(30)`) → aceito (conta caracteres reais, não unidades UTF-16); nome válido → motivo `null`
- [X] T004 Criar `public/js/nome.js` (módulo ES puro, sem DOM) exportando `NOME_MAXIMO = 30`, `normalizarNome(texto)` (string sem espaços nas pontas com 1–30 caracteres contados por `[...texto].length`, senão `null`; não-string → `null`) e `motivoNomeInvalido(texto)` (`null` | `"vazio"` | `"longo"`). Fazer T003 passar

**Checkpoint**: `npm test` passa (T01 + nome).

---

## Phase 3: User Story 1 - Entrar na sala com um nome e ver quem está lá (Priority: P1) 🎯 MVP

**Goal**: Quem abre o link informa um nome, entra e vê a lista de participantes, atualizada para
todos em até 3 s. O criador informa o nome na página inicial. Recarregar volta direto para a sala.

**Independent Test**: Criar sala como "Ana", abrir o link em janela anônima, entrar como "Bruno" →
as duas janelas mostram os dois nomes; fechar a do Bruno → some da lista da Ana em até 3 s.

### Tests for User Story 1 ⚠️

- [X] T005 [P] [US1] Reescrever `tests/unit/salas.test.js` para a nova API (ver "API do registro" acima), mantendo o relógio falso da T01 e cobrindo: `criar()` devolve `{ id, chave }` e a sala existe; sala criada sem ninguém expira após 60 s; `entrar` com a `chave` do `criar()` → participante é anfitrião em `listar`; `entrar` sem chave → recebe chave nova de 22 caracteres e não é anfitrião; `entrar` com nome inválido → `{ erro: "nome-invalido" }`; id inexistente → `{ erro: "sala-inexistente" }`; `listar` em ordem de entrada com `{ id, nome, anfitriao }` e sem campo `chave`; entrar cancela a expiração; última saída agenda expiração de 60 s; `sair` de uma conexão já substituída não remove o participante; `entrar` com chave já presente → `conexaoSubstituida` é a conexão antiga, a lista não duplica e o nome é atualizado; `aoMudar(id)` é chamado após `entrar` e após `sair`
- [X] T006 [P] [US1] Atualizar `tests/integration/api-salas.test.js`: `POST /api/salas` devolve `{ id, link, chave }` (sem `tokenAnfitriao`), `chave` com 22 caracteres base64url
- [X] T007 [P] [US1] Reescrever `tests/integration/websocket.test.js` para o protocolo T02 (manter os auxiliares `conectar`/`proximaMensagem` e o servidor com `toleranciaMs` pequeno; adicionar `intervaloPingMs: 50`): `entrar` com `nome` e a chave do POST → recebe `entrou` com `chave` e `voce`, seguido de `participantes` com o próprio item `anfitriao: true`; segundo cliente entra sem chave → os **dois** recebem `participantes` com 2 itens em ordem de entrada; segundo fecha → o primeiro recebe `participantes` com 1 item; `entrar` sem `nome` → `erro` `nome-invalido` e fecha; sala inexistente, JSON inválido, `tipo` desconhecido e `entrar` repetido continuam com os códigos da T01; mesma chave conectando de novo → conexão antiga recebe `erro` `aberta-em-outra-aba` e é fechada, a nova recebe `entrou`, e a lista continua com 1 item; expiração da sala após a tolerância continua funcionando
- [X] T008 [P] [US1] Adicionar em `tests/integration/websocket.test.js` um teste de queda silenciosa: cliente A e B na sala; pausar o socket de B sem fechar (`ws._socket.pause()` e remover o auto-pong com `ws.pong = () => {}` antes de entrar, ou usar a opção `autoPong: false` do cliente `ws`) → A recebe `participantes` sem B em menos de 500 ms (com `intervaloPingMs: 50`)
- [X] T009 [P] [US1] Criar `tests/unit/participantes.test.js` para `rotularParticipantes(lista, idVoce)` de `public/js/participantes.js`: devolve `[{ id, texto, ehVoce, ehAnfitriao }]` na mesma ordem; texto = nome + `TEXTOS.marcaVoce` se for você + `TEXTOS.marcaAnfitriao` se for anfitrião (ex.: `"Ana (você) · anfitrião"`, `"Bruno"`); e `souAnfitriao(lista, idVoce)` → booleano

### Implementation for User Story 1

- [X] T010 [US1] Reescrever `src/salas.js` conforme a API acima e [data-model.md](data-model.md), sem capacidade nem transferência ainda (vêm na US3 e na Phase 6): sala `{ id, chaveAnfitriao, criadaEm, participantes: Map<chave, { id, chave, nome, entradaEm, conexao }>, expiracao }`; `criar()` gera `id` e `chaveAnfitriao` com `gerarSegredo` e devolve `{ id, chave: chaveAnfitriao }`; `entrar` segue a ordem "Regras de entrada" do data-model (passos 1, 2, 3 e 5), usando `normalizarNome` de `../public/js/nome.js` e aceitando a chave enviada só se `idValido(chave)`, senão gerando uma nova; ao substituir, troca a `conexao` e o `nome` mantendo `id`, `entradaEm` e a posição; `sair` remove só se `participante.conexao === conexao`; `listar` calcula `anfitriao` com `segredosIguais(chave, sala.chaveAnfitriao)`; chamar `aoMudar(id)` ao fim de `entrar` e `sair`. Fazer T005 passar
- [X] T011 [US1] Em `src/servidor.js`: `POST /api/salas` responde `{ id, link, chave }`; criar o registro com `aoMudar: (idSala) => enviarParaSala(idSala, { tipo: "participantes", lista: registro.listar(idSala) })`, onde `enviarParaSala` envia JSON a cada conexão de `registro.conexoes(idSala)` que esteja aberta; reescrever `atenderConexao` para o protocolo de [contracts/websocket.md](contracts/websocket.md): no `entrar`, chamar `registro.entrar(idSala, { chave, nome, conexao })`; em erro, enviar `{ tipo: "erro", codigo }` e fechar; em sucesso, se houver `conexaoSubstituida`, enviar a ela `erro` `aberta-em-outra-aba` e fechá-la; enviar `entrou` `{ idSala, chave, voce: participante.id }` **antes** de `aoMudar` disparar a lista (garantir a ordem `entrou` → `participantes`, ex.: enviar `entrou` e depois chamar `enviarParaSala`, ou fazer `registro.entrar` não chamar `aoMudar` e o servidor chamar o envio). Fazer T006 e T007 passar
- [X] T012 [US1] Em `src/servidor.js`, adicionar *heartbeat*: opção `intervaloPingMs = 1000` em `criarServidor`; `setInterval` que, para cada cliente do `WebSocketServer`, chama `terminate()` se `conexao.vivo === false`, senão marca `vivo = false` e chama `ping()`; `vivo = true` na conexão e em cada `pong`; `clearInterval` no `close` do servidor; o intervalo não deve segurar o processo (`unref()`). Fazer T008 passar
- [X] T013 [P] [US1] Criar `public/js/participantes.js` com `rotularParticipantes(lista, idVoce)` e `souAnfitriao(lista, idVoce)` usando `TEXTOS` de `./textos.js`. Fazer T009 passar
- [X] T014 [US1] Em `public/js/app.js`, **página inicial**: adicionar acima do botão um `<label>` `TEXTOS.seuNome` com `<input id="campo-nome" maxlength="30" autocomplete="nickname">` preenchido com `localStorage["nomeExibicao"]`; no clique de "Criar sala", validar **sincronamente** com `motivoNomeInvalido` antes de qualquer `fetch` (se inválido: mostrar `TEXTOS.nomeVazio` ou `TEXTOS.nomeLongo`, focar o campo e não criar a sala); se válido, salvar `localStorage["nomeExibicao"] = normalizarNome(...)` e seguir o fluxo da T01 sem atrasar `copiarAoCriar` (continua no mesmo tique do clique); ao receber a sala, salvar `localStorage["sala:<id>"] = chave` (no lugar de `anfitriao:<id>`). Enter no campo aciona o mesmo clique
- [X] T015 [US1] Em `public/js/app.js`, **rota `/sala/<id>`**: se existir `localStorage["sala:<id>"]` **e** `localStorage["nomeExibicao"]`, entrar direto (FR-007); senão, mostrar a **tela de nome** (`TEXTOS.tituloEntrar`, `<label>`+campo `maxlength="30"` preenchido com `nomeExibicao` e com foco, botão `TEXTOS.entrarNaSala`, Enter confirma), validando com `motivoNomeInvalido` e mostrando `TEXTOS.nomeVazio`/`TEXTOS.nomeLongo`; ao confirmar, salvar `nomeExibicao` e entrar. "Entrar" = abrir o WebSocket e enviar `{ tipo: "entrar", idSala, nome, chave }` (chave de `sala:<id>` se existir); ao receber `entrou`, salvar `localStorage["sala:<id>"] = chave` e guardar `voce`
- [X] T016 [US1] Em `public/js/app.js`, **tela da sala**: manter título, link e botão "Copiar link" da T01 no topo; abaixo, `<h2>` `TEXTOS.tituloLista(n)` e `<ul id="lista-participantes">` renderizados a cada mensagem `participantes` com `rotularParticipantes(lista, voce)`; mostrar `TEXTOS.voceEAnfitriao` quando `souAnfitriao(lista, voce)` (substitui o uso de `anfitriao` do `entrou` da T01); tratar `erro` `nome-invalido` voltando à tela de nome com `TEXTOS.nomeVazio`; tratar `erro` `aberta-em-outra-aba` substituindo a tela por `TEXTOS.abertaEmOutraAba` (sem mostrar "conexão perdida"); a mensagem de cópia automática da T01 (`Link copiado!` ou botão em destaque) continua funcionando após criar a sala
- [X] T017 [P] [US1] Em `public/estilos.css`, estilos para o formulário de nome (label + campo + botão em linha, mesma aparência do campo de link) e para a lista de participantes (lista sem marcadores, um nome por linha, `max-width` igual ao `main`)

**Checkpoint**: Passos 1–4, 6 e 7 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 4: User Story 2 - Link de sala que não existe (Priority: P2)

**Goal**: Link inexistente ou expirado mostra mensagem clara e "Criar nova sala", sem pedir nome.

**Independent Test**: Abrir `/sala/AAAAAAAAAAAAAAAAAAAAAA` → mensagem e botão, sem tela de nome;
o botão leva a `/`.

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Em `tests/unit/salas.test.js`, testar `consultar(id)`: inexistente → `null`; sala existente vazia → `{ cheia: false }`; após expirar → `null`
- [X] T019 [P] [US2] Em `tests/integration/api-salas.test.js`, testar `GET /api/salas/<id>`: sala criada → 200 `{ cheia: false }`; id inventado de 22 caracteres e id em formato inválido (`abc`) → 404 `{ "erro": "Sala não encontrada." }`; `POST /api/salas/<id>` → 405

### Implementation for User Story 2

- [X] T020 [US2] Em `src/salas.js`, implementar `consultar(id)` → `null` se não existe, senão `{ cheia: participantes.size >= capacidade }` (com `capacidade` vindo das opções, padrão 6). Fazer T018 passar
- [X] T021 [US2] Em `src/servidor.js`, rota `GET /api/salas/<id>` conforme [contracts/http.md](contracts/http.md): id inválido (`idValido`) ou `consultar` nulo → 404 `{ "erro": "Sala não encontrada." }`; senão 200 `{ cheia }`; outros métodos → 405. A rota `POST /api/salas` continua igual. Fazer T019 passar
- [X] T022 [US2] Em `public/js/app.js`, antes de mostrar a tela de nome (só quando **não** há chave guardada para a sala), chamar `GET /api/salas/<id>`: 404 → tela de sala inexistente (`TEXTOS.salaInexistente` + botão `TEXTOS.criarNovaSala` que leva a `/`); falha de rede/5xx → `TEXTOS.erroVerificarSala` + botão `TEXTOS.tentarDeNovo` que repete a verificação; 200 → tela de nome. Na tela de nome, se o `entrar` receber `erro` `sala-inexistente` (sala expirou enquanto a pessoa digitava), mostrar a mesma tela de sala inexistente

**Checkpoint**: Passo 9 do [quickstart.md](quickstart.md) funciona.

---

## Phase 5: User Story 3 - Limite de 6 pessoas por sala (Priority: P3)

**Goal**: No máximo 6 pessoas; a 7ª vê "Sala cheia" e não entra, inclusive em corrida pela última vaga.

**Independent Test**: Com 6 pessoas, abrir o link num 7º navegador → "Sala cheia" sem tela de nome;
alguém sai → "Tentar de novo" leva à tela de nome.

### Tests for User Story 3 ⚠️

- [X] T023 [P] [US3] Em `tests/unit/salas.test.js`: com 6 participantes, `entrar` de uma 7ª chave → `{ erro: "sala-cheia" }` e `listar` continua com 6; `consultar` → `{ cheia: true }`; um dos 6 reconectando com a própria chave numa sala cheia → aceito (substituição, não conta vaga nova); após uma saída, a 7ª consegue entrar; `capacidade` injetada (ex.: 2) é respeitada
- [X] T024 [P] [US3] Em `tests/integration/websocket.test.js`: 6 clientes entram; o 7º recebe `erro` `sala-cheia` e a conexão é fechada; nenhum dos 6 recebe lista com 7 itens. Corrida: com 5 na sala, abrir 3 conexões e enviar `entrar` nas 3 sem esperar respostas → exatamente 1 recebe `entrou` e 2 recebem `sala-cheia`
- [X] T025 [P] [US3] Em `tests/integration/api-salas.test.js`: com 6 clientes WebSocket na sala, `GET /api/salas/<id>` → 200 `{ cheia: true }`

### Implementation for User Story 3

- [X] T026 [US3] Em `src/salas.js`, aplicar a capacidade no `entrar` exatamente no passo 4 das "Regras de entrada" do [data-model.md](data-model.md): depois de checar substituição (chave já presente) e antes de criar participante novo, se `participantes.size >= capacidade` → `{ erro: "sala-cheia" }`. Fazer T023, T024 e T025 passar (o servidor já repassa o código de erro)
- [X] T027 [US3] Em `public/js/app.js`: quando `GET /api/salas/<id>` devolver `{ cheia: true }` ou o `entrar` receber `erro` `sala-cheia`, mostrar a tela "Sala cheia" (`<h1>` `TEXTOS.salaCheiaTitulo`, parágrafo `TEXTOS.salaCheiaTexto`, botão `TEXTOS.tentarDeNovo` que refaz a verificação da rota `/sala/<id>`), sem mostrar a tela de nome nem "conexão perdida"

**Checkpoint**: Passo 8 do [quickstart.md](quickstart.md) funciona.

---

## Phase 6: User Story 1 (complemento) - Transferência do papel de anfitrião (FR-013 a FR-015)

**Goal**: Se o anfitrião fica 10 s fora com outras pessoas na sala, o papel passa ao participante
mais antigo; quem herda continua anfitrião ao recarregar.

**Independent Test**: Passo 5 do [quickstart.md](quickstart.md).

### Tests ⚠️

- [X] T028 [P] [US1] Em `tests/unit/salas.test.js` (relógio falso): anfitrião A, B e C entram nessa ordem; A sai → agenda transferência de **10 s** (verificar `ms === 10_000`) e `aoMudar` é chamado pela saída; disparar → `listar` mostra B como anfitrião e A ausente, e `aoMudar` é chamado de novo; A volta com a própria chave antes do disparo → transferência cancelada e A continua anfitrião; A volta depois da transferência → entra como não anfitrião; B (herdeiro) sai e volta com a própria chave antes de 10 s → continua anfitrião; anfitrião sozinho sai → **nenhuma** transferência agendada (só a expiração de 60 s); nesse estado, D entra → transferência de 10 s agendada e, ao disparar, D vira anfitrião; nunca há dois `anfitriao: true` em `listar`
- [X] T029 [P] [US1] Em `tests/integration/websocket.test.js`, com `esperaAnfitriaoMs: 100` no servidor: anfitrião e B na sala; anfitrião fecha → em até 500 ms B recebe `participantes` com 1 item `anfitriao: true`; B reconecta com a própria chave → continua `anfitriao: true`

### Implementation

- [X] T030 [US1] Em `src/salas.js`, adicionar `transferencia` (temporizador ou nulo) à sala e a função interna `reavaliarAnfitriao(sala)`, chamada ao fim de `entrar` e `sair`: se o participante com `chaveAnfitriao` está presente → cancelar `transferencia`; se não está e há participantes e não há `transferencia` → agendar `esperaAnfitriaoMs` (padrão 10 000); ao disparar, se o anfitrião continua ausente e há participantes, `sala.chaveAnfitriao = ` chave do primeiro participante do `Map` (o mais antigo), zerar `transferencia` e chamar `aoMudar(id)`; se a sala ficar vazia, cancelar `transferencia`; ao expirar a sala, cancelar também `transferencia`. Fazer T028 e T029 passar (o servidor já envia a lista em `aoMudar`; repassar `esperaAnfitriaoMs` das opções de `criarServidor`)
- [X] T031 [US1] Verificar em `public/js/app.js` que `TEXTOS.voceEAnfitriao` e a marca de anfitrião na lista são recalculados a cada mensagem `participantes` (aparecem para quem herda e somem para quem perde o papel), ajustando se necessário

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T032 [P] Revisar `public/` e `src/` para garantir que não restam usos de `tokenAnfitriao` nem da chave `anfitriao:<id>` do `localStorage`, que todo texto visível vem de `public/js/textos.js` e que nenhuma resposta do servidor expõe chaves de outros participantes ou stack traces
- [X] T033 [P] Atualizar `README.md` com uma linha descrevendo o fluxo atual (criar sala com nome, entrar pelo link, até 6 pessoas)
- [X] T034 Rodar `npm run format`, `npm run format:check` e `npm test`, corrigindo o que falhar
- [X] T035 Executar os passos 1–9 do [quickstart.md](quickstart.md) com várias janelas/perfis do navegador e registrar o resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** e **US3 (5)** → **Transferência (6)** → **Polish (7)**
- US2 e US3 dependem da US1 (novo registro e protocolo); são independentes entre si, mas ambas
  alteram `src/salas.js`, `src/servidor.js` e `public/js/app.js`, então devem ser feitas em sequência
- A Phase 6 depende da US1 e pode vir antes ou depois de US2/US3

### Within Each Phase

- Testes ([P]) antes da implementação; implementação na ordem numérica (mesmos arquivos)
- T011 depende de T010; T012 depende de T011; T014–T016 dependem de T002, T004, T011 e T013

### Parallel Opportunities

- Phase 2: T002 e T003 em paralelo
- US1: T005–T009 em paralelo; T013 e T017 em paralelo com T010–T012
- US2: T018 e T019; US3: T023–T025; Phase 6: T028 e T029
- Polish: T032 e T033

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "tests/unit/salas.test.js"             # T005
Task: "tests/integration/api-salas.test.js"  # T006
Task: "tests/integration/websocket.test.js"  # T007 + T008 (mesmo arquivo: um agente só)
Task: "tests/unit/participantes.test.js"     # T009

# Independentes do servidor:
Task: "public/js/participantes.js"           # T013
Task: "public/estilos.css"                   # T017
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2 → 2. Phase 3 (US1) → 3. **Validar**: `npm test` + passos 1–4, 6, 7 do quickstart

### Incremental Delivery

1. US1 → amigos entram e se veem (MVP)
2. US2 → links quebrados têm saída clara
3. US3 → limite de 6
4. Phase 6 → anfitrião nunca "some"
5. Polish → revisão, formatação, roteiro completo

## Notes

- [P] = arquivos diferentes, sem dependência de tarefas incompletas
- Esta tarefa altera código da T01: os testes da T01 são atualizados nas tarefas T005–T007, não
  descartados
- Fazer commit após cada fase
