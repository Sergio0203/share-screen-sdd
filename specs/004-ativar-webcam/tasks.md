---

description: "Task list for T04 · Ativar a webcam"
---

# Tasks: T04 · Ativar a webcam

**Input**: Design documents from `/specs/004-ativar-webcam/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro. Câmera e WebRTC reais são validados pelo roteiro manual do
[quickstart.md](quickstart.md).

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
decisões em [research.md](research.md). Testes de integração usam `subirServidor` e os auxiliares
de `tests/integration/websocket.test.js` (`entrarNaSala`, `salaComAnaEBruno`, `esperarLista`).
Após cada fase, `npm test` deve passar.

### API do registro de salas (`src/salas.js`) — acréscimos

```text
definirCamera(id, conexao, ligada)  → void; ignora conexão desconhecida/substituída; aoMudar(id) só se mudou
listar(id)                          → [{ id, nome, anfitriao, microfone, camera }]
entrar(...) na substituição         → também cameraLigada = false
```

### API do módulo de mídia (`public/js/midia.js`, antigo `voz.js`)

```text
criarMidia({ enviarSinal(para, dados), aoMudarSomBloqueado(bloqueado), aoFalharPar(idPublico),
             aoMicrofoneEncerrado(), aoCameraEncerrada() })
  ligarMicrofone() / desligarMicrofone()   → como na T03
  ligarCamera()                            → Promise<void>; rejeita com o erro do navegador
  desligarCamera()                         → void
  videoDe(idPublico)                       → <video> com o vídeo recebido daquela pessoa, ou null
  previa()                                 → <video> com a própria imagem, ou null se a câmera está desligada
  atualizarParticipantes(lista, idVoce) / receberSinal(de, dados) / ativarSom() / encerrar()  → como na T03
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 117 testes da T01–T03 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Textos, renomes de `voz*` para `midia*` e canal de vídeo nas conexões — usados por todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Acrescentar a `public/js/textos.js` os textos de [contracts/ui.md](contracts/ui.md): `ligarCamera: "Ligar câmera"`, `desligarCamera: "Desligar câmera"`, `ligandoCamera: "Ligando câmera…"`, `cameraLigada: "câmera ligada"`, `cameraDesligada: "câmera desligada"`, `erroPermissaoCamera: "Não conseguimos usar sua câmera. Para liberar, clique no ícone de cadeado ao lado do endereço do site, permita a câmera e clique em 'Ligar câmera' de novo."`, `semCamera: "Não encontramos nenhuma câmera. Conecte uma câmera e tente de novo."`, `erroLigarCamera: "Não foi possível ligar sua câmera. Feche outros programas que possam estar usando a câmera e tente de novo."`, `cameraDesconectada: "Sua câmera foi desconectada. Verifique a câmera e clique em 'Ligar câmera' de novo."`, `naoFoiPossivelMostrarVideo` como função `(nome) => \`Não foi possível mostrar o vídeo de ${nome}. Verifique sua conexão.\``; citar `specs/004-ativar-webcam/contracts/ui.md` no comentário do topo
- [X] T003 Renomear com `git mv`: `public/js/voz.js` → `public/js/midia.js`, `public/js/voz-regras.js` → `public/js/midia-regras.js`, `tests/unit/voz-regras.test.js` → `tests/unit/midia-regras.test.js`. Renomear `criarVoz` → `criarMidia` e `classificarErroMicrofone` → `classificarErroCaptura`, com o retorno `"semMicrofone"` passando a `"semDispositivo"` (tabela de [research.md](research.md) §7). Atualizar imports, a variável `vozAtual` → `midiaAtual`, `encerrarVoz` → `encerrarMidia`, `MENSAGENS_ERRO_MICROFONE` (chave `semDispositivo`) e comentários em `public/js/app.js`, e os testes em `tests/unit/midia-regras.test.js`. `npm test` deve continuar com 117 testes passando
- [X] T004 Em `public/js/midia.js`, preparar o canal de vídeo sem câmera ainda ([research.md](research.md) §1, §5): função `transceptorDe(conexaoRtc, tipo)` que localiza pelo `receiver.track.kind` (substitui todo `getTransceivers()[0]`); `trocarTrilha(par, tipo, trilha)` por tipo; o iniciador cria `addTransceiver("audio", { direction: "sendrecv" })` **e** `addTransceiver("video", { direction: "sendrecv" })` antes da oferta; o respondedor, após `setRemoteDescription` da oferta, põe **cada** transceptor em `sendrecv` e aplica a trilha do tipo certo (microfone ou `null`); no `track`, `kind === "audio"` → `<audio>` da T03 com `new MediaStream([track])`, `kind === "video"` → `par.video` = `<video autoplay muted playsinline>` (não anexado ao DOM) com `new MediaStream([track])`; `fecharPar` também limpa `par.video`; exportar `videoDe(id)`. `npm test` passa; a voz da T03 continua funcionando (passos 2–3 do quickstart da T03)

**Checkpoint**: `npm test` passa; voz da T03 sem regressão.

---

## Phase 3: User Story 1 - Ligar a câmera e ser visto (Priority: P1) 🎯 MVP

**Goal**: Todos entram com a câmera desligada; o botão liga/desliga; com ela ligada, todos veem o
vídeo num quadro com o nome (a própria pessoa vê "(você)" espelhado); desligar faz o quadro sumir
para todos em até 3 s; a lista mostra o 📷 de cada um.

**Independent Test**: Passos 1, 2, 3, 5 e 6 do [quickstart.md](quickstart.md).

### Tests for User Story 1 ⚠️

- [X] T005 [P] [US1] Acrescentar a `tests/unit/salas.test.js`: após `entrar`, `listar` traz `camera: false`; `definirCamera(id, conexao, true)` → `camera: true` e `aoMudar` chamado; repetir `true` → `aoMudar` não é chamado de novo; conexão desconhecida ou substituída → ignorada; substituição (mesma chave) com câmera ligada → volta a `camera: false`; atualizar os `deepEqual` de `listar` e o teste de chaves públicas para incluir `camera` (`["anfitriao", "camera", "id", "microfone", "nome"]`)
- [X] T006 [P] [US1] Acrescentar a `tests/integration/websocket.test.js`: Ana envia `{ tipo: "camera", ligada: true }` → Ana e Bruno recebem `participantes` com Ana `camera: true`; Carla entra depois e já recebe `camera: true` para Ana; `ligada: false` → `camera: false` para todos; reconectar com a mesma chave → `camera: false`; `camera` antes de `entrar` e `ligada` igual a `"sim"`, `1`, `null` ou ausente → `mensagem-invalida`; atualizar os `deepEqual` de `participantes` existentes para incluir `camera: false`
- [X] T007 [P] [US1] Criar `tests/unit/quadros.test.js` para `quadrosDeVideo(lista, idVoce, idsComFalha)` ([data-model.md](data-model.md)): só participantes com `camera: true` geram quadro; ordem da lista; o da própria pessoa tem `rotulo` `"<nome> (você)"` e `ehVoce: true`; os outros têm `rotulo` igual ao nome; `falhou: true` só se o id está em `idsComFalha` **e** não é a própria pessoa; `idsComFalha` aceita qualquer iterável (ex.: `Set`); lista sem câmeras → `[]`
- [X] T008 [P] [US1] Acrescentar a `tests/unit/participantes.test.js`: `rotularParticipantes` devolve `cameraLigada` (booleano) e `rotuloCamera` igual a `TEXTOS.cameraLigada` / `TEXTOS.cameraDesligada`; atualizar o `deepEqual` existente com os campos novos (lista de exemplo com `camera`)

### Implementation for User Story 1

- [X] T009 [US1] Em `src/salas.js`: `cameraLigada: false` ao criar participante e na substituição; `definirCamera(idSala, conexao, ligada)` igual a `definirMicrofone` (extrair um auxiliar comum `definirEstado(idSala, conexao, campo, valor)` se ficar mais legível); `listar` inclui `camera: p.cameraLigada`; exportar no objeto devolvido. Fazer T005 passar
- [X] T010 [US1] Em `src/servidor.js`, adicionar `tratarCamera` e o despacho de `tipo === "camera"` (só depois de entrar): `typeof ligada !== "boolean"` → `mensagem-invalida`; senão `registro.definirCamera(idSala, conexao, ligada)`. Fazer T006 passar
- [X] T011 [P] [US1] Criar `public/js/quadros.js` (módulo ES puro) exportando `quadrosDeVideo(lista, idVoce, idsComFalha)` conforme [data-model.md](data-model.md), usando `TEXTOS.marcaVoce` para "(você)". Fazer T007 passar
- [X] T012 [P] [US1] Em `public/js/participantes.js`, acrescentar `cameraLigada` e `rotuloCamera` a cada item de `rotularParticipantes`. Fazer T008 passar
- [X] T013 [US1] Em `public/js/midia.js`, adicionar a câmera ([research.md](research.md) §4, §5, §8): `ligarCamera()` com `getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 24 } } })` (sem `audio`), guarda `trilhaCamera`, cria `previaLocal` (`<video autoplay muted playsinline>` com a trilha) e faz `trocarTrilha(par, "video", trilha)` em todos os pares; se `encerrar` aconteceu durante o pedido, parar a trilha; `desligarCamera()` faz `trilha.stop()`, `trocarTrilha(..., "video", null)` em todos e descarta `previaLocal`; pares criados com a câmera ligada já recebem a trilha de vídeo (iniciador e respondedor); `previa()` devolve `previaLocal`; `encerrar()` também desliga a câmera (FR-014)
- [X] T014 [US1] Em `public/js/app.js`, generalizar `criarBotaoMicrofone` em `criarBotaoDispositivo({ textos: { ligar, desligar, ligando }, mensagensErro, ligar, desligar, aoMudar, mensagemDesconectado, classe })` (mesmo comportamento: começa desligado, desabilitado durante o pedido, `aoMudar` só quando de fato muda, limpa a própria mensagem de erro ao ligar, `marcarDesconectado()`); usar para o microfone (sem mudar o comportamento da T03) e para a câmera (`ligar: midia.ligarCamera`, `desligar: midia.desligarCamera`, `aoMudar: (ligada) => sala.enviar({ tipo: "camera", ligada })`, mensagens `erroPermissaoCamera` / `semCamera` / `erroLigarCamera`, `classe: "camera"`). Ao desligar, `desligar()` acontece antes de `aoMudar(false)` (research §2). Botão da câmera na `linha-link`, logo após o do microfone
- [X] T015 [US1] Em `public/js/app.js`, criar a área de vídeos (`<section id="area-videos" hidden>`) entre `linhaLink` e `avisoAnfitriao`; a cada lista recebida, depois de `midia.atualizarParticipantes`, calcular `quadrosDeVideo(lista, idVoce, paresSemVoz)` e montar um `<figure class="quadro">` por item: elemento de vídeo = `midia.previa()` (próprio, com classe `espelhado`) ou `midia.videoDe(id)`; se `falhou` ou não houver elemento, um `<p>` com `TEXTOS.naoFoiPossivelMostrarVideo(nome)` no lugar do vídeo; `<figcaption>` com `rotulo` e `title` com o nome completo; ocultar a área quando não houver quadros. Reutilizar os mesmos elementos `<video>` entre renderizações (não recriá-los). Re-renderizar também quando a própria câmera liga ou desliga e em `aoFalharPar`. Em cada `<li>` da lista, acrescentar `criarIndicadorCamera(item)` ao lado do de microfone: `<span class="indicador-camera">` com 📷, classe `ligado` quando ligada, `role="img"`, `aria-label` e `title` = `item.rotuloCamera`
- [X] T016 [P] [US1] Em `public/estilos.css`: `.camera[aria-pressed="true"]` igual ao destaque do microfone; `#area-videos` em grade (`display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 0.5rem; width: 100%`); `.quadro` com `position: relative; aspect-ratio: 16 / 9; background: #1f2328; border-radius: 0.5rem; overflow: hidden; margin: 0`; `video` do quadro com `width: 100%; height: 100%; object-fit: cover`; `.espelhado { transform: scaleX(-1) }`; `figcaption` sobreposto embaixo, fundo escuro translúcido, texto branco, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`; texto de falha centralizado em branco; `.indicador-camera` como o de microfone, desligado esmaecido e riscado (ex.: `text-decoration: line-through` ou pseudo-elemento diagonal)

**Checkpoint**: `npm test` passa; passos 1, 2, 3, 5 e 6 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 4: User Story 2 - Câmera e microfone independentes (Priority: P2)

**Goal**: Ligar ou desligar um dispositivo nunca muda o outro nem interrompe a voz.

**Independent Test**: Passo 4 do [quickstart.md](quickstart.md).

### Tests for User Story 2 ⚠️

- [X] T017 [P] [US2] Acrescentar a `tests/integration/websocket.test.js`: Ana liga só a câmera → lista com `camera: true, microfone: false`; liga o microfone → `camera: true, microfone: true`; desliga a câmera → `camera: false, microfone: true`; o mesmo em `tests/unit/salas.test.js` com `definirCamera`/`definirMicrofone` alternados

### Implementation for User Story 2

- [X] T018 [US2] Revisar `public/js/midia.js` e `public/js/app.js` e corrigir o que violar FR-009: `ligarCamera` pede só vídeo e `ligarMicrofone` só áudio; ligar/desligar a câmera só mexe no transceptor de vídeo (e o microfone só no de áudio); desligar a câmera não para a trilha do microfone; erro ou desconexão de um dispositivo não muda o botão nem o estado do outro; "Ativar som" continua funcionando com vídeos na tela

**Checkpoint**: `npm test` passa; passo 4 do [quickstart.md](quickstart.md) funciona.

---

## Phase 5: User Story 3 - Permissão da câmera negada (Priority: P3)

**Goal**: Permissão negada ou qualquer falha de câmera mostra uma mensagem em pt-BR só para a
própria pessoa, que continua vendo, ouvindo e falando; câmera desconectada faz o quadro sumir para
todos.

**Independent Test**: Passos 7 e 8 do [quickstart.md](quickstart.md).

### Tests for User Story 3 ⚠️

- [X] T019 [P] [US3] Conferir em `tests/unit/midia-regras.test.js` que `classificarErroCaptura` cobre `NotAllowedError`/`SecurityError` → `"permissao"`, `NotFoundError`/`OverconstrainedError` → `"semDispositivo"` e os demais/`undefined` → `"falha"` (acrescentar o que faltar após o renome de T003)

### Implementation for User Story 3

- [X] T020 [US3] Em `public/js/midia.js`, ao ligar a câmera, registrar `trilha.addEventListener("ended", …)` que (se ainda for a trilha atual) zera `trilhaCamera` e `previaLocal`, tira o vídeo de todos os pares e chama `aoCameraEncerrada()`; se `getUserMedia` falhar, não deixar trilha, prévia nem estado parcial e rejeitar com o erro original
- [X] T021 [US3] Em `public/js/app.js`, ligar `aoCameraEncerrada` a `camera.marcarDesconectado()` (botão volta a `Ligar câmera`, envia `{ tipo: "camera", ligada: false }`, mostra `TEXTOS.cameraDesconectada`, re-renderiza os quadros); garantir que erros de câmera usam `classificarErroCaptura(erro?.name)` → mensagens de câmera, nada é enviado ao servidor, a conexão da sala não fecha e os vídeos/áudio recebidos continuam (FR-010 a FR-012)

**Checkpoint**: `npm test` passa; passos 7 e 8 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T022 [P] Atualizar `README.md`: mencionar que cada pessoa pode ligar a câmera e que câmera e microfone só funcionam em `https://` ou `localhost`
- [X] T023 [P] Revisar `public/` e `src/` para garantir que não restam referências a `voz.js`, `voz-regras.js`, `criarVoz` ou `classificarErroMicrofone`; que todo texto visível vem de `public/js/textos.js`; que não há `console.log` de depuração em `public/js/midia.js`; e que nenhum erro técnico chega à interface
- [X] T024 Rodar `npm run format`, `npm run format:check` e `npm test`, corrigindo o que falhar
- [ ] T025 Reiniciar o servidor e executar os passos 1–10 do [quickstart.md](quickstart.md) com perfis diferentes do navegador, webcam e fone de ouvido, e registrar o resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **Polish (6)**
- US2 e US3 dependem da câmera da US1 (T013–T015). As três alteram `public/js/midia.js` e
  `public/js/app.js`, então devem ser feitas em sequência
- T003 (renomes) antes de qualquer outra mudança em `midia*`; T004 antes de T013

### Within Each Phase

- Testes ([P]) antes da implementação; implementação na ordem numérica (mesmos arquivos)
- T009 → T010; T011 e T012 independentes; T013 → T014 → T015
- T020 → T021

### Parallel Opportunities

- Phase 2: T002 em paralelo com T003 (T004 depois de T003)
- US1: T005, T006, T007 e T008 em paralelo; T011, T012 e T016 em paralelo com T009–T010
- Polish: T022 e T023

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "tests/unit/salas.test.js"             # T005
Task: "tests/integration/websocket.test.js"  # T006
Task: "tests/unit/quadros.test.js"           # T007
Task: "tests/unit/participantes.test.js"     # T008

# Independentes do servidor:
Task: "public/js/quadros.js"                 # T011
Task: "public/js/participantes.js"           # T012
Task: "public/estilos.css"                   # T016
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2 → 2. Phase 3 (US1) → 3. **Validar**: `npm test` + passos 1, 2, 3, 5 e 6 do quickstart

### Incremental Delivery

1. US1 → os amigos se veem (MVP)
2. US2 → câmera e microfone nunca interferem um no outro
3. US3 → falhas de câmera têm explicação clara
4. Polish → revisão, formatação, roteiro completo

## Notes

- Esta tarefa altera código da T03 (renomes e transceptores por tipo); os testes da T03 são
  renomeados/atualizados em T003, T005, T006 e T008, não descartados
- Fazer commit após cada fase
