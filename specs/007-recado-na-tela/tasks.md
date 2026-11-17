---

description: "Task list for T07 · Escrever recados sobre o compartilhamento"
---

# Tasks: T07 · Escrever recados sobre o compartilhamento

**Input**: Design documents from `/specs/007-recado-na-tela/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro. Comportamento visual (posição na tela, tela cheia, teclas
no navegador real) é conferido no roteiro manual do [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Projeto único: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md).

**Regras gerais**: estender o código existente (não reescrever do zero). Todo texto visível vem de
`public/js/textos.js` com os textos exatos de [contracts/ui.md](contracts/ui.md). Protocolo em
[contracts/websocket.md](contracts/websocket.md); campos, regras e ciclo de vida em
[data-model.md](data-model.md); decisões em [research.md](research.md) (citadas como "research §N").
Texto de recado e nomes **sempre** via `textContent`, nunca `innerHTML` (FR-008). Testes do registro
de salas usam o relógio falso de `tests/unit/salas.test.js` (`agendar`/`cancelar`/`disparar(ms)`).
Após cada fase, `npm test` deve passar. Reinicie o servidor antes de qualquer teste manual.

### Constantes

```text
RECADO_MAXIMO = 100           // grafemas, em public/js/recados.js
DURACAO_RECADO_MS = 8000      // em src/salas.js, opção `duracaoRecadoMs` (padrão 8000) para testes
```

### API do registro de salas (`src/salas.js`) — acréscimos

```text
criarRegistroSalas({ ..., duracaoRecadoMs = 8000, aoMudarRecados = () => {} })
escreverRecado(idSala, conexao, { alvo, x, y, texto })  → void (ignora entradas inválidas, research §9)
fecharRecado(idSala, conexao)                             → void
apagarRecado(idSala, conexao)                             → void
listarRecados(idSala)  → [{ id, autor, nome, alvo, x, y, texto, aberto }] | null   // ordem de criação
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 186 testes da T01–T06 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Textos e os módulos puros de texto e de posição — usados pelo servidor e por todas as
histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Acrescentar a `public/js/textos.js`, numa seção `// Recados`, os textos de [contracts/ui.md](contracts/ui.md): `dicaRecado: "Aperte / para escrever um recado"`, `rotuloCampoRecado: "Recado"`, `caracteresRestantes: (n) => n === 1 ? "Falta 1 caractere" : \`Faltam ${n} caracteres\``, `marcaVoceTela: " (você)"`, `erroEnviarRecado: "Não foi possível enviar o recado. Verifique sua conexão e tente de novo."`; acrescentar `specs/007-recado-na-tela/contracts/ui.md` ao comentário do topo
- [X] T003 [P] Criar `tests/unit/recados.test.js` para `public/js/recados.js` ([data-model.md](data-model.md) "Validação", research §6): `RECADO_MAXIMO === 100`; `contarCaracteres("abc") === 3`, `contarCaracteres("👍") === 1`, `contarCaracteres("👨‍👩‍👧") === 1`, `contarCaracteres("é")` (e + acento combinante) `=== 1`; `normalizarTextoRecado("a\r\nb\nc\rd") === "a b c d"`; `cortarTextoRecado("x".repeat(150))` tem 100 grafemas; `cortarTextoRecado("👍".repeat(120))` tem 100 grafemas e não corta um emoji ao meio; `textoRecadoValido("x".repeat(100)) === true`, `"x".repeat(101)` → `false`, `"a\nb"` → `true` (normalizado), `""` → `true` (campo pode ficar vazio), número/`null`/objeto → `false`; `textoDepoisDaInsercao("abcd", 1, 3, "XY") === "aXYd"`; `caberNoLimite("x".repeat(95), 95, 95, "y".repeat(10)) === "yyyyy"`; `caberNoLimite("x".repeat(100), 100, 100, "y") === ""`; com seleção substituída: `caberNoLimite("x".repeat(100), 0, 3, "abc") === "abc"`; `caberNoLimite` normaliza quebras de linha do texto colado
- [X] T004 Criar `public/js/recados.js` (módulo ES puro, sem DOM, importável pelo servidor como `nome.js`) exportando `RECADO_MAXIMO`, `contarCaracteres` (grafemas com `new Intl.Segmenter("pt-BR", { granularity: "grapheme" })`), `normalizarTextoRecado`, `cortarTextoRecado`, `textoRecadoValido`, `textoDepoisDaInsercao` e `caberNoLimite` conforme [data-model.md](data-model.md). Fazer T003 passar
- [X] T005 [P] Criar `tests/unit/posicao-recado.test.js` para `public/js/posicao-recado.js` (research §3): `caixa = { left, top, width, height }`. `areaDaImagem({left:0,top:0,width:1000,height:1000}, 1920, 1080)` → faixas em cima e embaixo: `{ left: 0, top: 218.75, width: 1000, height: 562.5 }`; `areaDaImagem({left:10,top:20,width:1000,height:300}, 1920, 1080)` → faixas laterais, `height: 300`, centralizada horizontalmente; sem dimensões do vídeo (0×0) → `null`. `pontoNaImagem(caixa, 1920, 1080, clienteX, clienteY)` → `{ x, y }` em 0–1 relativos à área da imagem; ponto nas faixas vazias → `null`; ponto fora da caixa → `null`; bordas exatas (0 e 1) aceitas. Ida e volta: ponto obtido numa caixa 1280 de largura e desenhado com `pixelNaArea(area, x, y)` numa caixa 1920 cai no mesmo lugar relativo da imagem com erro < 1% (SC-002). `encaixarNaArea({ esquerda, topo, largura, altura }, area)` empurra uma caixa que passa da borda direita/inferior para dentro e nunca devolve posição negativa
- [X] T006 Criar `public/js/posicao-recado.js` (módulo ES puro) exportando `areaDaImagem`, `pontoNaImagem`, `pixelNaArea` e `encaixarNaArea` conforme T005. Fazer T005 passar

**Checkpoint**: módulos puros prontos — histórias podem começar.

---

## Phase 3: User Story 1 - Escrever um recado sobre o compartilhamento (Priority: P1) 🎯 MVP

**Goal**: `/` sobre a imagem em destaque abre um campo no ponto; o texto aparece ao vivo para todos
que veem aquele compartilhamento e some 8 s depois da última tecla; Enter/clicar fora fecham o
campo; Esc apaga.

**Independent Test**: com A compartilhando e B assistindo, B aperta `/` sobre um canto da imagem e
digita "aqui"; A vê o texto com o nome de B no mesmo canto em até 1 s por tecla; 8 s depois da
última tecla o recado some nas duas telas (quickstart passos 3–7, 11–15).

### Tests for User Story 1 ⚠️

- [X] T007 [P] [US1] Acrescentar a `tests/unit/salas.test.js` testes do ciclo de vida ([data-model.md](data-model.md)), com A compartilhando (`definirTela`) e B na sala: `escreverRecado` de B com alvo A cria 1 recado `{ autor: idB, nome: "Bruno", alvo: idA, x, y, texto, aberto: true }` em `listarRecados` e chama `aoMudarRecados(idSala)`; agenda exatamente um temporizador de `duracaoRecadoMs`; novo `escreverRecado` atualiza o texto do **mesmo** recado (mesmo `id`, `x`/`y` originais mesmo se vierem outros) e reagenda (cancela o anterior); `disparar(8000)` remove o recado e chama `aoMudarRecados`; `fecharRecado` → `aberto: false` e reagenda os 8 s; depois de fechar, novo `escreverRecado` cria **outro** recado (o fechado continua até vencer); `apagarRecado` remove o aberto na hora e cancela o temporizador; `fecharRecado`/`apagarRecado` sem recado aberto não fazem nada nem chamam `aoMudarRecados`; `escreverRecado` com outro `alvo` tendo um aberto remove o antigo e cria o novo; ordem de `listarRecados` = ordem de criação; texto vazio é aceito (recado continua aberto)
- [X] T008 [P] [US1] Acrescentar a `tests/unit/salas.test.js` testes de limpeza e de entradas ignoradas (research §9; [data-model.md](data-model.md) tabela "Também removem o recado"): A para de compartilhar → somem todos os recados com `alvo` A (e seus temporizadores); A sai (`sair`) → idem; A recarrega (mesma chave, conexão nova) → idem; B (quem escreve) sai → some só o recado **aberto** de B, o fechado continua até os 8 s; ignorados sem mudar nada e sem `aoMudarRecados`: alvo que não está compartilhando, alvo inexistente, `x`/`y` fora de 0–1, `NaN` ou `Infinity`, texto com 101 grafemas; conexão que não está na sala; `listarRecados` de sala inexistente → `null`
- [X] T009 [P] [US1] Criar `tests/unit/atalho-recado.test.js` para `deveAbrirCampo(evento, { alvoEhCampoDeTexto, temDestaque, pontoNaImagem })` de `public/js/atalho-recado.js` (research §5): `{ key: "/" }` com destaque e ponto → `true`; `key` diferente de `"/"` → `false`; com `ctrlKey`, `altKey` ou `metaKey` → `false`; `alvoEhCampoDeTexto: true` → `false`; sem destaque → `false`; `pontoNaImagem: null` → `false`; `evento.repeat === true` → `false`. E `ehCampoDeTexto(elemento)`: `INPUT` de texto, `TEXTAREA`, `SELECT` e `isContentEditable` → `true`; `BUTTON`, `INPUT type="checkbox"` e `null` → `false`
- [X] T010 [P] [US1] Acrescentar a `tests/integration/websocket.test.js` (usando `salaComAnaEBruno` e os auxiliares existentes): Ana envia `tela` compartilhando; Bruno envia `{ tipo: "recado", acao: "escrever", alvo: idAna, x: 0.5, y: 0.5, texto: "oi" }` → Ana e Bruno recebem `{ tipo: "recados", lista: [ { autor: idBruno, nome: "Bruno", alvo: idAna, x: 0.5, y: 0.5, texto: "oi", aberto: true, id } ] }`; `fechar` → lista com `aberto: false`; `apagar` em outro recado → lista vazia; uma terceira pessoa que entra recebe `recados` com os recados ativos logo depois de `entrou`; com `duracaoRecadoMs` curto (ex.: 100 ms) via `subirServidor({ duracaoRecadoMs: 100 })`, a lista volta vazia sozinha; Ana para de compartilhar → lista vazia; formato errado (`acao: "xyz"`, `texto: 5`, `x: "a"`, `recado` antes de `entrar`) → `erro` `mensagem-invalida`; alvo que não compartilha → nenhuma mensagem `recados` nova e a conexão continua aberta

### Implementation for User Story 1

- [X] T011 [US1] Implementar em `src/salas.js` os recados de [data-model.md](data-model.md): `sala.recados = new Map()` em `criar`; opções `duracaoRecadoMs = 8000` e `aoMudarRecados = () => {}`; `escreverRecado`/`fecharRecado`/`apagarRecado`/`listarRecados` conforme a API acima (id com `gerarSegredo`, `nome` do participante, validação com `textoRecadoValido`/`normalizarTextoRecado` de `../public/js/recados.js`, `x`/`y` com `Number.isFinite` e 0–1, alvo com `tela !== null`; temporizador via `agendar`/`cancelar` injetados, guardado no recado e **nunca** enviado em `listarRecados`); função interna `removerRecados(sala, filtro)` que cancela os temporizadores e chama `aoMudarRecados` só se algo saiu; chamá-la em `definirTela` (parou), em `sair` (alvo = quem saiu; e o aberto de quem saiu) e na substituição de conexão em `entrar` (id antigo, antes de trocar o id). Fazer T007 e T008 passarem
- [X] T012 [US1] Implementar em `src/servidor.js` ([contracts/websocket.md](contracts/websocket.md)): `aoMudarRecados: (idSala) => queueMicrotask(() => enviarRecados(registro, idSala))` em `criarRegistroSalas`; `enviarRecados` manda `{ tipo: "recados", lista }` a todas as conexões da sala; em `atenderConexao`, ramo `mensagem?.tipo === "recado" && jaEntrou` chamando `tratarRecado(registro, idSala, conexao, mensagem)` que valida o **formato** (`acao` em `"escrever" | "fechar" | "apagar"`; em `escrever`, `alvo` e `texto` strings, `x` e `y` do tipo number) e responde `recusar(conexao, "mensagem-invalida")` se errado, senão chama o método do registro; em `tratarEntrar`, depois de `entrou`, enviar `{ tipo: "recados", lista: registro.listarRecados(idSala) }` só para quem entrou; repassar `duracaoRecadoMs` de `criarServidor(opcoes)` ao registro (já acontece via `...opcoesRegistro`). Fazer T010 passar
- [X] T013 [US1] Criar `public/js/atalho-recado.js` (módulo ES puro) exportando `ehCampoDeTexto(elemento)` e `deveAbrirCampo(evento, estado)` conforme T009. Fazer T009 passar
- [X] T014 [US1] Em `public/js/app.js`, `conectar`: tratar `mensagem.tipo === "recados"` chamando um novo callback `aoReceberRecados(mensagem.lista)`; `enviar(mensagem)` passa a devolver `true` quando envia e `false` quando o WebSocket não está aberto (os chamadores atuais ignoram o retorno)
- [X] T015 [US1] Em `public/js/area-tela.js`, dentro de `criarAreaTela({ aoEscolher, aoEscreverRecado, aoFecharRecado, aoApagarRecado })`: criar a camada `.camada-recados` como filho do contêiner `destaque` (junto do vídeo, legenda e botão, para ir junto para a tela cheia — research §4) e a dica `.dica-recado` com `TEXTOS.dicaRecado`, mostrada só se `matchMedia("(pointer: fine)").matches`; guardar `clientX`/`clientY` do último `pointermove` sobre `destaque`; posicionar a camada sobre `areaDaImagem(destaque/vídeo.getBoundingClientRect(), video.videoWidth, video.videoHeight)` a cada `atualizar`; nova função `mostrarRecados(lista, idVoce)` que desenha só recados com `alvo === idEmDestaque` e `texto.trim() !== ""`, na ordem da lista, cada um como `<div class="recado">` com `<strong class="nome-recado">` (nome via `textContent`) e `<span class="texto-recado">` (`texto.trim()` via `textContent`), posicionado em `pixelNaArea(area, x, y)` relativo à camada; devolver `mostrarRecados` junto de `elemento` e `atualizar`
- [X] T016 [US1] Em `public/js/area-tela.js`, o campo de recado (research §5–§7, [contracts/ui.md](contracts/ui.md) "Campo de recado"): ouvinte `keydown` no `document` que, quando `deveAbrirCampo(evento, { alvoEhCampoDeTexto: ehCampoDeTexto(evento.target), temDestaque: idEmDestaque !== null && video com dimensões, pontoNaImagem: pontoNaImagem(...último ponteiro...) })`, faz `preventDefault()` e abre `<input type="text" class="campo-recado" aria-label=TEXTOS.rotuloCampoRecado>` + `<span class="contador-recado">` (`TEXTOS.caracteresRestantes(100 - contarCaracteres(valor))`) dentro da camada, no ponto, com foco; guardar `campoAberto = { alvo, x, y }`. No `input`: valor = `cortarTextoRecado(valor)` (salvaguarda; o bloqueio completo é a US2), atualizar contador e chamar `aoEscreverRecado({ alvo, x, y, texto: valor })`. Enter → fechar o campo e `aoFecharRecado()`; Esc → fechar o campo e `aoApagarRecado()`; `blur` → fechar e `aoFecharRecado()` (sem chamar duas vezes quando Enter/Esc já fecharam); `fullscreenchange` saindo da tela cheia com o campo aberto → como Esc; destaque mudou ou acabou em `atualizar` com o campo aberto → fechar o campo e `aoApagarRecado()`. Função `fecharCampoSeSumiu(lista, idVoce)`: se não há recado com `autor === idVoce` e `aberto: true` depois de o campo ter enviado algo, fechar o campo sem enviar nada (os 8 s venceram ou o compartilhamento acabou)
- [X] T017 [US1] Em `public/js/app.js`, ligar os recados: guardar `ultimosRecados`; `aoReceberRecados(lista)` → `areaTela.mostrarRecados(lista, idProprio)` e `fecharCampoSeSumiu`; chamar `mostrarRecados` também ao fim de `atualizarTela` (destaque pode ter mudado); callbacks de `criarAreaTela`: `aoEscreverRecado(dados)` → `sala.enviar({ tipo: "recado", acao: "escrever", ...dados })`, `aoFecharRecado` → `acao: "fechar"`, `aoApagarRecado` → `acao: "apagar"`; se `sala.enviar` devolver `false`, `mostrarMensagem(TEXTOS.erroEnviarRecado)` e fechar o campo (FR-012)
- [X] T018 [US1] Em `public/estilos.css`: `.destaque` com `position: relative`; `.camada-recados` `position: absolute`, sem capturar cliques (`pointer-events: none`), exceto no campo; `.recado` com fundo escuro semitransparente, texto claro, cantos arredondados, `max-width` ~ 22em, `white-space: pre-wrap`, `overflow-wrap: anywhere`; `.nome-recado` em negrito com margem à direita; `.campo-recado` e `.contador-recado` legíveis sobre o vídeo; `.dica-recado` discreta; também em `.destaque:fullscreen`. Conferir com `npm run format:check`

**Checkpoint**: US1 completa — quickstart passos 3–7 e 11–15 funcionam.

---

## Phase 4: User Story 2 - Limite de 100 caracteres e texto puro (Priority: P2)

**Goal**: o campo não deixa passar de 100 caracteres em nenhuma situação (digitar, segurar tecla,
colar, soltar, substituir seleção), mostra quantos faltam, e todo texto aparece literalmente.

**Independent Test**: quickstart passo 10.

### Tests for User Story 2 ⚠️

- [X] T019 [P] [US2] Acrescentar a `tests/integration/websocket.test.js`: `escrever` com `texto` de 101 caracteres → nenhuma `recados` nova e a conexão continua aberta; com 100 emojis `"👍".repeat(100)` → aceito; com `"<b>oi</b>"` → a lista traz exatamente `"<b>oi</b>"` (o servidor não altera nem escapa o texto); `texto` com `"a\nb"` → a lista traz `"a b"`

### Implementation for User Story 2

- [X] T020 [US2] Em `public/js/area-tela.js`, bloquear o limite **antes** de o texto entrar (research §6, [contracts/ui.md](contracts/ui.md) "Limite"): ouvinte `beforeinput` no campo — para `inputType` que insere texto (`insertText`, `insertReplacementText`, `insertFromPaste`, `insertFromDrop`, `insertLineBreak`), calcular com `selectionStart`/`selectionEnd` e `evento.data` (ou `evento.dataTransfer.getData("text/plain")`); se `contarCaracteres(textoDepoisDaInsercao(...)) > RECADO_MAXIMO`, `preventDefault()`; para colar/soltar, inserir manualmente só `caberNoLimite(...)` com `setRangeText(parte, inicio, fim, "end")` e disparar o mesmo tratamento do `input` (contador + `aoEscreverRecado`); `insertLineBreak` não insere nada (Enter fecha). Manter o corte no `input` como salvaguarda para composição (IME/tecla morta), preservando a posição do cursor. Apagar e mover o cursor nunca são bloqueados
- [X] T021 [US2] Revisar `public/js/area-tela.js` e `public/js/app.js` e garantir que nome e texto de recado são escritos só com `textContent` (nenhum `innerHTML`, `insertAdjacentHTML` ou template de HTML) e que o contador usa `TEXTOS.caracteresRestantes` com 100, 63, 1 e 0 como em US2 cenários 1–2

**Checkpoint**: US2 completa — quickstart passo 10.

---

## Phase 5: User Story 3 - Recado no mesmo ponto da imagem para todos (Priority: P2)

**Goal**: o recado acompanha a imagem em qualquer tamanho de janela, ao redimensionar e na tela
cheia, e nunca sai da área do compartilhamento.

**Independent Test**: quickstart passo 9.

### Tests for User Story 3 ⚠️

- [X] T022 [P] [US3] Acrescentar a `tests/unit/posicao-recado.test.js` casos de proporções extremas: vídeo 2560×1080 (ultrawide) em caixa 4:3, vídeo 1080×1920 (janela estreita) em caixa 16:9, e um ponto perto do canto inferior direito cuja caixa de 200×40 px é empurrada por `encaixarNaArea` para dentro sem mudar o ponto indicado

### Implementation for User Story 3

- [X] T023 [US3] Em `public/js/area-tela.js`, reposicionar a camada e os recados quando a área da imagem muda: `ResizeObserver` no contêiner `destaque`, evento `resize` do `<video>` (mudança de resolução, T06) e `fullscreenchange` → recalcular `areaDaImagem` e redesenhar os recados atuais (incluindo o campo aberto) com `pixelNaArea`; cada caixa de recado é medida depois de inserida e ajustada com `encaixarNaArea` para ficar inteira dentro da área (FR-007). Parar de observar quando o destaque some

**Checkpoint**: US3 completa — quickstart passo 9.

---

## Phase 6: User Story 4 - Quem compartilha também escreve e vê os recados (Priority: P3)

**Goal**: quem compartilha vê a própria tela no destaque/miniaturas (sem som, legenda "(você)") e
escreve e vê recados sobre ela. Altera a T05 FR-004.

**Independent Test**: quickstart passos 2 e 8.

### Tests for User Story 4 ⚠️

- [X] T024 [P] [US4] Atualizar `tests/unit/destaque.test.js`: trocar o teste "a própria tela nunca aparece para quem compartilha" por "a própria tela aparece para quem compartilha" — `escolherDestaque([pessoa("a", { inicio: 1, som: true }), pessoa("b", null)], "a", null)` → `destaque: { id: "a", nome: "A", som: true, inicio: 1, propria: true }`; nos demais itens `propria: false`; com A (inicio 2) e B (inicio 1) compartilhando e `idVoce = "a"`, a própria tela fica em destaque por ser a mais recente e B vira miniatura; com escolha `"b"`, B fica em destaque e a própria vira miniatura. Ajustar os outros testes do arquivo para o novo campo `propria`
- [X] T025 [P] [US4] Acrescentar a `tests/unit/midia.test.js` (navegador falso existente): depois de `compartilharTela`, `telaDe(meuId).video` é um `<video>` com `muted === true` e `srcObject` contendo só a trilha de vídeo capturada (sem a trilha de som da tela); depois de `pararCompartilhamento`, `telaDe(meuId).video === null`; `telaDe(idDeOutro)` continua devolvendo o vídeo recebido

### Implementation for User Story 4

- [X] T026 [US4] Em `public/js/destaque.js`, parar de filtrar `id !== idVoce` e incluir `propria: id === idVoce` em cada item; atualizar o comentário do topo (T07 altera FR-004 da T05). Fazer T024 passar
- [X] T027 [US4] Em `public/js/midia.js`, prévia da própria tela: ao capturar em `compartilharTela`, criar `previaTela = criarVideoCom(new MediaStream([trilhaTela]))` (mudo, só vídeo — o próprio som não volta); limpar `srcObject` e anular em `pararCompartilhamento`/`encerrar`; `telaDe(id)` devolve `{ video: previaTela }` quando `id === meuId`. Fazer T025 passar
- [X] T028 [US4] Em `public/js/area-tela.js`, `rotulo(item)` e a miniatura acrescentam `TEXTOS.marcaVoceTela` quando `item.propria` (ex.: `Ana (você)`); a própria tela em destaque recebe a mesma camada de recados, campo e dica que as outras. Em `public/js/app.js`, confirmar que `assistindo` com o próprio id é enviado normalmente (o servidor aceita qualquer texto) e que nenhuma conexão é criada consigo mesmo (`enviaTelaPara` em `midia.js` já compara com os pares)

**Checkpoint**: US4 completa — quickstart passos 2 e 8.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T029 [P] Atualizar `README.md`: um parágrafo em pt-BR sobre os recados (aperte `/` sobre a tela compartilhada, aparece ao vivo para todos, some 8 s depois, até 100 caracteres) e que quem compartilha agora vê a própria tela
- [X] T030 [P] Atualizar o comentário de contratos no topo de `src/servidor.js` (`atenderConexao`) e de `public/js/area-tela.js` para citar `specs/007-recado-na-tela/contracts/websocket.md` e `contracts/ui.md`
- [X] T031 Rodar `npm test` e `npm run format:check`; corrigir o que falhar
- [ ] T032 Executar o roteiro manual completo do [quickstart.md](quickstart.md) (passos 1–15) em Chrome e Firefox, incluindo teclado ABNT2 para o `/`, e registrar qualquer divergência

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup; bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da Phase 2. É o MVP.
- **US2 (Phase 4)**: depende da US1 (o campo existe em `area-tela.js`).
- **US3 (Phase 5)**: depende da US1 (camada e desenho dos recados). Independente da US2.
- **US4 (Phase 6)**: testes e `destaque.js`/`midia.js` podem começar logo após a Phase 2; T028
  depende da US1 (camada e campo). Independente da US2 e da US3.
- **Polish (Phase 7)**: depois das histórias desejadas.

### Within Each Phase

- Testes primeiro, falhando; depois a implementação que os faz passar.
- US1: T011 → T012 (servidor usa o registro); T013 antes de T016; T014 e T015 antes de T017;
  T015 → T016 (mesmo arquivo); T018 a qualquer momento depois de T015.
- `public/js/area-tela.js` é tocado por T015, T016, T020, T021, T023 e T028: não paralelizar entre si.

### Parallel Opportunities

- Phase 2: T002, T003 e T005 em paralelo; T004 e T006 em paralelo depois dos seus testes.
- US1: T007/T008 (mesmo arquivo, juntos), T009 e T010 em paralelo; T011 e T013 em paralelo.
- US4: T024 e T025 em paralelo; T026 e T027 em paralelo.
- Polish: T029 e T030 em paralelo.

---

## Parallel Example: User Story 1

```text
# Testes da US1, em paralelo:
T007+T008  tests/unit/salas.test.js
T009       tests/unit/atalho-recado.test.js
T010       tests/integration/websocket.test.js

# Depois, em paralelo:
T011  src/salas.js
T013  public/js/atalho-recado.js
T014  public/js/app.js (conectar/enviar)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2.
2. Phase 3 (US1): recados ao vivo, 8 s, Enter/Esc, atalho `/` — já com limite de 100 garantido
   pelo corte no `input` e pelo servidor.
3. **Parar e validar**: quickstart passos 3–7 e 11–15 com duas pessoas.

### Incremental Delivery

1. US1 → recados funcionando para quem assiste (MVP).
2. US2 → bloqueio do 101º caractere sem piscar, colar parcial.
3. US3 → posição estável ao redimensionar/tela cheia e caixas dentro da imagem.
4. US4 → quem compartilha vê a própria tela e escreve.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefas incompletas.
- Nada de recados vai para disco ou `localStorage`.
- Commits por tarefa ou grupo lógico; `npm test` verde ao fim de cada fase.
