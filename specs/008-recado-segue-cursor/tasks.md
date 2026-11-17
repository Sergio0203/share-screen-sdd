---

description: "Task list for T08 · O recado segue o cursor e some sozinho"
---

# Tasks: T08 · O recado segue o cursor e some sozinho

**Input**: Design documents from `/specs/008-recado-segue-cursor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro. Comportamento visual (deslizar, fade, foco no navegador
real) é conferido no roteiro manual do [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md).

**Regras gerais**: estender o código da T07 (não reescrever do zero). Protocolo em
[contracts/websocket.md](contracts/websocket.md); comportamento da tela em
[contracts/ui.md](contracts/ui.md); campos, regras e ciclo de vida em [data-model.md](data-model.md);
decisões em [research.md](research.md) (citadas como "research §N"). Nenhum texto visível novo.
Texto de recado e nomes continuam **sempre** via `textContent`. Testes do registro de salas usam o
relógio falso de `tests/unit/salas.test.js` (`agendar`/`cancelar`/`disparar(ms)`, que dispara todos
os pendentes com exatamente aquele `ms`). Após cada fase, `npm test` e `npm run format:check` devem
passar.

### Constantes

```text
DURACAO_RECADO_MS = 8000      // src/salas.js, opção `duracaoRecadoMs` (já existe)
DURACAO_FADE_MS = 1000        // src/salas.js, nova opção `duracaoFadeMs` (padrão 1000) para testes
INTERVALO_POSICAO_MS = 50     // public/js/movimento-recado.js
TRANSICAO_MOVIMENTO = 100 ms linear (transform)   // public/estilos.css
TRANSICAO_FADE = 1 s linear (opacity)              // public/estilos.css
```

### API do registro de salas (`src/salas.js`) — depois da T08

```text
criarRegistroSalas({ ..., duracaoRecadoMs = 8000, duracaoFadeMs = 1000, aoMudarRecados })
escreverRecado(idSala, conexao, { alvo, x, y, texto })  → void   // cria em (x, y) ou atualiza texto; apagando=false; reinicia 8 s; leva o recado ao fim da lista
moverRecado(idSala, conexao, { x, y })                  → void   // NOVO: só x/y; não mexe no prazo nem em apagando
apagarRecado(idSala, conexao)                           → void   // como na T07
fecharRecado                                            → REMOVIDO
listarRecados(idSala) → [{ id, autor, nome, alvo, x, y, texto, apagando }] | null   // ordem da última tecla
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 238 testes da T01–T07 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o recado passa a viver junto com o campo (sem `fechar`/`aberto`) e os elementos dos
recados passam a ser reaproveitados por `id` — base para o movimento (US1), o fade (US2) e a regra
de um recado por pessoa (US3).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Em `tests/unit/salas.test.js`, ajustar os testes de recados da T07 ao modelo novo ([data-model.md](data-model.md)): no teste "escrever cria um recado…", o objeto esperado troca `aberto: true` por `apagando: false`; remover o teste "fechar mantém o recado, reinicia os 8 s, e um novo escrever cria outro recado"; renomear "fechar e apagar sem recado aberto não fazem nada" para "apagar sem recado não faz nada" (sem `fecharRecado`); no teste "escrever sobre outro compartilhamento…", trocar `aberto` por `apagando` nos objetos esperados; trocar "quando quem escreve sai, só o recado aberto dela some" por "quando quem escreve sai, o recado dela some" (sem recado fechado sobrevivendo); acrescentar teste: `registro.fecharRecado` não existe (`typeof registro.fecharRecado === "undefined"`)
- [X] T003 [P] Em `tests/integration/websocket.test.js`, ajustar "recado escrito chega a todos da sala, ao vivo, e fechar/apagar atualizam a lista": a lista esperada usa `apagando: false` (sem `aberto`) e o trecho de `fechar` sai; em "recado com formato errado é recusado com mensagem-invalida", acrescentar o caso `{ tipo: "recado", acao: "fechar" }` → `erro` `mensagem-invalida` ([contracts/websocket.md](contracts/websocket.md))
- [X] T004 Em `src/salas.js`: remover o campo `aberto`, a função `fecharRecado` (e do objeto devolvido) e trocar `recadoAbertoDe` por `recadoDe(sala, idPublico)` (o único recado daquela pessoa — "No máximo um recado por `autor`"); criar o recado com `apagando: false`; `listarRecados` devolve `{ id, autor, nome, alvo, x, y, texto, apagando }` (nunca `vence`); em `removerRecadosDe`, remover os recados com `alvo === idPublico || autor === idPublico` (research §6); atualizar o comentário do topo para citar `specs/008-recado-segue-cursor/data-model.md`. Fazer T002 passar
- [X] T005 Em `src/servidor.js`, `tratarRecado`: tirar o ramo `acao === "fechar"` (passa a cair em `recusar(conexao, "mensagem-invalida")`); acrescentar `specs/008-recado-segue-cursor/contracts/websocket.md` ao comentário de contratos de `atenderConexao`. Fazer T003 passar
- [X] T006 Em `public/js/app.js`, remover `aoFecharRecado` dos callbacks passados a `criarAreaTela` (linha ~316)
- [X] T007 Em `public/js/area-tela.js`, o campo passa a viver junto com o recado ([contracts/ui.md](contracts/ui.md) "Campo de recado", research §5): tirar `aoFecharRecado` dos parâmetros de `criarAreaTela`; Enter só faz `preventDefault()` (não fecha); remover o ouvinte de `blur` que fechava o campo; `fecharCampo(acao)` aceita só `"apagar"` (Esc, saída da tela cheia, troca de destaque) e `"descartar"`; em `mostrarRecados`, `meuAberto` passa a ser "há recado com `autor === idVoce`" (sem olhar `aberto`) e o filtro de `desenharRecados` que esconde o próprio recado enquanto o campo está aberto passa a ser `!(campo !== null && r.autor === idVoce)`
- [X] T008 Em `public/js/area-tela.js`, desenhar os recados reaproveitando elementos por `id` (research §2): trocar `grupoRecados.replaceChildren(...visiveis.map(criarRecado))` por um `Map` `id → elemento` — cria o elemento (com `criarRecado`) quando o `id` aparece, atualiza só o `textContent` de `.texto-recado` quando o texto muda, remove os que não estão mais visíveis e reordena os filhos de `grupoRecados` na ordem da lista (o último por cima) só se a ordem mudou (com `substituirFilhosSeMudou`); `posicionar(caixa, ponto, area)` passa a aplicar a posição com `caixa.style.transform = \`translate(${esquerda}px, ${topo}px)\`` (com `left: 0; top: 0` fixos) em vez de `left`/`top`, para o campo e para os recados

**Checkpoint**: `npm test` verde; no navegador, recados da T07 funcionam como antes, exceto que
Enter e clicar fora não fecham mais o campo (ele fecha quando o recado some após 8 s, ou com Esc).

---

## Phase 3: User Story 1 - O recado acompanha o cursor de quem escreve (Priority: P1) 🎯 MVP

**Goal**: o campo segue o ponteiro de quem escreve e, para os outros, o recado desliza até a posição
atual do cursor (≤ 0,5 s, sem saltos); fora da imagem, fica no último ponto.

**Independent Test**: com A compartilhando e B assistindo, B aperta `/`, digita "aqui" e move o
mouse de um canto ao outro da imagem: o campo de B acompanha; em A o recado desliza pelo mesmo
caminho e termina no mesmo detalhe (quickstart passos 2–4).

### Tests for User Story 1 ⚠️

- [X] T009 [P] [US1] Criar `tests/unit/movimento-recado.test.js` para `devoEnviarPosicao(agora, ultimoEnvio, ponto, ultimoEnviado)` de `public/js/movimento-recado.js` ([data-model.md](data-model.md) "Validação"): `INTERVALO_POSICAO_MS === 50`; nunca enviou (`ultimoEnvio === null`, `ultimoEnviado === null`) → `true`; ponto igual ao último enviado (mesmos `x` e `y`) → `false` mesmo depois de 50 ms; ponto novo com `agora - ultimoEnvio === 49` → `false`; ponto novo com `=== 50` → `true`; ponto novo com `> 50` → `true`
- [X] T010 [P] [US1] Acrescentar a `tests/unit/salas.test.js` testes de `moverRecado` ([data-model.md](data-model.md) "Ciclo de vida"): com A compartilhando e B com recado em `(0.1, 0.1)`, `moverRecado(id, conexaoB, { x: 0.6, y: 0.7 })` muda `x`/`y` do mesmo recado (mesmo `id`, mesmo texto) e chama `aoMudarRecados`; **não** reagenda o prazo (`relogio.duracoesPendentes()` igual antes e depois e `disparar(8000)` conta desde o último `escrever`); `escreverRecado` depois de mover **não** volta `x`/`y` ao ponto antigo nem aplica os `x`/`y` da mensagem (só cria usa `x`/`y`); ignorados sem mudança e sem `aoMudarRecados`: `moverRecado` sem recado, com `x`/`y` fora de 0–1, `NaN`, `Infinity`, conexão fora da sala; mover o recado de B não altera o recado de C
- [X] T011 [P] [US1] Acrescentar a `tests/integration/websocket.test.js`: com Ana compartilhando e Bruno com recado, Bruno envia `{ tipo: "recado", acao: "mover", x: 0.8, y: 0.3 }` → Ana e Bruno recebem `recados` com o recado de Bruno em `x: 0.8, y: 0.3` e o mesmo `id`/texto; formato errado (`x: "a"`, `y` ausente) → `erro` `mensagem-invalida`; `mover` sem recado → nenhuma mensagem `recados` nova e a conexão continua aberta

### Implementation for User Story 1

- [X] T012 [P] [US1] Criar `public/js/movimento-recado.js` (módulo ES puro, sem DOM) exportando `INTERVALO_POSICAO_MS = 50` e `devoEnviarPosicao(agora, ultimoEnvio, ponto, ultimoEnviado)` conforme T009, com comentário citando research §1. Fazer T009 passar
- [X] T013 [US1] Em `src/salas.js`, implementar `moverRecado(idSala, conexao, { x, y })`: acha `recadoDe(sala, autor.id)`; ignora se não houver ou se `!fracaoValida(x) || !fracaoValida(y)`; atualiza `x`/`y` e chama `aoMudarRecados(idSala)` sem tocar em `vence`/`apagando`; incluir no objeto devolvido pelo registro. Fazer T010 passar
- [X] T014 [US1] Em `src/servidor.js`, `tratarRecado`: ramo `acao === "mover"` que exige `typeof x === "number" && typeof y === "number"` (senão `recusar(conexao, "mensagem-invalida")`) e chama `registro.moverRecado(idSala, conexao, { x, y })`. Fazer T011 passar
- [X] T015 [US1] Em `public/js/app.js`, acrescentar o callback `aoMoverRecado: ({ x, y }) => enviarRecado({ acao: "mover", x, y })` em `criarAreaTela`
- [X] T016 [US1] Em `public/js/area-tela.js`, o campo segue o ponteiro (research §1 e §3; [contracts/ui.md](contracts/ui.md) "Posição"): receber `aoMoverRecado` em `criarAreaTela`; no `pointermove` sobre `destaque`, se `campo !== null`, calcular `pontoSobAImagem()`; se não for `null` e `idEmDestaque === campo.alvo`, atualizar `campo.x`/`campo.y` e chamar `posicionar(campo.caixa, campo, areaAtual())` na hora (fora da imagem, nada muda — FR-004); se `campo.enviou`, enviar a posição com `devoEnviarPosicao(performance.now(), campo.ultimoEnvio, ponto, campo.ultimoEnviado)` → `aoMoverRecado(ponto)` e guardar `ultimoEnvio`/`ultimoEnviado`; quando a regra disser "ainda não", agendar um único `setTimeout` para o restante do intervalo que envia o ponto mais recente se ele ainda for diferente do último enviado (o ponto final nunca se perde); o primeiro `escrever` (em `aoMudarTexto`) usa `campo.x`/`campo.y` atuais; cancelar o envio pendente em `fecharCampo`
- [X] T017 [US1] Em `public/estilos.css`, seção `/* ---------- Recados … (T07) ---------- */`: `.recado` e `.caixa-campo-recado` com `left: 0; top: 0;` e `will-change: transform`; `.recado` com `transition: transform 100ms linear` (research §2); `.caixa-campo-recado` **sem** transição de `transform` (segue o ponteiro na hora); acrescentar comentário "T08: movimento por transform". Conferir com `npm run format:check`

**Checkpoint**: US1 completa — quickstart passos 2–4 funcionam (o recado ainda some de uma vez aos
8 s; o fade é a US2).

---

## Phase 4: User Story 2 - O recado some sozinho, aos poucos (Priority: P1)

**Goal**: 8 s depois da última tecla o recado entra em fade de 1 s e some para todos ao mesmo tempo;
uma tecla durante o fade o traz de volta e reinicia a contagem; Enter não faz nada; Esc apaga na hora.

**Independent Test**: B escreve "oi" e para: nas duas telas o recado fica inteiro por 8 s, some aos
poucos em 1 s e o campo de B fecha; repetir digitando uma letra no meio do fade: volta inteiro e só
some 9 s depois dessa tecla (quickstart passos 5, 6 e 10).

### Tests for User Story 2 ⚠️

- [X] T018 [P] [US2] Acrescentar a `tests/unit/salas.test.js` testes das fases ([data-model.md](data-model.md) "Ciclo de vida", research §4), com `novoRegistro` criando o registro com `duracaoFadeMs: 1000`: depois de `escreverRecado`, há um temporizador de 8000; `disparar(8000)` → o recado continua na lista com `apagando: true`, `aoMudarRecados` é chamado e há um temporizador de 1000; `disparar(1000)` → recado removido e `aoMudarRecados` chamado; `escreverRecado` durante o fade → `apagando: false`, o temporizador de 1000 é cancelado e há um novo de 8000 (só um pendente para o recado); `moverRecado` durante o fade mantém `apagando: true` e o temporizador de 1000; `apagarRecado` durante o fade remove na hora e cancela o temporizador; remoções por parar de compartilhar/sair durante o fade cancelam o temporizador de 1000. Ajustar o teste da T07 "8 s depois da última tecla o recado some" para `disparar(8000)` e depois `disparar(1000)`
- [X] T019 [P] [US2] Acrescentar a `tests/integration/websocket.test.js` (com `subirServidor({ duracaoRecadoMs: 100, duracaoFadeMs: 100 })` ou o mecanismo usado em "o recado some sozinho depois do prazo"): depois de `escrever`, chega `recados` com `apagando: true` e, em seguida, `recados` com lista vazia; um `escrever` depois de `apagando: true` faz chegar `recados` com `apagando: false`. Ajustar "o recado some sozinho depois do prazo" para esperar as duas mensagens

### Implementation for User Story 2

- [X] T020 [US2] Em `src/salas.js`, opção `duracaoFadeMs = 1000` em `criarRegistroSalas`; `reagendarRecado(sala, recado)` agenda o início do fade: ao vencer `duracaoRecadoMs`, `recado.apagando = true`, `aoMudarRecados(sala.id)` e `recado.vence = agendar(remover, duracaoFadeMs)`, onde `remover` tira o recado da sala e chama `aoMudarRecados`; `escreverRecado` faz `recado.apagando = false` antes de reagendar; garantir que `src/servidor.js` repassa `duracaoFadeMs` de `criarServidor(opcoes)` ao registro (via `...opcoesRegistro`, como `duracaoRecadoMs`). Fazer T018 e T019 passarem
- [X] T021 [US2] Em `public/js/area-tela.js`, aplicar o fade ([contracts/ui.md](contracts/ui.md) "Fade"): ao criar/atualizar o elemento de cada recado (T008), `elemento.classList.toggle("apagando", recado.apagando)`; em `mostrarRecados`, se há recado com `autor === idVoce`, aplicar a mesma classe a `campo.caixa` conforme o `apagando` desse recado (o próprio campo também some aos poucos e volta com uma tecla); o campo continua fechando quando o próprio recado some da lista (fim do fade) — sem nenhum temporizador no navegador além de `PRAZO_CAMPO_VAZIO_MS` para o campo que nunca enviou nada
- [X] T022 [US2] Em `public/estilos.css`: `.recado, .caixa-campo-recado { transition: …, opacity 1s linear }` combinando com a transição de `transform` do `.recado` (T017) e `.apagando { opacity: 0; }`; ao sair de `.apagando`, a opacidade volta a 1 na hora (`.recado:not(.apagando), .caixa-campo-recado:not(.apagando) { transition-property: transform }` ou equivalente, mantendo os 100 ms de movimento do `.recado`). Conferir com `npm run format:check`

**Checkpoint**: US1 + US2 completas — quickstart passos 2–6 e 10 funcionam.

---

## Phase 5: User Story 3 - Um recado por pessoa, vários ao mesmo tempo (Priority: P2)

**Goal**: enquanto o recado da pessoa aparece, tudo o que ela digita (inclusive `/`) vai para ele,
mesmo se o campo perdeu o foco; `/` só abre um recado novo depois que o anterior sumiu; recados de
pessoas diferentes convivem e o de tecla mais recente fica por cima.

**Independent Test**: B escreve "um", para, clica na imagem e digita `/dois`: todos veem "um/dois"
num recado só; depois que some, `/` abre um campo vazio; A, B e C escrevem juntos e todos veem os
três recados, o último a digitar por cima (quickstart passos 7–9, 12).

### Tests for User Story 3 ⚠️

- [X] T023 [P] [US3] Em `tests/unit/atalho-recado.test.js`, trocar os testes de `deveAbrirCampo` por testes de `acaoDaTecla(evento, { alvoEhCampoDeTexto, campoAberto, temDestaque, pontoNaImagem })` (research §5): sem campo aberto — `/` com destaque e ponto → `"abrir"`; `/` com Ctrl/Alt/⌘, `repeat`, sem destaque, `pontoNaImagem: null` ou em campo de texto → `null`; outra tecla → `null`. Com `campoAberto: true` e alvo fora de campo de texto — `"/"`, `"a"`, `" "`, `"Backspace"`, `"Delete"` e `"Dead"` (acento de tecla morta) → `"voltarAoCampo"`; `"Escape"` → `"apagar"`; `"Enter"`, `"ArrowLeft"`, `"Tab"`, `"F1"`, `"Shift"` → `null`; `"a"` com Ctrl/Alt/⌘ → `null`. Com `campoAberto: true` e `alvoEhCampoDeTexto: true` (o próprio campo de recado ou o campo de nome) → `null` para qualquer tecla. Manter os testes de `ehCampoDeTexto`
- [X] T024 [P] [US3] Acrescentar a `tests/unit/salas.test.js` (FR-009/FR-010, [data-model.md](data-model.md) "Ordem da lista"): B e C com recados sobre A — `listarRecados` em ordem de criação; um novo `escreverRecado` de B leva o recado de B para o fim (mesmo `id`); `moverRecado` de B não muda a ordem; B nunca tem dois recados (vários `escreverRecado` seguidos, inclusive durante o fade, mantêm um único `id`); `apagarRecado` de B não altera o recado de C. Ajustar o teste da T07 "a lista segue a ordem de criação e aceita texto vazio" para "ordem da última tecla"

### Implementation for User Story 3

- [X] T025 [US3] Em `public/js/atalho-recado.js`, substituir `deveAbrirCampo` por `acaoDaTecla(evento, { alvoEhCampoDeTexto, campoAberto, temDestaque, pontoNaImagem })` → `"abrir"` | `"voltarAoCampo"` | `"apagar"` | `null` conforme T023 (teclas que escrevem = `key.length === 1`, mais `"Backspace"`, `"Delete"` e `"Dead"`); atualizar o comentário do topo citando `specs/008-recado-segue-cursor/research.md` §5. Fazer T023 passar
- [X] T026 [US3] Em `src/salas.js`, `escreverRecado` move o recado para o fim de `sala.recados` a cada chamada (`sala.recados.delete(recado.id); sala.recados.set(recado.id, recado)`), para que a ordem da lista seja a da última tecla; atualizar o comentário do `Map` ("ordem da última tecla; o último é desenhado por cima"). Fazer T024 passar
- [X] T027 [US3] Em `public/js/area-tela.js`, `aoApertarTecla` usa `acaoDaTecla(evento, { alvoEhCampoDeTexto: ehCampoDeTexto(evento.target), campoAberto: campo !== null, temDestaque: idEmDestaque !== null, pontoNaImagem: pontoSobAImagem() })`: `"abrir"` → `preventDefault()` e `abrirCampo(ponto)` (como antes); `"voltarAoCampo"` → `campo.entrada.focus()` **sem** `preventDefault()` (a tecla entra no campo, research §5); `"apagar"` → `preventDefault()` e `fecharCampo("apagar")`; `null` → nada. Ao focar de volta, pôr o cursor de texto no fim (`setSelectionRange(fim, fim)`) para o `/` ou a letra entrarem depois do texto atual
- [X] T028 [US3] Em `public/js/area-tela.js`, impedir que um clique na imagem tire o foco do campo sem necessidade: `mousedown` em `destaque` com `campo !== null` e alvo fora de `campo.caixa` faz `preventDefault()` (é no `mousedown`, não no `pointerdown`, que o navegador move o foco) (o campo continua com foco; botões como "Tela cheia" continuam funcionando por `click`). Confirmar manualmente que o botão "Tela cheia" e as miniaturas continuam clicáveis

**Checkpoint**: todas as histórias completas — quickstart passos 1–12 funcionam.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T029 [P] Atualizar `README.md`: no parágrafo dos recados, dizer que o recado segue o cursor de quem escreve, some aos poucos 8 s depois da última tecla e que cada pessoa tem um recado por vez
- [X] T030 [P] Atualizar os comentários de topo de `public/js/area-tela.js` (bloco "Recados (T07)") para citar `specs/008-recado-segue-cursor/contracts/ui.md` e research §2–§5, e remover menções a "Enter fecha" e "clicar fora fecha"
- [X] T031 Procurar restos da T07 que não valem mais com `grep -rn "fecharRecado\|aoFecharRecado\|aberto" src public tests` e corrigir os que se referem a recados
- [X] T032 Rodar `npm test` e `npm run format:check`; corrigir o que falhar
- [ ] T033 Executar o roteiro manual completo do [quickstart.md](quickstart.md) (passos 1–12) em Chrome e Firefox, com 3 janelas, incluindo teclado ABNT2 para `/` e acentos (tecla morta) com o campo sem foco, e registrar qualquer divergência

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Phase 2. É o MVP.
- **US2 (Phase 4)**: depende da Phase 2 (elementos por `id`, sem `fechar`). Independente da US1 no
  servidor; no CSS, T022 combina a transição com T017 — se a US2 vier antes, T022 cria a regra só
  com `opacity`.
- **US3 (Phase 5)**: depende da Phase 2. Independente da US1 e da US2.
- **Polish (Phase 6)**: depois das histórias desejadas.

### Within Each Phase

- Testes primeiro, falhando; depois a implementação que os faz passar.
- Phase 2: T002 → T004; T003 → T005; T004 antes de T005 (servidor usa o registro); T007 → T008
  (mesmo arquivo).
- US1: T012 antes de T016; T013 → T014; T015 e T016 juntos (callback e uso).
- US2: T020 depois de T018/T019; T021 → T022.
- US3: T025 antes de T027; T027 → T028 (mesmo arquivo).
- Arquivos compartilhados — não paralelizar entre si: `src/salas.js` (T004, T013, T020, T026),
  `public/js/area-tela.js` (T007, T008, T016, T021, T027, T028, T030),
  `tests/unit/salas.test.js` (T002, T010, T018, T024), `public/estilos.css` (T017, T022).

### Parallel Opportunities

- Phase 2: T002 e T003 em paralelo.
- US1: T009, T010 e T011 em paralelo; T012 em paralelo com T013.
- US2: T018 e T019 em paralelo.
- US3: T023 e T024 em paralelo; T025 em paralelo com T026.
- Polish: T029 e T030 em paralelo.

---

## Parallel Example: User Story 1

```text
# Testes da US1, em paralelo:
T009  tests/unit/movimento-recado.test.js
T010  tests/unit/salas.test.js
T011  tests/integration/websocket.test.js

# Depois, em paralelo:
T012  public/js/movimento-recado.js
T013  src/salas.js
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2 (recado vive junto com o campo; elementos por `id`).
2. Phase 3 (US1): o recado segue o cursor e desliza para todos.
3. **Parar e validar**: quickstart passos 2–4 com duas pessoas.

### Incremental Delivery

1. US1 → recado preso ao cursor (MVP).
2. US2 → fade de 1 s e tecla no fade.
3. US3 → `/` e teclas voltam ao recado com o campo sem foco; ordem pela última tecla.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefas incompletas.
- Nada de recados vai para disco ou `localStorage`.
- Commits por tarefa ou grupo lógico; `npm test` verde ao fim de cada fase.
