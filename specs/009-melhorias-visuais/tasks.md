---

description: "Task list for T09 · Melhorias visuais (vermelho e preto)"
---

# Tasks: T09 · Melhorias visuais (vermelho e preto)

**Input**: Design documents from `/specs/009-melhorias-visuais/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui.md, quickstart.md

**Tests**: Incluídos só para a lógica (constituição, Princípio III): `icones.js`, `inicialDoNome`,
a regra nova de `quadrosDeVideo` (FR-017) e o cabeçalho servido na página. Estilos e animações são
conferidos no roteiro manual do [quickstart.md](quickstart.md). Em cada fase, os testes vêm antes da
implementação e devem falhar primeiro.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único: `src/`, `public/`, `tests/`. Ver [plan.md](plan.md). O servidor (`src/`) **não muda**.

**Regras gerais**: só aparência — nenhum texto existente de `public/js/textos.js` muda e nenhum
comportamento de T01–T08 muda, exceto FR-017 (avatar, altera a T04) e FR-018 (cabeçalho e frase).
Decisões em [research.md](research.md) (citadas como "research §N"); aparência por elemento em
[contracts/ui.md](contracts/ui.md); campos e regras em [data-model.md](data-model.md). Nomes e textos
de usuário continuam **sempre** via `textContent`. Toda cor vem de uma variável CSS de research §1;
toda duração vem de `--rapido`/`--medio`/`--lento`; só se animam `opacity` e `transform`; nada de
`backdrop-filter` sobre vídeo. Após cada fase, `npm test` e `npm run format:check` devem passar.

### Constantes (research §1, §5)

```text
--fundo #0b0b0d   --superficie #151518   --superficie-alta #1f1f24   --borda rgb(255 255 255 / 8%)
--texto #f4f4f5   --texto-suave #a1a1aa
--vermelho #dc2626   --vermelho-forte #b91c1c   --vermelho-claro #f87171   --sucesso #22c55e   --foco #ffffff
--brilho radial-gradient(ellipse 80% 60% at 50% -10%, #5c0a17 0%, #2a050b 35%, transparent 70%)
--degrade-principal linear-gradient(135deg, #dc2626, #991b1b 60%, #450a0a)
--rapido 150ms   --medio 250ms   --lento 400ms   --suave cubic-bezier(.2, .8, .2, 1)
@keyframes aparecer: opacity 0→1, translateY(8px)→0        (troca de tela: 300ms)
@keyframes surgir:   opacity 0→1, scale(.96)→1             (quadro / item de lista: --medio)
@keyframes sumir:    opacity 1→0, scale(1)→.96             (quadro / item saindo: --medio)
@keyframes girar:    rotate(0)→rotate(360deg)              (ícone carregando: 800ms linear infinite)
Tempo de segurança para remover elemento `saindo`: 400 ms
```

### Nomes de ícones (research §2) — exatamente estes

```text
microfone, microfone-desligado, camera, camera-desligada, monitor, monitor-parar, tela-cheia,
qualidade, copiar, som, coroa, usuarios, alerta, sucesso, seta-direita, recarregar, carregando
```

Desenhos do Lucide (ISC): mic, mic-off, video, video-off, monitor, monitor-off, maximize,
sliders-horizontal, copy, volume-2, crown, users, circle-alert, circle-check, arrow-right,
rotate-ccw, loader-circle — copiados como dados, com o aviso de licença ISC no topo do arquivo.

### APIs novas / alteradas

```text
public/js/icones.js
  ICONES: { [nome]: Array<[tag: "path"|"circle"|"rect"|"line"|"polyline", atributos: object]> }
  criarIcone(nome) → SVGSVGElement   // 24×24, viewBox "0 0 24 24", fill none, stroke currentColor,
                                     // stroke-width 2, linecap/linejoin round, aria-hidden "true",
                                     // classe "icone"; nome inexistente → throw Error
public/js/quadros.js
  quadrosDeVideo(lista, idVoce, idsComFalha)
    → [{ id, nome, rotulo, ehVoce, cameraLigada, falhou, inicial }]   // TODOS os participantes
  inicialDoNome(nome) → string   // 1º grafema (Intl.Segmenter "pt-BR", granularity "grapheme"),
                                 // toLocaleUpperCase("pt-BR"); vazio → "?"
public/js/textos.js
  fraseApresentacao: "Compartilhe sua tela com os amigos, com voz e câmera."
```

---

## Phase 1: Setup

**Purpose**: confirmar o ponto de partida.

- [X] T001 Rodar `npm test` e `npm run format:check` na raiz e confirmar que tudo passa antes de qualquer mudança (linha de base para SC-009)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: tokens de estilo e conjunto de ícones usados por todas as histórias.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T002 [P] Criar `tests/unit/icones.test.js` com `node:test`: (a) `ICONES` tem exatamente os 17 nomes da lista "Nomes de ícones"; (b) cada ícone tem pelo menos um elemento e cada elemento é `[tag, atributos]` com `tag` em `path|circle|rect|line|polyline`; (c) todo nome passado a `criarIcone("…")` em `public/js/*.js` existe em `ICONES` (ler os arquivos com `fs`, extrair com a regex `/criarIcone\("([a-z-]+)"\)/g`). Não testar `criarIcone` em si (precisa de DOM). Deve falhar (módulo inexistente)
- [X] T003 [P] Criar `public/js/icones.js`: aviso de licença ISC do Lucide no topo; `export const ICONES` com os 17 nomes e os desenhos Lucide indicados em "Nomes de ícones"; `export function criarIcone(nome)` que lança `Error(\`Ícone desconhecido: ${nome}\`)` se o nome não existir e, senão, cria com `document.createElementNS("http://www.w3.org/2000/svg", …)` o `<svg>` com os atributos fixos de "APIs novas" e os filhos de `ICONES[nome]`. Fazer T002 passar
- [X] T004 [P] Reescrever o topo de `public/estilos.css`: bloco `:root` com `color-scheme: dark` e todas as variáveis de "Constantes"; `html { background: var(--fundo) }`; `body` com `background: var(--brilho), var(--fundo)` fixo no topo (`background-attachment: fixed`), `color: var(--texto)`, fonte `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; os 4 `@keyframes` de "Constantes"; classe `.icone { width: 1.25em; height: 1.25em; flex: none; vertical-align: middle }`; `:focus-visible { outline: 2px solid var(--foco); outline-offset: 2px }`; e um bloco `@media (prefers-reduced-motion: reduce)` vazio no **fim** do arquivo, marcado com comentário, para as fases seguintes preencherem. Não apagar ainda as regras antigas abaixo (são substituídas nas fases seguintes)

**Checkpoint**: `npm test` passa com `icones.test.js`; o site ainda funciona (aparência mista).

---

## Phase 3: User Story 1 - Identidade visual vermelho e preto (Priority: P1) 🎯 MVP

**Goal**: todas as telas com fundo quase preto e brilho vinho, cabeçalho "Telão", frase na página
inicial, botões principais vermelhos, mensagens de erro/sucesso distintas e avatar para câmera
desligada.

**Independent Test**: quickstart passos 1, 2, 3 e 6 — todas as telas na nova paleta, sem azul nem
cinza claro; contraste conferido; todos os participantes com quadro (vídeo ou avatar).

### Tests for User Story 1

- [X] T005 [P] [US1] Atualizar `tests/unit/quadros.test.js` para FR-017 (data-model "Quadro"): substituir "só quem está com a câmera ligada tem quadro" por "todos os participantes têm quadro, na ordem da lista" (`["a","b","c"]`); atualizar o teste "(você)" para os 3 quadros com `cameraLigada` e `inicial` (`"A"`, `"B"`, `"C"`); `falhou` só com câmera ligada (`b` com câmera desligada em `idsComFalha` → `falhou: false`); "sem câmeras ligadas" vira "câmera desligada gera quadro sem vídeo" (`cameraLigada: false`); lista vazia → `[]`. Adicionar testes de `inicialDoNome`: `"ana"`→`"A"`, `"Élia"`→`"É"`, `"🎮 Léo"`→`"🎮"`, `"ñandu"`→`"Ñ"`, `""`→`"?"`. Deve falhar
- [X] T006 [P] [US1] Em `tests/integration/estaticos.test.js`, adicionar teste: `GET /` devolve HTML contendo `<title>Telão</title>` e um `<header class="cabecalho">` com o texto `Telão`. Deve falhar

### Implementation for User Story 1

- [X] T007 [P] [US1] Em `public/js/quadros.js`: remover o filtro por câmera; cada item passa a ter `cameraLigada: camera === true`, `falhou: cameraLigada && !ehVoce && comFalha.has(id)` e `inicial: inicialDoNome(nome)`; exportar `inicialDoNome` conforme "APIs novas"; atualizar o comentário do topo citando FR-017 da T09 (altera FR-006/FR-008 da T04). Fazer T005 passar
- [X] T008 [P] [US1] Em `public/index.html`: `<title>Telão</title>`; `<meta name="color-scheme" content="dark">`; `<meta name="theme-color" content="#0b0b0d">`; `<link rel="icon">` com o logo como `data:image/svg+xml,…` (URL-encoded); antes dos `<main>`, `<header class="cabecalho">` com o logo SVG embutido (monitor arredondado com um ponto/onda de transmissão, traço 2 igual aos ícones, preenchimento com `<linearGradient>` de `#dc2626` a `#7f1d1d`, `aria-hidden="true"`) e `<span class="marca">Telão</span>`. Fazer T006 passar
- [X] T009 [P] [US1] Em `public/js/textos.js`, adicionar `fraseApresentacao: "Compartilhe sua tela com os amigos, com voz e câmera."` no bloco "Página inicial" e citar `specs/009-melhorias-visuais/contracts/ui.md` no comentário do topo
- [X] T010 [US1] Em `public/js/app.js` `mostrarTelaInicio`: adicionar `criarElemento("p", { className: "frase-apresentacao", textContent: TEXTOS.fraseApresentacao })` antes do rótulo do nome. Em `mostrarMensagem`/`limparMensagem`: definir `areaMensagem.dataset.tipo = temporaria ? "sucesso" : "erro"` e montar o conteúdo como `[criarIcone(temporaria ? "sucesso" : "alerta"), criarElemento("span", { textContent: texto })]` (research §9); limpar = `replaceChildren()` e remover `data-tipo`; `limparMensagemSeFor` passa a comparar com o texto do `span` (guardar o texto atual numa variável `textoMensagemAtual`). Importar `criarIcone`
- [X] T011 [US1] Em `public/js/area-videos.js` `mostrarQuadros`: usar `cameraLigada`/`falhou`/`inicial` (data-model "Quadro" — tabela "O que o quadro mostra"); quando não há vídeo a mostrar e não `falhou`, o conteúdo é `criarElemento("div", { className: "avatar" }, [criarElemento("span", { className: "inicial", textContent: inicial })])` com `aria-hidden="true"` (a legenda já dá o nome); o `<video>` só entra no quadro quando `cameraLigada` (se a câmera desligou, o `<video>` não é anexado, então nenhuma imagem antiga fica visível); mensagem de falha ganha `criarIcone("alerta")` antes do texto. Em `public/js/app.js`, remover o comentário de `aoMudar` da câmera que diz que o quadro some (agora vira avatar) — **Feito com ajuste**: além de `area-videos.js`, o DOM falso de `tests/unit/reproducao-video.test.js` ganhou `createElementNS`, `classList` real, `prepend` e `textContent` calculado, e os testes de câmera passaram a seguir FR-017 (quadro continua com avatar; vídeo sai do quadro e volta tocando).
- [X] T012 [US1] Em `public/estilos.css`, substituir as regras antigas de página, cartão, textos, campos e botões por: `.cabecalho` (flex, gap .6rem, padding 1rem 1.5rem, logo 2rem, `.marca` 1.25rem peso 700 com `letter-spacing: -.01em`); `main` das telas sem sala como cartão central (`max-width: 32rem`, fundo `--superficie`, borda `--borda`, raio 1rem, sombra `0 20px 60px rgb(0 0 0 / 50%)`, padding 2rem); `.frase-apresentacao` (`--texto-suave`, 1.05rem, centralizada); `h1` 1.6rem peso 700; `label` `--texto-suave`; `input` (fundo `--superficie-alta`, borda `--borda`, raio .6rem, cor `--texto`, foco com borda `--vermelho` e sombra `0 0 0 3px rgb(220 38 38 / 25%)`); `button` base secundário (fundo `--superficie-alta`, borda `--borda`, cor `--texto`, raio .6rem, `display: inline-flex; align-items: center; gap: .5rem`); `.principal`/`.destaque` (fundo `--degrade-principal`, sem borda, texto branco peso 600, sombra `0 8px 24px rgb(220 38 38 / 30%)`; hover `--vermelho-forte` sem clarear); `button:disabled` (opacidade .4, `cursor: not-allowed`; com `.carregando` cursor `wait`); `.anfitriao`, `.sem-suporte`, `.qualidade-ativa`, `.aviso-compartilhando` em `--texto-suave` (aviso de compartilhamento com ícone/cor `--vermelho-claro`). Remover todo azul (`#1f6feb`, `#9ecbff`), verde (`#1a7f37`) e fundos claros (`#fff`, `#f5f6f8`) restantes
- [X] T013 [US1] Em `public/estilos.css`: `#mensagem` como aviso flutuante (`position: fixed; top: 1rem; left: 50%; transform: translateX(-50%)`, `max-width: min(36rem, calc(100% - 2rem))`, flex com gap .6rem, fundo `--superficie-alta`, borda 1px, raio .8rem, sombra, `z-index: 50`); vazio (`:empty`) → `opacity: 0; visibility: hidden; pointer-events: none`; `[data-tipo="erro"]` borda `--vermelho` e ícone `--vermelho-claro`; `[data-tipo="sucesso"]` borda e ícone `--sucesso`. Quadros: `.quadro` fundo `--superficie`, raio .8rem, borda `--borda`; `.avatar` (100% × 100%, flex central, fundo `--superficie`); `.avatar .inicial` (círculo de `min(40%, 6rem)` com `aspect-ratio: 1`, fundo `--degrade-principal`, texto branco 2rem peso 700, sombra vermelha suave); legenda e `.falha-video` com cor `--texto`. Destaque: `.destaque` fundo `#000` sem degradê (FR-014). Recados (contracts/ui.md "Recados"): `.recado`/`.caixa-campo-recado` fundo `rgb(21 21 24 / 92%)`, borda `--borda`, raio .6rem; `.nome-recado` `--vermelho-claro`; `.campo-recado` fundo `--superficie-alta`, cor `--texto`, borda `--borda` e `--vermelho` no foco; `.contador-recado` e `.dica-recado` `--texto-suave` — **sem tocar** em `transition`, `transform`, `will-change` nem `.apagando` (T08)

**Checkpoint**: US1 completa — quickstart 1, 2, 3 e 6 passam; `npm test` passa.

---

## Phase 4: User Story 2 - Ícones consistentes nas ações (Priority: P1)

**Goal**: todos os botões e indicadores com ícones do mesmo conjunto; controles da sala só com
ícone, nome em `aria-label` e dica no hover/foco; ícones mudam com o estado.

**Independent Test**: quickstart passo 4 — cada controle com ícone e dica (mouse e Tab), ícone muda
ao ligar/desligar, leitor de tela anuncia uma vez em pt-BR, lista com os mesmos ícones.

### Implementation for User Story 2

- [X] T014 [US2] Em `public/js/app.js` `criarBotaoDispositivo`: receber `icones: { desligado, ligado }` (microfone: `microfone-desligado`/`microfone`; câmera: `camera-desligada`/`camera`; compartilhar: `monitor`/`monitor-parar`); `mostrarEstado` faz `botao.replaceChildren(criarIcone(ligado ? icones.ligado : icones.desligado))` e `botao.setAttribute("aria-label", ligado ? textos.desligar : textos.ligar)` em vez de `textContent`; adicionar a classe `controle` ao botão; manter `aria-pressed`. Passar `icones` nas 3 chamadas (`MICROFONE`, `CAMERA`, `TELA`). Não usar `title` (research §4)
- [X] T015 [US2] Em `public/js/app.js` `criarSeletorQualidade`: devolver um invólucro `criarElemento("div", { className: "controle controle-qualidade", hidden: !visivel }, [criarIcone("qualidade"), seletor])` com `dataset.dica = TEXTOS.qualidadeDoCompartilhamento`; o `<select>` mantém `aria-label` e perde `title` e `hidden`; o resto de `mostrarTelaSala` continua usando o `<select>` (expor `{ invólucro, seletor }` e ajustar as referências: `.value`, `.disabled`, listener `change` no seletor; o invólucro vai para a linha de controles)
- [X] T016 [US2] Em `public/js/app.js` `mostrarTelaSala`: "Copiar link" com `[criarIcone("copiar"), TEXTOS.copiarLink]` como filhos; "Ativar som" com `[criarIcone("som"), criarElemento("span", { textContent: TEXTOS.ativarSom })]` e classe `principal ativar-som`. Separar a linha atual em duas: `.linha-link` (campo do link + copiar) e `nav.barra-controles` com `aria-label` = `TEXTOS.tituloSala` contendo microfone, câmera, compartilhar, invólucro de qualidade e "Ativar som" (contracts/ui.md "Controles da sala"). Em `mostrarTelaInicio`/`mostrarTelaNome`: botões principais com `[TEXTOS.criarSala|entrarNaSala, criarIcone("seta-direita")]`; em `mostrarSalaInexistente`, `mostrarSalaCheia` e `mostrarErroComNovaTentativa`: `[criarIcone("recarregar"), texto]`. Em `criarSala`, trocar o texto do botão sem perder o ícone (atualizar só o nó de texto, guardado numa variável)
- [X] T017 [US2] Em `public/js/app.js` `aoReceberLista` e `criarIndicador`: `criarIndicador(nomeIcone, ligado, { classe, rotulo })` passa a conter `criarIcone(nomeIcone)` (o `span` mantém `role="img"`, `aria-label` e `title` com o rótulo; o `svg` já é `aria-hidden`); microfone `microfone`/`microfone-desligado`, câmera `camera`/`camera-desligada`; após o texto do nome, `criarIcone("coroa")` com classe `marca-anfitriao` se `item.ehAnfitriao`, e `criarIcone("monitor")` com classe `marca-tela` se o participante da lista tem `tela` (usar `participantes[i].tela`); o título da lista ganha `criarIcone("usuarios")` antes do texto (o texto continua sendo atualizado em um `span` próprio)
- [X] T018 [P] [US2] Em `public/js/area-tela.js`: botão de tela cheia com `criarIcone("tela-cheia")` como único filho, `aria-label` = `TEXTOS.telaCheia`, classe `botao-tela-cheia controle` (sem `textContent`); `criarMiniatura` com filhos `[criarIcone("monitor"), criarElemento("span", { textContent: rotulo(item) })]` no lugar do emoji `🖥️` (mantém `title` e `aria-label`); `.aviso-compartilhando` com `criarIcone("monitor")` antes do texto. Importar `criarIcone`
- [X] T019 [US2] Em `public/estilos.css`: `.controle` (botão quadrado 3rem × 3rem, raio .9rem, ícone 1.35rem, `position: relative`, fundo `--superficie-alta`); `.controle[aria-pressed="true"]` fundo `--vermelho` e cor branca; dica: `.controle[aria-label]::after { content: attr(aria-label) }` e `.controle-qualidade::after { content: attr(data-dica) }` posicionadas acima (`bottom: calc(100% + .5rem)`, centralizadas, fundo `#000`, cor `--texto`, .8rem, raio .4rem, `white-space: nowrap`, `pointer-events: none`, `opacity: 0`), visíveis em `:hover`, `:focus-visible` e (qualidade) `:focus-within`; `.controle-qualidade select` cobre o invólucro com `position: absolute; inset: 0; opacity: 0; cursor: pointer`; `.botao-tela-cheia` fundo `rgb(0 0 0 / 60%)` cor branca com dica **abaixo** (`top: calc(100% + .5rem)`); `.indicador-microfone`/`.indicador-camera` em `--texto-suave`, `.ligado` em `--texto`; remover o risco diagonal antigo `.indicador-camera:not(.ligado)::after` (o ícone `camera-desligada` já é cortado); `.marca-anfitriao` e `.marca-tela` em `--vermelho-claro` (mantém a paleta); `.miniatura` inline-flex com gap .4rem; `#lista-participantes` fundo `--superficie`, borda `--borda`, raio .8rem, itens com `display: flex; align-items: center; gap: .5rem` e separador `--borda`

**Checkpoint**: US1 + US2 — quickstart 1–4 e 6 passam; nenhum emoji de ícone restante (`grep -n "🎤\|🔇\|📷\|🖥️" public/js` vazio).

---

## Phase 5: User Story 3 - Navegação fluida com animações suaves (Priority: P2)

**Goal**: retorno visual animado em todo clicável, troca de tela animada, entrada/saída de quadros
e itens da lista sem repetir animação, mensagens com fade, carregamento girando, movimento reduzido.

**Independent Test**: quickstart passos 5, 7, 8 e 9.

### Implementation for User Story 3

- [X] T020 [US3] Em `public/js/app.js` `criarBotaoDispositivo`: no estado de espera, `botao.replaceChildren(criarIcone("carregando"))`, `aria-label` = `textos.ligando`, classe `carregando` (removida em `mostrarEstado`). Em `criarSala`: adicionar a classe `carregando` e inserir `criarIcone("carregando")` como primeiro filho enquanto `Criando sala…`; remover ambos na falha (FR-009)
- [X] T021 [US3] Em `public/js/area-videos.js`, reaproveitar quadros por `id` (research §5): manter um `Map` id → `{ figura, legenda, conteudo }` no escopo do módulo (exportar `limparQuadros()` para `encerrarMidia`/troca de sala zerar o mapa, e chamá-lo em `public/js/app.js`); quadro novo recebe a classe `entrando` (removida no `animationend`); quadro que sumiu da lista recebe `saindo` e é removido no `animationend` ou após 400 ms (o que vier antes) — nunca duas vezes; quadros existentes só atualizam legenda e conteúdo; ao trocar vídeo ↔ avatar, o conteúdo novo entra com a classe `trocando` (fade de opacidade `--medio`); a ordem dos filhos segue a ordem da lista (reordenar com `append` só se mudou). `retomarVideos` continua sendo chamado com os vídeos visíveis — **Feito com ajuste**: o mapa de quadros fica num `WeakMap` por área (em vez de um `Map` de módulo + `limparQuadros()`), então trocar de sala não exige limpeza manual. Entrada/saída/ordem vivem em `public/js/entrada-saida.js` (novo), compartilhado com T022.
- [X] T022 [US3] Em `public/js/app.js` `aoReceberLista`, reaproveitar os `li` da lista por `id` com a mesma regra de T021 (`entrando` / `saindo` + remoção em `animationend` ou 400 ms); itens existentes só têm indicadores e texto trocados. Em `mostrarNaSala` e `mostrarTelaInicio`, reiniciar a animação de entrada do `main` mostrado (`classList.remove("aparecendo")`, ler `offsetWidth`, `classList.add("aparecendo")`) — só quando o conteúdo do `main` é trocado
- [X] T023 [US3] Em `public/estilos.css`: transições `background-color, color, box-shadow, opacity, transform` em `var(--rapido) var(--suave)` em `button`, `.controle`, `input`, `select`, `.miniatura`; `button:active:not(:disabled) { transform: scale(.96) }`; `main.aparecendo { animation: aparecer 300ms var(--suave) }`; `.entrando { animation: surgir var(--medio) var(--suave) }`; `.saindo { animation: sumir var(--medio) var(--suave) forwards; pointer-events: none }`; `.trocando { animation: surgir var(--medio) var(--suave) }` (só opacidade: sobrescrever com keyframe próprio `revelar` 0→1 se a escala atrapalhar o vídeo); `.carregando .icone` com `animation: girar 800ms linear infinite`; `#mensagem` com `transition: opacity var(--medio) var(--suave), transform var(--medio) var(--suave), visibility 0s linear var(--medio)` e `:empty` com `transform: translate(-50%, -8px)` (visibilidade volta sem atraso quando há texto); dicas dos controles com `transition: opacity var(--rapido)`; `.ativar-som` com pulso suave de `box-shadow` (keyframe `pulsar`, 1,6 s, infinito); `.linha-link .destaque` com o mesmo pulso
- [X] T024 [US3] Preencher o bloco `@media (prefers-reduced-motion: reduce)` no fim de `public/estilos.css` (FR-010): `*, *::before, *::after { animation-duration: 1ms !important; animation-iteration-count: 1 !important; transition-duration: var(--rapido) !important; transition-property: opacity, color, background-color, border-color, visibility !important }`; `.carregando .icone` mantém giro lento (2 s) por ser indicador de estado, não decoração; `button:active { transform: none }`; `.recado` com `transition-property: opacity !important` (deslize da T08 vira instantâneo) e `.recado.apagando` mantendo `opacity 1s linear` (fade da T08 preservado)

**Checkpoint**: US1–US3 — quickstart 5, 7, 8 e 9 passam; ligar o microfone de alguém não reanima os outros quadros nem itens.

---

## Phase 6: User Story 4 - Layout organizado em qualquer tamanho de janela (Priority: P3)

**Goal**: sala em áreas (topo, palco, lateral, barra fixa no rodapé) que se reorganizam de 360 px a
1920 px sem sobreposição nem rolagem horizontal.

**Independent Test**: quickstart passo 10.

### Implementation for User Story 4

- [X] T025 [US4] Em `public/js/app.js` `mostrarTelaSala`: agrupar os elementos em `div.sala-topo` (título, aviso de anfitrião, `.linha-link`, aviso sem suporte), `div.sala-palco` (`areaTela.elemento`), `aside.sala-lateral` (`areaVideos`, título da lista, lista) e `nav.barra-controles`; chamar `mostrarNaSala(topo, palco, lateral, barra)` e marcar `telaSala.classList.add("sala")` (remover a classe em telas sem sala: `mostrarNaSala` recebe `{ sala: true }` só daqui). Nenhuma ordem de leitura muda para o leitor de tela além da barra no fim
- [X] T026 [US4] Em `public/estilos.css` (contracts/ui.md "Sala — áreas"; research §8): `main.sala` sem cartão, `max-width: 90rem`, `display: grid; gap: 1.25rem`, áreas `"topo" "palco" "lateral"`; `@media (min-width: 1024px)` → `grid-template-columns: minmax(0, 1fr) 20rem` com áreas `"topo topo" "palco lateral"`, `#area-videos` em 1 coluna; entre 480 e 1023 px `#area-videos` em 2 colunas; abaixo de 480 px 1 coluna e `.linha-link` empilhada; `.barra-controles` `position: fixed; bottom: 1rem; left: 50%; transform: translateX(-50%)`, flex com gap .5rem, padding .5rem, fundo `rgb(21 21 24 / 96%)` (sem `backdrop-filter`), borda `--borda`, raio 1.2rem, sombra `0 12px 40px rgb(0 0 0 / 60%)`, `z-index: 40`, `max-width: calc(100% - 1rem)`, `flex-wrap: wrap; justify-content: center`; `main.sala` com `padding-bottom: 6rem` para nada ficar atrás da barra; `body` sem padding horizontal que gere rolagem (`overflow-x: clip` no `body` como garantia); `#area-videos`, `.destaque`, `.miniaturas` com `min-width: 0`; `.destaque:fullscreen` mantém só imagem e recados (sem raio, sem borda) — **Feito com ajustes vistos no navegador**: o destaque é limitado pela altura da janela para caber inteiro acima da barra; a barra é centralizada com `left/right: 0` + `margin-inline: auto` (com `left: 50%` ela quebrava cedo); sem ninguém compartilhando, a lateral ocupa a largura toda (`:has()`).
- [X] T027 [US4] Verificar no modo responsivo do navegador as larguras 360, 480, 768, 1024, 1440 e 1920 px com compartilhamento + 6 quadros: nenhum elemento sobreposto, sem rolagem horizontal, barra visível e sem cobrir o fim da lista; ajustar `public/estilos.css` onde falhar (SC-007) — Conferido em navegador headless a 360, 768, 1280 e 1440 px: sem rolagem horizontal; corrigidos o campo do link empilhado (<480 px) e a quebra da barra.

**Checkpoint**: todas as histórias completas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T028 [P] Conferir que nenhuma cor fora das variáveis restou em `public/estilos.css` (`grep -nE "#[0-9a-fA-F]{3,6}\b" public/estilos.css` só deve achar o bloco `:root` e `#000` do destaque/dica) e que nenhum texto existente de `public/js/textos.js` mudou (`git diff public/js/textos.js` só com `fraseApresentacao` e o comentário)
- [X] T029 [P] Conferir contraste (quickstart passo 3, SC-002) de texto principal, texto suave, botão principal, dicas, legendas, mensagens e nome do recado; corrigir valores fora do mínimo em `public/estilos.css` e atualizar a tabela de research §1 se algum valor mudar em `specs/009-melhorias-visuais/research.md` — Todos os pares de research §1 passam (menor: branco sobre `--vermelho`, 4,83:1; texto suave sobre o brilho mais forte, 5,42:1). Cores literais restantes viraram variáveis (`--branco`, `--vinho`).
- [ ] T030 Executar o roteiro completo de `specs/009-melhorias-visuais/quickstart.md` (passos 1–11), incluindo o roteiro da T08 sobre imagem clara e escura (FR-015), e corrigir o que falhar — **Parcial**: verificado automaticamente em Chrome headless (identidade, telas de erro, aviso de erro, ícones e dica por teclado, avatar, compartilhamento, recado seguindo o cursor com o novo estilo, reaproveitamento de quadros/itens, movimento reduzido, larguras, quadros longos iguais ao código anterior). **Falta, manual**: leitor de tela (VoiceOver), Slow 3G no "Criar sala", 6 janelas com câmeras reais, recado sobre imagem clara, tela cheia.
- [X] T031 Rodar `npm run format` e depois `npm test` e `npm run format:check`; tudo deve passar (SC-009)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → histórias.
- **US1 (Phase 3)**: depende só da Phase 2. É o MVP.
- **US2 (Phase 4)**: depende da Phase 2; na prática, depois da US1, porque T014–T017 editam
  `public/js/app.js` e T019 edita `public/estilos.css`, os mesmos arquivos de T010–T013.
- **US3 (Phase 5)**: depende da US2 (o ícone `carregando` substitui os ícones de estado de T014;
  T021 reescreve o `mostrarQuadros` de T011).
- **US4 (Phase 6)**: depende da US2 (agrupa a `nav.barra-controles` criada em T016).
- **Polish (Phase 7)**: depois de todas.

### Within Each User Story

- Testes (T005, T006) antes da implementação, falhando primeiro.
- Tarefas no mesmo arquivo em sequência: `public/js/app.js` (T010 → T014 → T015 → T016 → T017 →
  T020 → T022 → T025) e `public/estilos.css` (T004 → T012 → T013 → T019 → T023 → T024 → T026).

### Parallel Opportunities

- Phase 2: T002, T003 e T004 (arquivos diferentes).
- US1: T005, T006, T007, T008 e T009 (arquivos diferentes); depois T010, T011 e T012 em sequência
  ou T011 em paralelo com T010 (arquivos diferentes; T011 só toca um comentário de `app.js` — fazer
  esse trecho depois de T010).
- US2: T018 (`area-tela.js`) em paralelo com T014–T017 (`app.js`).
- Polish: T028 e T029.

---

## Parallel Example: User Story 1

```text
# Testes e arquivos independentes juntos:
Task: "T005 Atualizar tests/unit/quadros.test.js para FR-017 e inicialDoNome"
Task: "T006 Teste de cabeçalho Telão em tests/integration/estaticos.test.js"
Task: "T007 quadrosDeVideo com todos os participantes + inicialDoNome em public/js/quadros.js"
Task: "T008 Cabeçalho, título e ícone da aba em public/index.html"
Task: "T009 fraseApresentacao em public/js/textos.js"
```

## Parallel Example: User Story 2

```text
Task: "T018 Tela cheia e miniaturas com ícones em public/js/area-tela.js"
# em paralelo com a sequência em public/js/app.js:
Task: "T014 → T015 → T016 → T017"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2.
2. Phase 3 (US1): nova paleta, cabeçalho, frase, mensagens e avatar.
3. **Parar e validar**: quickstart 1, 2, 3 e 6; `npm test`.

### Incremental Delivery

1. US1 → site já com a nova identidade (MVP).
2. US2 → ícones e barra de controles só com ícone.
3. US3 → animações e fluidez (critérios "fluidez" e "smooth animations").
4. US4 → layout em áreas e responsivo.
5. Polish → contraste, roteiro completo, formatação.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- Commit ao fim de cada fase.
- Não mexer em `src/` nem no protocolo WebSocket.
- Não mudar `transition`/`transform` dos recados fora do bloco de movimento reduzido (T08).
