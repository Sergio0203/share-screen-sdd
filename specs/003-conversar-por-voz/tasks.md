---

description: "Task list for T03 · Conversar por voz"
---

# Tasks: T03 · Conversar por voz

**Input**: Design documents from `/specs/003-conversar-por-voz/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro. WebRTC e captura de microfone reais são validados pelo
roteiro manual do [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único da T01/T02: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md).

**Regras gerais**: estender o código existente (não reescrever do zero). Todo texto visível vem de
`public/js/textos.js` com os textos exatos de [contracts/ui.md](contracts/ui.md). Protocolo em
[contracts/websocket.md](contracts/websocket.md); estado e regras em [data-model.md](data-model.md);
decisões técnicas em [research.md](research.md). Testes de integração usam `subirServidor` de
`tests/integration/auxiliares.js`. Após cada fase, `npm test` deve passar.

### API do registro de salas (`src/salas.js`) ao fim desta tarefa

Acréscimos à API da T02 (nomes exatos):

```text
entrar(id, { chave, nome, conexao })   → igual à T02, mas na substituição o participante recebe
                                         `id` NOVO e microfoneLigado = false
definirMicrofone(id, conexao, ligado)  → void; ignora conexão desconhecida; chama aoMudar(id) só se o valor mudou
conexaoPorId(id, idPublico)            → conexao | null
idPorConexao(id, conexao)              → idPublico | null
listar(id)                             → [{ id, nome, anfitriao, microfone }] em ordem de entrada
```

### API do módulo de voz (`public/js/voz.js`)

```text
criarVoz({ enviarSinal(para, dados), aoMudarSomBloqueado(bloqueado), aoFalharPar(idPublico),
           aoMicrofoneEncerrado() })
  ligarMicrofone()                 → Promise<void>; rejeita com o erro do navegador (usa `erro.name`)
  desligarMicrofone()              → void
  atualizarParticipantes(lista, idVoce) → cria/fecha conexões conforme compararPares
  receberSinal(de, dados)          → void
  ativarSom()                      → void (play() em todos os <audio>)
  encerrar()                       → fecha todas as conexões e para o microfone
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 80 testes da T01/T02 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Textos e roteamento de mensagens WebSocket usados por todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Acrescentar a `public/js/textos.js` os textos de [contracts/ui.md](contracts/ui.md): `ligarMicrofone: "Ligar microfone"`, `desligarMicrofone: "Desligar microfone"`, `ligandoMicrofone: "Ligando microfone…"`, `ativarSom: "Ativar som"`, `microfoneLigado: "microfone ligado"`, `microfoneDesligado: "microfone desligado"`, `erroPermissaoMicrofone: "Não conseguimos usar seu microfone. Para liberar, clique no ícone de cadeado ao lado do endereço do site, permita o microfone e clique em 'Ligar microfone' de novo."`, `semMicrofone: "Não encontramos nenhum microfone. Conecte um microfone e tente de novo."`, `erroLigarMicrofone: "Não foi possível ligar seu microfone. Feche outros programas que possam estar usando o microfone e tente de novo."`, `microfoneDesconectado: "Seu microfone foi desconectado. Verifique o microfone e clique em 'Ligar microfone' de novo."`, `naoFoiPossivelOuvir` como função `(nome) => \`Não foi possível ouvir ${nome}. Verifique sua conexão.\``; atualizar o comentário do topo para citar também `specs/003-conversar-por-voz/contracts/ui.md`
- [X] T003 Acrescentar a `tests/integration/websocket.test.js`: (a) depois de `entrou`, mensagem com `tipo` desconhecido (ex.: `"xyz"`) → `erro: mensagem-invalida` e conexão fechada; (b) `entrar` repetido depois de `entrou` continua dando `mensagem-invalida`; (c) mensagem com mais de 64 KiB (ex.: `entrar` com `nome` de 70 000 caracteres) → conexão fechada pelo servidor
- [X] T004 Em `src/servidor.js`, criar o `WebSocketServer` com `maxPayload: 64 * 1024` e reorganizar `atenderConexao` num despacho por `tipo`: `entrar` (lógica atual, só se ainda não entrou), e — só depois de entrar — os tipos novos das próximas fases; qualquer outro caso → `recusar(conexao, "mensagem-invalida")`. Extrair cada tipo numa função nomeada (`tratarEntrar`, …). Fazer T003 passar sem quebrar os testes da T02

**Checkpoint**: `npm test` passa (T01 + T02 + roteamento).

---

## Phase 3: User Story 1 - Ligar o microfone e ser ouvido (Priority: P1) 🎯 MVP

**Goal**: Todos entram com o microfone desligado; o botão liga/desliga; com ele ligado, todos os
outros ouvem a pessoa por conexão direta; desligar faz pararem de ouvir em até 1 s.

**Independent Test**: Passos 1–5 e 7 do [quickstart.md](quickstart.md) (sem olhar o indicador da lista).

### Tests for User Story 1 ⚠️

- [X] T005 [P] [US1] Criar `tests/unit/voz-regras.test.js` para `devoIniciar(meuId, outroId)` e `compararPares(idsComPar, lista, meuId)`: `devoIniciar("a","b")` → true e `devoIniciar("b","a")` → false (exatamente um iniciador por par); `compararPares` com `idsComPar` vazio e lista `[eu, b, c]` → `criar` só contém os ids maiores que `meuId`, nunca `meuId`; id que está em `idsComPar` e saiu da lista → em `fechar`; id já com par e ainda na lista → nem em `criar` nem em `fechar`; `idsComPar` aceita qualquer iterável (ex.: `map.keys()`)
- [X] T006 [P] [US1] Atualizar `tests/unit/salas.test.js`: o teste "entrar com chave já presente substitui a conexão sem duplicar" passa a exigir `segunda.participante.id !== primeira.participante.id`, mesma posição em `listar`, mesmo papel de anfitrião e nome atualizado; novos testes: `conexaoPorId(id, idPublico)` devolve a conexão do participante e `null` para id desconhecido, sala inexistente ou id antigo após substituição; `idPorConexao(id, conexao)` devolve o id público e `null` para conexão desconhecida ou substituída
- [X] T007 [P] [US1] Acrescentar a `tests/integration/websocket.test.js`: com Ana e Bruno na sala, Ana envia `{ tipo: "sinal", para: <voce do Bruno>, dados: { descricao: { type: "offer", sdp: "x" } } }` → Bruno recebe `{ tipo: "sinal", de: <voce da Ana>, dados: <iguais> }` e Ana não recebe nada; `sinal` com `para` inexistente → ignorado e a conexão continua aberta (uma mensagem seguinte ainda funciona); `sinal` para o `voce` de alguém de **outra sala** → não entregue; `sinal` antes de `entrar`, `para` não texto ou `dados` não objeto (ou `null`/array) → `mensagem-invalida`; atualizar o teste "mesma chave conectando de novo substitui a conexão antiga" para exigir `nova.entrou.voce !== antiga.entrou.voce`

### Implementation for User Story 1

- [X] T008 [P] [US1] Criar `public/js/voz-regras.js` (módulo ES puro, sem DOM) exportando `devoIniciar(meuId, outroId)` (`meuId < outroId`) e `compararPares(idsComPar, lista, meuId)` → `{ criar: string[], fechar: string[] }` conforme [data-model.md](data-model.md). Fazer T005 passar
- [X] T009 [US1] Em `src/salas.js`, na substituição de conexão (mesma chave) gerar `existente.id = gerarSegredo()`; adicionar `conexaoPorId(idSala, idPublico)` e `idPorConexao(idSala, conexao)` ao objeto devolvido; atualizar o comentário da API. Fazer T006 passar
- [X] T010 [US1] Em `src/servidor.js`, adicionar `tratarSinal(registro, idSala, conexao, mensagem)`: validar `typeof para === "string"` e `dados` objeto não nulo e não array (senão `mensagem-invalida`); `de = registro.idPorConexao(idSala, conexao)`; `destino = registro.conexaoPorId(idSala, para)`; se `destino` existe e é diferente da própria conexão, `enviar(destino, { tipo: "sinal", de, dados })`; senão ignorar. Fazer T007 passar
- [X] T011 [US1] Criar `public/js/voz.js` com a API "módulo de voz" acima ([research.md](research.md) §1–4, §6, §8): constante `SERVIDORES_ICE = [{ urls: "stun:stun.l.google.com:19302" }]`; `pares = Map<idPublico, { conexaoRtc, audio, fila, falhou }>`; `atualizarParticipantes` usa `compararPares` → para cada `criar`: nova `RTCPeerConnection`, `addTransceiver("audio", { direction: "sendrecv" })`, `replaceTrack(trilhaMicrofone ?? null)`, `createOffer` → `setLocalDescription` → `enviarSinal(id, { descricao })`; para cada `fechar`: fechar a conexão e remover o `<audio>`; `receberSinal` enfileira por par (promessa encadeada em `fila`) e, para id desconhecido com oferta, cria o par como respondedor: `setRemoteDescription`, pôr o transceptor em `sendrecv` com `replaceTrack(trilhaMicrofone ?? null)`, `createAnswer` → `setLocalDescription` → enviar `{ descricao }`; candidatos → `addIceCandidate`; `onicecandidate` → `enviarSinal(id, { candidato })`; `ontrack` → `<audio autoplay hidden>` anexado ao `document.body` com `srcObject = evento.streams[0] ?? new MediaStream([evento.track])`, e `play()` rejeitado → `aoMudarSomBloqueado(true)`; `ativarSom()` chama `play()` em todos e avisa `aoMudarSomBloqueado(false)`; `ligarMicrofone()` usa `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })` e `replaceTrack(trilha)` em todos os pares; `desligarMicrofone()` faz `replaceTrack(null)` em todos e `trilha.stop()`; `connectionstatechange` com `failed` → `falhou = true` e `aoFalharPar(id)`; `encerrar()` fecha tudo. Comentários explicando o "porquê" (quem inicia, sem renegociação, fila)
- [X] T012 [US1] Em `public/js/app.js`, na tela da sala: criar o botão de microfone na `linha-link` (começa `TEXTOS.ligarMicrofone`, `aria-pressed="false"`); ao clicar desligado → desabilitar com `TEXTOS.ligandoMicrofone`, `await voz.ligarMicrofone()`, depois `TEXTOS.desligarMicrofone` + `aria-pressed="true"`; em erro → voltar a desligado e mostrar `TEXTOS.erroLigarMicrofone` (refinado na US3); ao clicar ligado → `voz.desligarMicrofone()` e voltar a desligado; criar o botão `TEXTOS.ativarSom` (oculto; mostrado por `aoMudarSomBloqueado(true)`; clique → `voz.ativarSom()` e ocultar). Em `conectar`: criar `voz` com `enviarSinal = (para, dados) => conexao.send(JSON.stringify({ tipo: "sinal", para, dados }))`; mensagem `sinal` → `voz.receberSinal(mensagem.de, mensagem.dados)`; mensagem `participantes` → também `voz.atualizarParticipantes(lista, idVoce)`; fechar a conexão, `pagehide` ou erro de sala → `voz.encerrar()` (FR-015)
- [X] T013 [P] [US1] Em `public/estilos.css`, estilos do botão de microfone (estado ligado visualmente destacado via `[aria-pressed="true"]`, desabilitado) e do botão "Ativar som"

**Checkpoint**: `npm test` passa; passos 1–5 e 7 do [quickstart.md](quickstart.md) funcionam (duas pessoas se ouvem; desligar corta em ≤ 1 s; recarregar refaz a voz).

---

## Phase 4: User Story 2 - Ver quem está com o microfone ligado (Priority: P2)

**Goal**: A lista mostra o microfone de cada pessoa, atualizado para todos em até 3 s, inclusive
para quem acabou de entrar.

**Independent Test**: Com três pessoas, uma liga e desliga o microfone → as três listas mudam em
até 3 s; quem entra depois já vê o estado correto (passos 2, 3 e 6 do [quickstart.md](quickstart.md)).

### Tests for User Story 2 ⚠️

- [X] T014 [P] [US2] Acrescentar a `tests/unit/salas.test.js`: após `entrar`, `listar` traz `microfone: false`; `definirMicrofone(id, conexao, true)` → `listar` traz `microfone: true` e `aoMudar` é chamado; repetir `true` → `aoMudar` não é chamado de novo; conexão desconhecida ou substituída → ignorada; substituição (mesma chave) com microfone ligado → volta a `microfone: false`; atualizar os `deepEqual` existentes de `listar` para incluir `microfone: false`
- [X] T015 [P] [US2] Acrescentar a `tests/integration/websocket.test.js`: Ana envia `{ tipo: "microfone", ligado: true }` → Ana e Bruno recebem `participantes` com Ana `microfone: true`; depois `ligado: false` → `microfone: false`; quem entra depois recebe a lista já com o estado atual; `ligado` não booleano (ex.: `"sim"`) ou `microfone` antes de `entrar` → `mensagem-invalida`; atualizar os `deepEqual` existentes de `participantes` para incluir `microfone: false`
- [X] T016 [P] [US2] Acrescentar a `tests/unit/participantes.test.js`: `rotularParticipantes` devolve, para cada item, `microfoneLigado` (booleano) e `rotuloMicrofone` igual a `TEXTOS.microfoneLigado` / `TEXTOS.microfoneDesligado`

### Implementation for User Story 2

- [X] T017 [US2] Em `src/salas.js`: `microfoneLigado: false` ao criar participante e na substituição; `definirMicrofone(idSala, conexao, ligado)` conforme a API acima; `listar` inclui `microfone: p.microfoneLigado`. Fazer T014 passar
- [X] T018 [US2] Em `src/servidor.js`, adicionar `tratarMicrofone`: `typeof ligado !== "boolean"` → `mensagem-invalida`; senão `registro.definirMicrofone(idSala, conexao, ligado)` (a lista sai por `aoMudar`). Fazer T015 passar
- [X] T019 [P] [US2] Em `public/js/participantes.js`, acrescentar `microfoneLigado` e `rotuloMicrofone` a cada item de `rotularParticipantes`. Fazer T016 passar
- [X] T020 [US2] Em `public/js/app.js`: enviar `{ tipo: "microfone", ligado: true }` só depois de `voz.ligarMicrofone()` resolver e `{ tipo: "microfone", ligado: false }` ao desligar; em cada `<li>` da lista, acrescentar um `<span class="indicador-microfone">` com 🎤 ou 🔇, `aria-label` e `title` = `item.rotuloMicrofone` (FR-008)
- [X] T021 [P] [US2] Em `public/estilos.css`, estilo do `.indicador-microfone` (alinhado ao nome; ligado com destaque de cor, desligado esmaecido)

**Checkpoint**: `npm test` passa; passos 2, 3 e 6 do [quickstart.md](quickstart.md) mostram o indicador correto.

---

## Phase 5: User Story 3 - Permissão do microfone negada (Priority: P3)

**Goal**: Permissão negada ou qualquer falha de microfone mostra uma mensagem em pt-BR só para a
própria pessoa, que continua ouvindo e vendo a sala; falha de voz com alguém não é silenciosa.

**Independent Test**: Passos 8 e 9 do [quickstart.md](quickstart.md).

### Tests for User Story 3 ⚠️

- [X] T022 [P] [US3] Acrescentar a `tests/unit/voz-regras.test.js` testes de `classificarErroMicrofone(nomeDoErro)`: `"NotAllowedError"`, `"SecurityError"` → `"permissao"`; `"NotFoundError"`, `"OverconstrainedError"` → `"semMicrofone"`; `"NotReadableError"`, `"AbortError"`, `"TypeError"`, `undefined` → `"falha"`

### Implementation for User Story 3

- [X] T023 [US3] Em `public/js/voz-regras.js`, exportar `classificarErroMicrofone(nomeDoErro)` conforme a tabela de [research.md](research.md) §6. Fazer T022 passar
- [X] T024 [US3] Em `public/js/voz.js`: ao ligar, registrar `trilha.addEventListener("ended", …)` que remove a trilha de todos os pares (`replaceTrack(null)`), zera `trilhaMicrofone` e chama `aoMicrofoneEncerrado()`; se `getUserMedia` falhar, não deixar nenhuma trilha nem estado parcial e rejeitar com o erro original
- [X] T025 [US3] Em `public/js/app.js`: no erro de `ligarMicrofone`, mapear `classificarErroMicrofone(erro.name)` → `TEXTOS.erroPermissaoMicrofone` | `TEXTOS.semMicrofone` | `TEXTOS.erroLigarMicrofone` com `mostrarMensagem`, botão volta a `Ligar microfone` e nada é enviado ao servidor; em `aoMicrofoneEncerrado` → botão desligado, enviar `{ tipo: "microfone", ligado: false }` e mostrar `TEXTOS.microfoneDesconectado`; ao ligar com sucesso → `limparMensagem()` se a mensagem atual for de microfone. Garantir que nenhum desses caminhos fecha a conexão da sala nem interrompe o áudio recebido (FR-012)
- [X] T026 [US3] Em `public/js/app.js` (FR-014): guardar a última lista recebida e o conjunto de ids com `aoFalharPar`; sempre que um desses ids estiver na lista com `microfone: true`, mostrar `TEXTOS.naoFoiPossivelOuvir(nome)`; limpar a mensagem quando essa pessoa desligar o microfone ou sair da lista

**Checkpoint**: `npm test` passa; passos 8 e 9 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T027 [P] Atualizar `README.md`: uma linha sobre conversar por voz e uma nota de que o microfone só funciona em `https://` ou `localhost`
- [X] T028 [P] Revisar `public/` e `src/` para garantir que todo texto visível vem de `public/js/textos.js`, que `sinal` nunca expõe chaves nem é entregue fora da sala, que não há `console.log` de depuração em `public/js/voz.js` e que nenhum erro técnico chega à interface
- [X] T029 Rodar `npm run format`, `npm run format:check` e `npm test`, corrigindo o que falhar
- [ ] T030 Executar os passos 1–10 do [quickstart.md](quickstart.md) com perfis diferentes do navegador e fone de ouvido, e registrar o resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **Polish (6)**
- US2 depende só da Phase 2 no servidor (`microfone`), mas o envio do estado (T020) usa o botão da
  US1 (T012); US3 depende de `voz.js` e do botão da US1. Como as três alteram `src/salas.js`,
  `src/servidor.js` e `public/js/app.js`, fazê-las em sequência

### Within Each Phase

- Testes ([P]) antes da implementação; implementação na ordem numérica (mesmos arquivos)
- T009 → T010 (servidor usa a API nova do registro); T008 → T011 → T012
- T017 → T018; T019 → T020; T023 → T024 → T025 → T026

### Parallel Opportunities

- Phase 2: T002 em paralelo com T003/T004
- US1: T005, T006 e T007 em paralelo; T008 e T013 em paralelo com T009–T010
- US2: T014, T015 e T016 em paralelo; T019 e T021 em paralelo com T017–T018
- Polish: T027 e T028

## Parallel Example: User Story 1

```bash
# Testes de US1 juntos:
Task: "tests/unit/voz-regras.test.js"        # T005
Task: "tests/unit/salas.test.js"             # T006
Task: "tests/integration/websocket.test.js"  # T007

# Independentes do servidor:
Task: "public/js/voz-regras.js"              # T008
Task: "public/estilos.css"                   # T013
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2 → 2. Phase 3 (US1) → 3. **Validar**: `npm test` + passos 1–5 e 7 do quickstart

### Incremental Delivery

1. US1 → os amigos conversam por voz (MVP)
2. US2 → todos sabem quem está com o microfone ligado
3. US3 → falhas de microfone e de conexão de voz têm explicação clara
4. Polish → revisão, formatação, roteiro completo

## Notes

- Esta tarefa altera comportamento da T02: na substituição de conexão o id público muda
  ([research.md](research.md) §5); os testes da T02 são atualizados em T006, T007, T014 e T015, não
  descartados
- Fazer commit após cada fase
