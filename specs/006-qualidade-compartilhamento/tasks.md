---

description: "Task list for T06 · Escolher a qualidade do compartilhamento"
---

# Tasks: T06 · Escolher a qualidade do compartilhamento

**Input**: Design documents from `/specs/006-qualidade-compartilhamento/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Incluídos (constituição, Princípio III). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro. Resolução e quadros por segundo reais são conferidos nas
estatísticas do navegador, no roteiro manual do [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md). **Nada muda em `src/`.**

**Regras gerais**: estender o código existente (não reescrever do zero). Todo texto visível vem de
`public/js/textos.js` com os textos exatos de [contracts/ui.md](contracts/ui.md). Valores e regras
em [data-model.md](data-model.md); decisões em [research.md](research.md). Os testes de `midia.js`
ampliam o navegador falso de `tests/unit/midia.test.js` (conexão que nunca dispara `track`). Após
cada fase, `npm test` deve passar. Reinicie o servidor antes de qualquer teste manual.

### API do módulo de mídia (`public/js/midia.js`) — acréscimos

```text
compartilharTela(qualidade = qualidadePorId())  → Promise<{ som }>; captura com restricoesDeCaptura(qualidade)
mudarQualidade(qualidade)  → Promise<void>; applyConstraints na trilha em uso (sem nova captura) e
                             parâmetros de envio para quem assiste; rejeita se applyConstraints falhar
                             (a qualidade ativa continua a anterior)
qualidadeAtiva()           → { qualidade, largura, altura } | null   // largura/altura de getSettings()
```

---

## Phase 1: Setup

- [X] T001 Rodar `npm test` na raiz e confirmar que os 171 testes da T01–T05 passam antes de qualquer mudança (linha de base)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Textos e o módulo puro de qualidades — usados por todas as histórias.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Acrescentar a `public/js/textos.js` os textos de [contracts/ui.md](contracts/ui.md): `qualidadeDoCompartilhamento: "Qualidade do compartilhamento"`, `qualidadeAtiva: (descricao) => \`Qualidade: ${descricao}\``, `limitadaPelaTela: " (limitada pelo tamanho da tela)"`, `erroQualidade: "Não foi possível usar essa qualidade. O compartilhamento continua na qualidade anterior."`; citar `specs/006-qualidade-compartilhamento/contracts/ui.md` no comentário do topo
- [X] T003 [P] Criar `tests/unit/qualidades.test.js` para o módulo de [data-model.md](data-model.md): `QUALIDADES` tem exatamente os ids `"720p30"`, `"1080p30"`, `"1080p60"` nessa ordem, com nomes `"720p · 30 fps"`, `"1080p · 30 fps"`, `"1080p · 60 fps"`, `largura`/`altura` 1280×720, 1920×1080, 1920×1080, `qps` 30, 30, 60 e `taxaMaxima` 2 500 000, 4 000 000, 6 000 000; `QUALIDADE_PADRAO === "1080p30"`; `qualidadePorId("1080p60").qps === 60`; `qualidadePorId("xyz")`, `qualidadePorId(undefined)` e `qualidadePorId(null)` → a padrão; `restricoesDeCaptura(q)` → `{ width: { max }, height: { max }, frameRate: { ideal: qps, max: qps } }`; `parametrosDeEnvio({ encodings: [{ active: true }], outro: 1 }, q)` → mantém `outro` e `active`, põe `degradationPreference: "maintain-framerate"` e em `encodings[0]` `maxFramerate: qps`, `maxBitrate: taxaMaxima`, `scaleResolutionDownBy: 1`, sem alterar o objeto recebido; `parametrosDeEnvio({ encodings: [] }, q)` devolve os parâmetros sem mudança nos encodings; `descreverQualidadeAtiva(1080p30, { largura: 1920, altura: 1080 })` → `"Qualidade: 1080p · 30 fps"`; ultrawide `{ largura: 1920, altura: 804 }` → normal; `{ largura: 1366, altura: 768 }` → `"Qualidade: 1366×768 · 30 fps (limitada pelo tamanho da tela)"`; sem largura/altura (`{}`) → normal
- [X] T004 Criar `public/js/qualidades.js` (módulo ES puro) exportando `QUALIDADES`, `QUALIDADE_PADRAO`, `qualidadePorId`, `restricoesDeCaptura`, `parametrosDeEnvio` e `descreverQualidadeAtiva` exatamente como em [data-model.md](data-model.md) (limitada quando `largura < q.largura && altura < q.altura`; textos de `TEXTOS`). Fazer T003 passar

**Checkpoint**: `npm test` passa (T01–T05 + qualidades).

---

## Phase 3: User Story 1 - Escolher a qualidade antes de compartilhar (Priority: P1) 🎯 MVP

**Goal**: Seletor com as três qualidades (padrão 1080p · 30 fps, lembrando a última); o
compartilhamento começa na qualidade escolhida, que limita de fato a resolução e os qps enviados.

**Independent Test**: Passos 1–4 e 9 do [quickstart.md](quickstart.md).

### Tests for User Story 1 ⚠️

- [X] T005 [US1] Ampliar o navegador falso de `tests/unit/midia.test.js`: `TrilhaFalsa` ganha `restricoes`, `applyConstraints(r)` (guarda e resolve; pode ser configurada para rejeitar), `getSettings()` (devolve `{ width, height }` configuráveis), `addEventListener`, `stop()` e `contentHint`; `TransceptorFalso.sender` ganha `getParameters()` (devolve `{ encodings: [{}] }` ou o último `setParameters`) e `setParameters(p)` (guarda e resolve) e passa a guardar a trilha de `replaceTrack`; instalar `globalThis.navigator = { mediaDevices: { getDisplayMedia(opcoes) } }` que registra as opções recebidas e devolve um `FluxoFalso` com uma trilha de vídeo (restaurar em `afterEach`). Novos testes: `compartilharTela(qualidadePorId("720p30"))` chama `getDisplayMedia` com `video` igual a `restricoesDeCaptura` da 720p; `compartilharTela()` sem argumento usa a padrão (1080p30); com a lista dizendo que "b" assiste ao meu compartilhamento (`assistindo === meuId`), o canal `telaVideo` do par de "b" recebe `setParameters` com `maxFramerate`/`maxBitrate` da qualidade e `degradationPreference: "maintain-framerate"`; `qualidadeAtiva()` devolve a qualidade e `largura`/`altura` de `getSettings()`, e `null` depois de `pararCompartilhamento()`

### Implementation for User Story 1

- [X] T006 [US1] Em `public/js/midia.js` ([research.md](research.md) §1, §3): `OPCOES_TELA.video` deixa de ter `frameRate` fixo; `compartilharTela(qualidade = qualidadePorId())` passa `{ ...OPCOES_TELA, video: restricoesDeCaptura(qualidade) }` a `getDisplayMedia` e guarda `qualidadeTela`; nova função `aplicarParametrosDeEnvio(par)` que, se o par está recebendo a tela (`par.enviandoTela.telaVideo` não nulo), faz `sender.setParameters(parametrosDeEnvio(sender.getParameters(), qualidadeTela))` no canal `telaVideo`, ignorando erros (`catch`); chamá-la em `aplicarEnvioTela` sempre que a trilha da tela passa a ir para um par, e no `connectionstatechange` quando o estado vira `connected` (a negociação pode não ter terminado antes); exportar `qualidadeAtiva()`; `pararCompartilhamento()` zera `qualidadeTela`. Fazer T005 passar
- [X] T007 [US1] Em `public/js/app.js`: criar o `<select class="qualidade">` com uma `<option>` por item de `QUALIDADES` (`value` = id, texto = nome), `aria-label` e `title` = `TEXTOS.qualidadeDoCompartilhamento`, logo depois de `tela.botao` na `linha-link`; valor inicial = `qualidadePorId(lerArmazenado("qualidadeCompartilhamento")).id`; ao mudar sem compartilhar, `salvarArmazenado("qualidadeCompartilhamento", id)`; oculto (`hidden`) quando `podeCompartilhar` é falso (FR-010); o botão de compartilhar chama `midia.compartilharTela(qualidadePorId(seletor.value))` e, ao começar com sucesso, salva a preferência
- [X] T008 [P] [US1] Em `public/estilos.css`: `.qualidade` com a mesma fonte, altura, borda e raio dos botões da `linha-link`

**Checkpoint**: `npm test` passa; passos 1–4 e 9 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 4: User Story 2 - Trocar a qualidade durante o compartilhamento (Priority: P2)

**Goal**: Trocar a qualidade sem parar, sem nova escolha de tela e sem interromper quem assiste;
a nova qualidade vale em ≤ 5 s, inclusive para quem começa a assistir depois.

**Independent Test**: Passos 5, 7 e 8 do [quickstart.md](quickstart.md).

### Tests for User Story 2 ⚠️

- [X] T009 [US2] Acrescentar a `tests/unit/midia.test.js`: durante um compartilhamento, `mudarQualidade(qualidadePorId("1080p60"))` chama `applyConstraints` da trilha em uso com `restricoesDeCaptura` da 1080p60, **não** chama `getDisplayMedia` de novo, não troca a trilha enviada (`replaceTrack` não recebe outra trilha) e aplica `setParameters` com `maxFramerate: 60` a quem assiste; `qualidadeAtiva().qualidade.id === "1080p60"`; com `applyConstraints` configurado para rejeitar, `mudarQualidade` rejeita e `qualidadeAtiva().qualidade` continua a anterior, sem novo `setParameters`; depois de uma troca, um par que **passa** a assistir (nova lista com `assistindo === meuId`) recebe `setParameters` da qualidade atual; `mudarQualidade` sem compartilhar não faz nada e resolve

### Implementation for User Story 2

- [X] T010 [US2] Em `public/js/midia.js`, `mudarQualidade(qualidade)` ([research.md](research.md) §1, §4): sem `trilhaTela`, resolver sem fazer nada; senão `await trilhaTela.applyConstraints(restricoesDeCaptura(qualidade))` (se rejeitar, deixar a rejeição subir sem mudar `qualidadeTela`); depois `qualidadeTela = qualidade` e `aplicarParametrosDeEnvio(par)` para todos os pares. Exportar. Fazer T009 passar
- [X] T011 [US2] Em `public/js/app.js`, ao mudar o seletor **enquanto compartilha**: desabilitar o seletor, `await midia.mudarQualidade(qualidadePorId(id))`; sucesso → salvar a preferência e re-renderizar a área da tela; falha → `mostrarMensagem(TEXTOS.erroQualidade)` e voltar o seletor para `midia.qualidadeAtiva().qualidade.id`; em ambos, reabilitar o seletor (FR-006, FR-008). Trocas seguidas: como o seletor fica desabilitado durante a troca, vale a última aplicada

**Checkpoint**: `npm test` passa; passos 5, 7 e 8 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 5: User Story 3 - Ver qual qualidade está ativa (Priority: P3)

**Goal**: "Qualidade: …" junto do aviso de compartilhamento, com a resolução real e "(limitada pelo
tamanho da tela)" quando a tela é menor que a qualidade.

**Independent Test**: Passos 2, 5 e 6 do [quickstart.md](quickstart.md).

### Tests for User Story 3 ⚠️

- [X] T012 [P] [US3] Acrescentar a `tests/unit/reproducao-video.test.js` (DOM falso já existente) um teste de `criarAreaTela`: `atualizar({ destaque: null, miniaturas: [], compartilhando: true, qualidade: "Qualidade: 720p · 30 fps" }, ...)` mostra um elemento `.qualidade-ativa` com esse texto junto do aviso; sem `qualidade` (ou `compartilhando: false`), o elemento não aparece

### Implementation for User Story 3

- [X] T013 [US3] Em `public/js/area-tela.js`, aceitar `qualidade` (texto pronto) no estado de `atualizar`: quando `compartilhando` e `qualidade` existem, mostrar `<p class="qualidade-ativa">` com o texto logo depois do aviso "Você está compartilhando sua tela". Fazer T012 passar
- [X] T014 [US3] Em `public/js/app.js`, em `atualizarTela`, calcular o texto com `descreverQualidadeAtiva(ativa.qualidade, { largura: ativa.largura, altura: ativa.altura })` a partir de `midia.qualidadeAtiva()` (quando houver) e passá-lo como `qualidade` para `areaTela.atualizar`; re-renderizar ao começar a compartilhar e após cada troca de qualidade (FR-007)
- [X] T015 [P] [US3] Em `public/estilos.css`: `.qualidade-ativa` centralizado, discreto (`margin: 0; color: #57606a; font-size: 0.9rem`)

**Checkpoint**: `npm test` passa; passos 2, 5 e 6 do [quickstart.md](quickstart.md) funcionam.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 [P] Atualizar `README.md`: mencionar a escolha de qualidade (720p · 30 fps, 1080p · 30 fps, 1080p · 60 fps), que pode ser trocada durante o compartilhamento
- [X] T017 [P] Revisar `public/`: nenhum `frameRate` fixo restante em `OPCOES_TELA`; todo texto visível vem de `public/js/textos.js`; sem `console.log` de depuração; números de qualidade só em `public/js/qualidades.js`
- [X] T018 Rodar `npm run format`, `npm run format:check` e `npm test`, corrigindo o que falhar
- [ ] T019 Reiniciar o servidor e executar os passos 1–10 do [quickstart.md](quickstart.md), conferindo resolução e qps nas estatísticas do navegador, e registrar o resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2)** → **US1 (3)** → **US2 (4)** → **US3 (5)** → **Polish (6)**
- US2 depende de `compartilharTela(q)` e do seletor da US1; US3 depende de `qualidadeAtiva()` (US1)
  e da troca (US2) para atualizar o texto. As três mexem em `midia.js`/`app.js`: em sequência

### Within Each Phase

- Testes antes da implementação; T003 → T004; T005 → T006 → T007; T009 → T010 → T011; T012 → T013 → T014

### Parallel Opportunities

- Phase 2: T002 em paralelo com T003
- US1: T008 em paralelo com T005–T007
- US3: T012 e T015 em paralelo
- Polish: T016 e T017

## Parallel Example: User Story 1

```bash
Task: "tests/unit/midia.test.js"   # T005 (depois T006, T007 em sequência)
Task: "public/estilos.css"         # T008
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phases 1–2 → 2. Phase 3 (US1) → 3. **Validar**: `npm test` + passos 1–4 e 9 do quickstart

### Incremental Delivery

1. US1 → escolher a qualidade antes de compartilhar (MVP)
2. US2 → trocar durante o compartilhamento
3. US3 → ver a qualidade ativa
4. Polish → revisão, formatação, roteiro completo com estatísticas

## Notes

- Esta tarefa altera código da T05 (`OPCOES_TELA`, `compartilharTela`, área da tela); os testes da
  T05 continuam valendo
- Fazer commit após cada fase
