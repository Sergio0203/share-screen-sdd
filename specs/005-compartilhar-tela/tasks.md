---

description: "Task list for T05 · Compartilhar a tela"
---

# Tasks: T05 · Compartilhar a tela

**Input**: Design documents from `/specs/005-compartilhar-tela/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro. Captura de tela, WebRTC e tela cheia reais são validados pelo
roteiro manual do [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md).

**Regras gerais**: estender o código existente (não reescrever do zero). Todo texto visível vem de
`public/js/textos.js` com os textos exatos de [contracts/ui.md](contracts/ui.md). Protocolo em
[contracts/websocket.md](contracts/websocket.md); estado e regras em [data-model.md](data-model.md);
decisões em [research.md](research.md). Testes de integração usam os auxiliares de
`tests/integration/websocket.test.js` (`entrarNaSala`, `salaComAnaEBruno`, `esperarLista`, `daAna`).
Após cada fase, `npm test` deve passar. Reinicie o servidor antes de qualquer teste manual.

### API do registro de salas (`src/salas.js`) — acréscimos

```text
definirTela(id, conexao, { compartilhando, som })  → void; regras em data-model.md ("definirTela")
definirAssistindo(id, conexao, idPublico | null)    → void; aoMudar(id) só se mudou
listar(id) → [{ id, nome, anfitriao, microfone, camera, tela: null | { inicio, som }, assistindo }]
entrar(...) na substituição → também tela = null e assistindo = null
```

### API do módulo de mídia (`public/js/midia.js`) — acréscimos

```text
criarMidia({ ..., aoTelaEncerrada() })        // novo callback: parou pelo navegador ou app fechado
  compartilharTela()      → Promise<{ som: boolean }>; rejeita com o erro do navegador
  pararCompartilhamento() → void
  telaDe(idPublico)       → { video: <video> | null } recebido daquela pessoa no canal da tela
  atualizarParticipantes(lista, idVoce)  → além da T04: envia a tela só para quem tem assistindo === idVoce
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 134 testes da T01–T04 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Textos e os quatro canais por conexão — usados por todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Acrescentar a `public/js/textos.js` os textos de [contracts/ui.md](contracts/ui.md): `compartilharTela: "Compartilhar tela"`, `escolhendoCompartilhamento: "Escolhendo o que compartilhar…"`, `pararCompartilhamento: "Parar de compartilhar"`, `vocEstaCompartilhando: "Você está compartilhando sua tela"`, `semSuporteCompartilhar: "Seu navegador não permite compartilhar a tela. Para compartilhar, use um computador com Chrome, Edge ou Firefox. Você continua podendo assistir."`, `telaCheia: "Tela cheia"`, `marcaSemSom: " · sem som"`, `verTelaDe: (nome) => \`Ver a tela de ${nome}\``, `naoFoiPossivelMostrarTela: (nome) => \`Não foi possível mostrar a tela de ${nome}. Verifique sua conexão.\``, `erroPermissaoTela: "Não conseguimos compartilhar sua tela. Verifique se o navegador tem permissão para gravar a tela nas configurações do computador e tente de novo."`, `erroCompartilhar: "Não foi possível compartilhar sua tela. Tente de novo."`; citar `specs/005-compartilhar-tela/contracts/ui.md` no comentário do topo
- [X] T003 Em `public/js/midia.js`, trocar os canais "por tipo" por canais **por posição** ([research.md](research.md) §1): constante `CANAIS = ["microfone", "camera", "telaVideo", "telaAudio"]` com o tipo de cada um (`audio`, `video`, `video`, `audio`); `transceptorDe(conexaoRtc, canal)` = `getTransceivers()[CANAIS.indexOf(canal)] ?? null`; `trocarTrilha(par, canal, trilha)` e `trocarTrilhaEmTodos(canal, trilha)` por canal (microfone e câmera passam a usar `"microfone"`/`"camera"`); o iniciador cria os quatro transceptores nessa ordem, todos `sendrecv`; o respondedor percorre os quatro canais após a oferta; `trilhaAtual(canal)` devolve microfone/câmera e, para os canais da tela, `null` (preenchido na US1); no evento `track`, descobrir o canal pela posição de `evento.transceiver` em `getTransceivers()`: `microfone` → `<audio>` da T03, `camera` → `par.video` da T04, `telaVideo` → `par.tela.video` (novo `<video autoplay muted playsinline>`), `telaAudio` → `par.tela.audio` (novo `<audio autoplay hidden>` anexado ao `document.body`, com o mesmo tratamento de som bloqueado de `tocar`); `fecharPar` limpa e remove os elementos da tela; exportar `telaDe(id)`; remover `TIPOS`. Atualizar o comentário do topo. `npm test` passa; voz e câmera continuam funcionando (passos 2–3 dos quickstarts da T03 e T04)

**Checkpoint**: `npm test` passa; voz e câmera sem regressão.

---

## Phase 3: User Story 1 - Compartilhar a tela e os outros assistirem (Priority: P1) 🎯 MVP

**Goal**: Clicar em "Compartilhar tela", escolher tela inteira ou janela; os outros veem em destaque
em ≤ 5 s (com som quando possível); parar pelo app ou pelo navegador faz sumir em ≤ 3 s; quem chega
depois já vê.

**Independent Test**: Passos 1, 2, 3, 4, 6 e 13 do [quickstart.md](quickstart.md).

### Tests for User Story 1 ⚠️

- [X] T004 [P] [US1] Acrescentar a `tests/unit/salas.test.js`: após `entrar`, `listar` traz `tela: null` e `assistindo: null`; `definirTela(id, c, { compartilhando: true, som: true })` → `tela: { inicio: 1, som: true }` e `aoMudar`; outro participante compartilhando depois → `inicio: 2`; repetir `compartilhando: true` com o mesmo `som` → não muda `inicio` nem chama `aoMudar`; com `som` diferente → só atualiza `som`; parar e começar de novo → `inicio` novo maior; `compartilhando: false` → `tela: null`; `definirAssistindo(id, c, "x")` → `assistindo: "x"` e `aoMudar`; repetir → sem `aoMudar`; `null` → `assistindo: null`; conexão desconhecida/substituída ignorada nos dois; substituição (mesma chave) → `tela: null`, `assistindo: null`; atualizar os `deepEqual` de `listar` e o teste de chaves públicas (`["anfitriao", "assistindo", "camera", "id", "microfone", "nome", "tela"]`)
- [X] T005 [P] [US1] Acrescentar a `tests/integration/websocket.test.js`: Ana envia `{ tipo: "tela", compartilhando: true, som: false }` → Ana e Bruno recebem lista com Ana `tela: { inicio: <n>, som: false }`; Bruno compartilha depois → `inicio` dele maior que o da Ana; Bruno envia `{ tipo: "assistindo", id: <voce da Ana> }` → lista com Bruno `assistindo` = id da Ana; Carla entra depois e recebe os dois estados; Ana envia `compartilhando: false` → `tela: null` para todos; reconectar com a mesma chave → `tela: null` e `assistindo: null`; `mensagem-invalida` para: `tela`/`assistindo` antes de `entrar`, `compartilhando` não booleano, `compartilhando: true` com `som` ausente ou não booleano, `assistindo` com `id` número, objeto ou ausente (`undefined`); `assistindo { id: null }` é válido; atualizar os `deepEqual` de `participantes` existentes para incluir `tela: null, assistindo: null`
- [X] T006 [P] [US1] Criar `tests/unit/destaque.test.js` para `escolherDestaque(lista, idVoce, escolha)` ([data-model.md](data-model.md)): sem ninguém compartilhando → `{ destaque: null, miniaturas: [] }`; a própria pessoa compartilhando sozinha → `destaque: null` (FR-004); um compartilhamento de outra pessoa → destaque com `{ id, nome, som, inicio }`; dois → destaque = maior `inicio`, o outro em `miniaturas`

### Implementation for User Story 1

- [X] T007 [US1] Em `src/salas.js`: `contadorCompartilhamentos: 0` na sala; `tela: null` e `assistindo: null` ao criar participante e na substituição; `definirTela` e `definirAssistindo` exatamente como em [data-model.md](data-model.md) (reutilizar `participantePorConexao`; `aoMudar` só quando algo muda); `listar` inclui `tela` (cópia `{ inicio, som }` ou `null`) e `assistindo`; exportar no objeto devolvido. Fazer T004 passar
- [X] T008 [US1] Em `src/servidor.js`, despachar `tela` e `assistindo` (só depois de entrar): `tratarTela` valida `typeof compartilhando === "boolean"` e, se `true`, `typeof som === "boolean"` (senão `mensagem-invalida`) e chama `registro.definirTela`; `tratarAssistindo` valida `id === null || typeof id === "string"` e chama `registro.definirAssistindo`. Fazer T005 passar
- [X] T009 [P] [US1] Criar `public/js/destaque.js` (módulo ES puro) exportando `escolherDestaque(lista, idVoce, escolha)` conforme [data-model.md](data-model.md) (itens `{ id, nome, som, inicio }`; exclui `idVoce`; `escolha` válida tem prioridade; senão maior `inicio`; miniaturas por `inicio` decrescente). Fazer T006 passar
- [X] T010 [US1] Em `public/js/midia.js`, adicionar o compartilhamento ([research.md](research.md) §2, §5): `compartilharTela()` chama `navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 } }, audio: { restrictOwnAudio: true }, selfBrowserSurface: "exclude", systemAudio: "include" })`, guarda `trilhaTela` (com `contentHint = "motion"`) e `trilhaSomTela` (ou `null`), registra `ended` na trilha de vídeo que (se ainda for a atual) faz o mesmo que `pararCompartilhamento` e chama `aoTelaEncerrada()`, aplica o envio e devolve `{ som: trilhaSomTela !== null }`; se `encerrar` aconteceu durante a escolha, parar as trilhas; `pararCompartilhamento()` para as duas trilhas e faz `replaceTrack(null)` nos canais da tela de todos os pares; guardar a última `lista`/`idVoce` em `atualizarParticipantes` e, ali e ao começar/parar, aplicar a regra de envio: para cada par, canais `telaVideo`/`telaAudio` recebem as trilhas da tela se eu compartilho **e** o item da lista desse par tem `assistindo === idVoce`, senão `null` (só chamar `replaceTrack` quando o valor mudar para aquele par); `trilhaAtual` dos canais da tela segue a mesma regra para pares novos; `encerrar()` também para o compartilhamento
- [X] T011 [US1] Criar `public/js/area-tela.js` exportando `criarAreaTela({ aoEscolher })` → `{ elemento, atualizar({ destaque, miniaturas, compartilhando }, { telaDe, idsComFalha }) }` ([research.md](research.md) §7): `elemento` é uma `<section id="area-tela">`; com `destaque`, mostra um contêiner `.destaque` com o `<video>` de `telaDe(destaque.id).video` (reaproveitado, não recriado) ou, se o id estiver em `idsComFalha` ou não houver vídeo, um `<p class="falha-video">` com `TEXTOS.naoFoiPossivelMostrarTela(nome)` (só quando falhou); legenda `<p class="legenda-tela">` com o nome (+ `TEXTOS.marcaSemSom` se `som` for falso); oculta a área quando não há destaque nem `compartilhando`; com `compartilhando: true`, mostra `<p class="aviso-compartilhando">` com `TEXTOS.vocEstaCompartilhando`. (Miniaturas e tela cheia na US2.)
- [X] T012 [US1] Em `public/js/app.js`: criar o botão de compartilhar na `linha-link`, depois do da câmera (`TEXTOS.compartilharTela`; durante a escolha, desabilitado com `TEXTOS.escolhendoCompartilhamento`; compartilhando, `TEXTOS.pararCompartilhamento` com `aria-pressed="true"`); ao começar com sucesso, enviar `{ tipo: "tela", compartilhando: true, som }` e limpar a própria mensagem de erro; ao parar (botão ou `aoTelaEncerrada`), `midia.pararCompartilhamento()` antes de enviar `{ tipo: "tela", compartilhando: false }`; erro ao começar → por enquanto `TEXTOS.erroCompartilhar` (refinado na US3). Inserir `areaTela.elemento` em `mostrarNaSala` **antes** de `areaVideos` (FR-006). A cada lista: depois de `midia.atualizarParticipantes`, calcular `escolherDestaque(lista, idVoce, escolha)` (por ora `escolha = null`), chamar `areaTela.atualizar(...)` com `telaDe: midia.telaDe` e `idsComFalha: paresSemConexao`, e enviar `{ tipo: "assistindo", id: destaque?.id ?? null }` **só quando** for diferente do último enviado; re-renderizar também ao começar/parar de compartilhar e quando chegar vídeo de tela (estender `aoChegarVideo` para os canais da tela)
- [X] T013 [P] [US1] Em `public/estilos.css`: `.compartilhar[aria-pressed="true"]` com o mesmo destaque verde dos outros botões; `#area-tela` com `width: 100%`, `display: flex; flex-direction: column; gap: 0.5rem`; `#area-tela[hidden] { display: none }`; `.destaque` com `position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 0.5rem; overflow: hidden`; `.destaque video` com `width: 100%; height: 100%; object-fit: contain`; `.legenda-tela` sobreposta embaixo à esquerda (fundo escuro translúcido, texto branco, reticências); `.aviso-compartilhando` em verde

**Checkpoint**: `npm test` passa; passos 1, 2, 3, 4, 6 e 13 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 4: User Story 2 - Assistir em destaque, escolher entre compartilhamentos e tela cheia (Priority: P2)

**Goal**: Tela cheia com Esc; vários compartilhamentos com miniaturas só com nome; clique troca o
destaque em ≤ 2 s; a escolha é mantida; som só do destaque; marca "sem som".

**Independent Test**: Passos 5, 7 e 8 do [quickstart.md](quickstart.md).

### Tests for User Story 2 ⚠️

- [X] T014 [P] [US2] Acrescentar a `tests/unit/destaque.test.js`: `escolha` que ainda compartilha → é o destaque mesmo não sendo o mais recente, e o mais recente vai para as miniaturas; `escolha` que parou de compartilhar → destaque volta ao maior `inicio`; `escolha` igual a `idVoce` → ignorada; três compartilhamentos → miniaturas em `inicio` decrescente sem o destaque; itens preservam `som`

### Implementation for User Story 2

- [X] T015 [US2] Em `public/js/area-tela.js`, acrescentar as miniaturas: abaixo do destaque, `<div class="miniaturas">` com um `<button class="miniatura">` por item, texto `🖥️ <nome>` (+ `TEXTOS.marcaSemSom` se sem som), `title` e `aria-label` = `TEXTOS.verTelaDe(nome)`, clique → `aoEscolher(id)`; sem imagem (FR-017)
- [X] T016 [US2] Em `public/js/area-tela.js`, acrescentar a tela cheia: botão `TEXTOS.telaCheia` no contêiner `.destaque`, só se `document.fullscreenEnabled`, que chama `contêiner.requestFullscreen()`; esconder o botão enquanto `document.fullscreenElement === contêiner`; ao `atualizar` sem destaque (ou com outro id) enquanto o contêiner está em tela cheia, chamar `document.exitFullscreen()` (FR-008); ouvir `fullscreenchange` para mostrar o botão de novo ao sair (Esc ou outro meio)
- [X] T017 [US2] Em `public/js/app.js`, guardar `escolha` (começa `null`): `aoEscolher(id)` define `escolha = id` e re-renderiza (o que envia o novo `assistindo`); a cada lista, se `escolha` não está mais compartilhando, voltar `escolha = null` (FR-018). Conferir que, como só o destaque é enviado a cada pessoa, só o som dele toca (FR-019)
- [X] T018 [P] [US2] Em `public/estilos.css`: `.miniaturas` em linha com quebra (`display: flex; flex-wrap: wrap; gap: 0.5rem`); `.miniatura` como botão compacto; botão de tela cheia sobreposto no canto superior direito do `.destaque`; `.destaque:fullscreen` com `border-radius: 0` e fundo preto, vídeo ocupando tudo com `object-fit: contain`

**Checkpoint**: `npm test` passa; passos 5, 7 e 8 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 5: User Story 3 - Compartilhamento indisponível ou negado (Priority: P3)

**Goal**: Celular/navegador sem suporte mostra explicação e o botão indisponível; permissão negada
pelo sistema mostra instrução; cancelar não mostra nada; a pessoa continua assistindo.

**Independent Test**: Passos 4, 10 e 11 do [quickstart.md](quickstart.md).

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] Acrescentar a `tests/unit/midia-regras.test.js` testes de `classificarErroCompartilhamento(nome, mensagem)`: `("NotAllowedError", "Permission denied by system")` → `"permissao"`; `("NotAllowedError", "Permission denied")` → `"cancelado"`; `("AbortError", "")` → `"cancelado"`; `("NotFoundError", "")`, `("NotReadableError", "")`, `("TypeError", "")`, `(undefined, undefined)` → `"falha"`

### Implementation for User Story 3

- [X] T020 [US3] Em `public/js/midia-regras.js`, exportar `classificarErroCompartilhamento(nome, mensagem)` conforme [research.md](research.md) §6 (`/system/i` na mensagem de um `NotAllowedError` → `"permissao"`). Fazer T019 passar
- [X] T021 [US3] Em `public/js/app.js`: se `typeof navigator.mediaDevices?.getDisplayMedia !== "function"`, criar o botão de compartilhar desabilitado e, logo após a `linha-link`, um `<p class="sem-suporte">` com `TEXTOS.semSuporteCompartilhar` (FR-010); no erro de `compartilharTela`, `classificarErroCompartilhamento(erro?.name, erro?.message)` → `"cancelado"`: nenhuma mensagem; `"permissao"`: `TEXTOS.erroPermissaoTela`; `"falha"`: `TEXTOS.erroCompartilhar`; nada é enviado ao servidor, o botão volta a `Compartilhar tela` e voz, câmeras e compartilhamentos dos outros continuam (FR-011, FR-012)

**Checkpoint**: `npm test` passa; passos 4, 10 e 11 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 [P] Atualizar `README.md`: o compartilhamento de tela (tela inteira ou janela, com som quando o navegador permitir, vários ao mesmo tempo, tela cheia) e que compartilhar exige Chrome, Edge ou Firefox de computador
- [X] T023 [P] Revisar `public/` e `src/` para garantir que não restam usos de `TIPOS` ou de `transceptorDe` com `"audio"`/`"video"`; que todo texto visível vem de `public/js/textos.js`; que não há `console.log` de depuração nos módulos do navegador; e que nenhum erro técnico chega à interface
- [X] T024 Rodar `npm run format`, `npm run format:check` e `npm test`, corrigindo o que falhar
- [ ] T025 Reiniciar o servidor e executar os passos 1–13 do [quickstart.md](quickstart.md) (perfis diferentes, app com som, macOS, celular) e registrar o resultado, em especial o passo 9 (eco)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **Polish (6)**
- US2 e US3 dependem do botão, da área da tela e do envio da US1; como as três alteram
  `public/js/app.js`, `public/js/area-tela.js` e `public/js/midia.js`, fazê-las em sequência
- T003 (canais por posição) antes de qualquer outra mudança em `midia.js`

### Within Each Phase

- Testes ([P]) antes da implementação; implementação na ordem numérica (mesmos arquivos)
- T007 → T008; T009 independente; T010 → T011 → T012
- T015 → T016 → T017; T020 → T021

### Parallel Opportunities

- Phase 2: T002 em paralelo com T003
- US1: T004, T005 e T006 em paralelo; T009 e T013 em paralelo com T007–T008
- US2: T014 e T018 em paralelo com T015–T017
- US3: T019 em paralelo com qualquer tarefa que não mexa em `tests/unit/midia-regras.test.js`
- Polish: T022 e T023

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "tests/unit/salas.test.js"             # T004
Task: "tests/integration/websocket.test.js"  # T005
Task: "tests/unit/destaque.test.js"          # T006

# Independentes do servidor:
Task: "public/js/destaque.js"                # T009
Task: "public/estilos.css"                   # T013
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2 → 2. Phase 3 (US1) → 3. **Validar**: `npm test` + passos 1, 2, 3, 4, 6 e 13 do quickstart

### Incremental Delivery

1. US1 → os amigos assistem à tela de um deles (MVP — a funcionalidade principal)
2. US2 → tela cheia e vários compartilhamentos com escolha de destaque
3. US3 → celular e permissão negada têm explicação clara
4. Polish → revisão, formatação, roteiro completo

## Notes

- Esta tarefa altera código da T04 (canais por posição); os testes da T04 são atualizados em T004
  e T005, não descartados
- Fazer commit após cada fase
