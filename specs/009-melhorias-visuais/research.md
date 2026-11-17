# Pesquisa: T09 · Melhorias visuais (vermelho e preto)

Decisões técnicas para cumprir a [spec](spec.md) com o menor número de partes móveis
(Constituição, Princípio I). Nenhuma dependência nova.

## 1. Paleta e tokens de cor

- **Decision**: variáveis CSS (`--cor-…`) declaradas em `:root` no topo de `estilos.css`, usadas por
  todo o arquivo. Tema escuro único (`color-scheme: dark`). Valores:

  | Token | Valor | Uso | Contraste |
  |-------|-------|-----|-----------|
  | `--fundo` | `#0b0b0d` | fundo da página | — |
  | `--brilho` | `radial-gradient(ellipse 80% 60% at 50% -10%, #5c0a17 0%, #2a050b 35%, transparent 70%)` | brilho vinho vindo do topo (Clarifications) | — |
  | `--superficie` | `#151518` | cartões, lista, quadros | — |
  | `--superficie-alta` | `#1f1f24` | botões secundários, campos, barra de controles | — |
  | `--borda` | `rgb(255 255 255 / 8%)` | contornos | — |
  | `--texto` | `#f4f4f5` | texto principal | 18,1:1 sobre `--fundo` |
  | `--texto-suave` | `#a1a1aa` | textos secundários | 7,7:1 sobre `--fundo`; 6,8:1 sobre `--superficie-alta` |
  | `--vermelho` | `#dc2626` | botão principal, controle ligado, destaques | 4,8:1 com texto branco |
  | `--vermelho-forte` | `#b91c1c` | hover/clique do botão principal | 6,5:1 com texto branco |
  | `--vermelho-claro` | `#f87171` | nome no recado, ícones de destaque sobre escuro | 6,6:1 sobre `--fundo` |
  | `--degrade-principal` | `linear-gradient(135deg, #dc2626, #991b1b 60%, #450a0a)` | botão principal, avatar (ver §7) | texto branco ≥ 4,8:1 em todo o degradê (ponto mais claro = `--vermelho`) |
  | `--sucesso` | `#22c55e` | ícone/borda de sucesso | 3:1+ como ícone |
  | `--foco` | `#ffffff` | anel de foco (`outline` com `outline-offset: 2px`) | visível sobre escuro e sobre vermelho |

- **Rationale**: tokens num só lugar garantem a consistência (FR-001) e tornam a verificação de
  contraste (SC-002) uma tabela, não uma caça no CSS. O vermelho vivo fica nos destaques; o brilho é
  vinho escuro sobre quase-preto (Clarifications). Tons mais claros que `#dc2626` (ex.: `#ef4444`,
  3,8:1 com branco) nunca ficam atrás de texto; por isso o degradê do botão começa em `--vermelho` e
  o hover escurece (`--vermelho-forte`) em vez de clarear, ganhando brilho com sombra vermelha
  (`box-shadow`), não com cor de fundo mais clara.
- **Alternatives considered**: tema claro/escuro com alternância (fora do escopo: só tema escuro);
  pré-processador CSS (dependência sem necessidade); vermelho forte ocupando o fundo (rejeitado nas
  Clarifications).

## 2. Ícones

- **Decision**: um módulo `public/js/icones.js` com um objeto `ICONES` (nome → lista de elementos
  SVG, como dados) e uma função `criarIcone(nome)` que monta um `<svg>` 24×24, `fill="none"`,
  `stroke="currentColor"`, `stroke-width="2"`, `stroke-linecap/linejoin="round"`,
  `aria-hidden="true"`. Os desenhos vêm do conjunto **Lucide** (licença ISC, permissiva), copiados
  para o arquivo com o aviso de licença no topo. Conjunto necessário:

  `microfone`, `microfone-desligado`, `camera`, `camera-desligada`, `monitor` (compartilhar),
  `monitor-parar` (parar), `tela-cheia`, `qualidade` (controles deslizantes), `copiar`,
  `som` (ativar som), `coroa` (anfitrião), `usuarios` (lista), `alerta` (erro), `sucesso` (check),
  `seta-direita` (entrar/criar), `recarregar` (tentar de novo), `carregando` (círculo parcial que
  gira).

- **Rationale**: um único conjunto com o mesmo traço garante FR-004/SC-003; `currentColor` faz o
  ícone herdar a cor do botão (estados ligado/desligado sem CSS extra). Ícones como dados em JS não
  exigem mudar o servidor (que só serve `.html`, `.js`, `.css`) nem baixar nada de fora, e a lista de
  nomes é testável (todo nome usado existe). `aria-hidden` evita leitura duplicada (US2 cenário 5).
- **Alternatives considered**: emojis atuais (🎤 📷 🖥️ — aparência muda por sistema e não têm
  versão "desligada", o que hoje exige um risco feito em CSS); fonte de ícones (arquivo binário,
  tipo de conteúdo novo no servidor, ícones ilegíveis se a fonte falha); arquivo `icones.svg` com
  `<use>` (exige `.svg` no servidor e um pedido a mais); biblioteca Lucide via npm/CDN (dependência
  e serviço externo para ~17 desenhos).

## 3. Logo, cabeçalho e título

- **Decision**: o cabeçalho (`<header class="cabecalho">`) fica **estático em `index.html`**, com o
  logo como SVG embutido (uma tela de monitor com um "play"/ponto de transmissão, traço igual ao dos
  ícones, preenchida com o degradê vermelho) e o texto "Telão". O `<title>` passa a "Telão" e o ícone
  da aba usa o mesmo SVG como `data:` URI em `<link rel="icon">`. A frase de apresentação vai para
  `TEXTOS.fraseApresentacao` e é montada por `mostrarTelaInicio`. Na tela cheia o cabeçalho não
  aparece naturalmente (só o elemento `.destaque` vai para tela cheia).
- **Rationale**: estático = aparece antes do JS, sem "piscar" (edge case de carregamento) e sem
  mudança no servidor. O título da aba e o cabeçalho são o nome do site, não textos de fluxo, por
  isso podem ficar no HTML (o `<title>` já ficava lá).
- **Alternatives considered**: montar o cabeçalho em JS (aparece depois, um texto a mais em
  `TEXTOS` sem ganho); arquivo `logo.svg` separado (exige `.svg` no servidor).

## 4. Controles só com ícone e dicas

- **Decision**: os controles da sala (microfone, câmera, compartilhar, qualidade, tela cheia) passam
  a conter só `criarIcone(...)`; o nome vai para `aria-label` (atualizado a cada mudança de estado,
  com os textos atuais de `TEXTOS`). A dica é um pseudo-elemento CSS com
  `content: attr(aria-label)`, exibido em `:hover` e `:focus-visible` com fade de 150 ms — uma só
  fonte para leitor de tela e dica. `title` é removido desses botões para não haver dica dupla.
  "Ativar som" fica na barra com ícone **e** texto visível (é um pedido de ação que a pessoa
  precisa notar, não um controle de uso contínuo).
- **Qualidade (`<select>`)**: o `<select>` atual é mantido (lógica da T06 inalterada) dentro de um
  invólucro `.controle-qualidade` que mostra o ícone `qualidade`; o `<select>` fica por cima,
  transparente (`opacity: 0`, ocupando o invólucro), então o clique abre o menu nativo do
  navegador. A dica usa `data-dica` no invólucro e aparece com `:hover` / `:focus-within`. A
  qualidade ativa continua escrita abaixo da imagem (`.qualidade-ativa`, T06).
- **Rationale**: Clarifications (só ícone, sempre) + FR-006 (nome em dica e para leitor de tela) com
  o mínimo de código; `title` nativo não aparece com foco de teclado, a dica CSS sim.
- **Alternatives considered**: menu de qualidade próprio (reescreveria a T06); biblioteca de
  tooltips (dependência).

## 5. Animações e fluidez

- **Decision**: só CSS (transições e `@keyframes`), animando apenas `opacity` e `transform`
  (propriedades que o navegador anima sem recalcular layout). Tokens de movimento:
  `--rapido: 150ms`, `--medio: 250ms`, `--lento: 400ms`, curva `--suave: cubic-bezier(.2,.8,.2,1)`.

  | Onde | Animação | Duração |
  |------|----------|---------|
  | Botões e controles | cor/fundo/sombra no hover, `scale(.96)` no clique | 150 ms |
  | Troca de tela (`main` mostrado ou conteúdo trocado) | `aparecer`: opacidade 0→1 + `translateY(8px)`→0 | 300 ms |
  | Quadro na grade entra / sai | `aparecer` / `sumir` (opacidade + `scale(.96)`) | 250 ms |
  | Vídeo ↔ avatar no mesmo quadro | cross-fade de opacidade | 250 ms |
  | Item da lista entra / sai | `aparecer` / `sumir` | 250 ms |
  | Mensagem (toast) aparece / some | opacidade + `translateY(-8px)` | 250 ms |
  | Dica de controle | opacidade | 150 ms |
  | Carregando | ícone `carregando` girando (`rotate`) | 800 ms por volta, contínuo |
  | Recado (T08) | inalterado: deslize 100 ms linear e fade de 1 s | — |

- **Reaproveitar elementos por `id`**: hoje `mostrarQuadros` e a lista de participantes recriam
  todos os elementos a cada atualização da lista; uma animação de entrada repetiria em todos a cada
  mudança de microfone. Os dois passam a manter um `Map` id → elemento (como a camada de recados
  da T08): elemento novo recebe a animação de entrada; elemento que sai recebe a classe `saindo` e é
  removido no `animationend` (com `setTimeout` de segurança de 400 ms, para não ficar preso se a
  animação não rodar); os demais só são atualizados no lugar.
- **Movimento reduzido**: um bloco `@media (prefers-reduced-motion: reduce)` zera as durações de
  deslocamento/escala e mantém só opacidades curtas (FR-010). O deslize do recado (T08) também vira
  instantâneo; o fade de 1 s do recado é mantido (é opacidade, não movimento).
- **Sem saltos de layout (FR-012)**: a área de mensagem (`#mensagem`) vira um aviso flutuante
  (`position: fixed`, topo central), fora do fluxo da página; o espaço do botão não muda quando o
  texto troca de "Ligar microfone" para "Ligando microfone…" (só ícone).
- **Desempenho (FR-011/SC-005)**: nada de `backdrop-filter` (desfoque) sobre vídeo — a barra de
  controles usa fundo quase opaco; sombras grandes ficam só em elementos que não animam; nenhum
  laço de animação em JS.
- **Rationale**: CSS resolve tudo o que a spec pede sem biblioteca; animar só `opacity`/`transform`
  é o que mantém a interface fluida ao lado de 6 vídeos.
- **Alternatives considered**: View Transitions API (suporte desigual entre navegadores e captura a
  página inteira, inclusive vídeos, a cada troca — desnecessário para transições tão simples);
  biblioteca de animação (dependência); animar `height`/`width` (recalcula layout a cada quadro).

## 6. Estado de carregamento

- **Decision**: `criarBotaoDispositivo` troca o ícone pelo ícone `carregando` (girando) e o
  `aria-label` pelo texto de espera atual (`ligandoMicrofone`, `ligandoCamera`,
  `escolhendoCompartilhamento`) enquanto espera. Os botões com texto ("Criar sala") recebem a classe
  `carregando`, que mostra o mesmo ícone girando antes do texto ("Criando sala…").
- **Rationale**: FR-009 com o mesmo ícone em todo lugar.

## 7. Avatar para câmera desligada (FR-017, altera a T04)

- **Decision**: `quadrosDeVideo` passa a devolver **todos** os participantes, na ordem da lista,
  com o campo novo `cameraLigada`; `falhou` só vale com câmera ligada. Uma função pura nova,
  `inicialDoNome(nome)`, devolve o primeiro grafema visível do nome (via `Intl.Segmenter`, para não
  partir emoji ou letras acentuadas compostas) em maiúscula. `mostrarQuadros` mostra o `<video>`
  quando `cameraLigada` e há vídeo, a mensagem de falha quando `falhou`, e o avatar (círculo com a
  inicial sobre `--degrade-principal`) nos demais casos; o nome continua na legenda do quadro.
- **Imagem some em até 3 s**: continua valendo o fluxo da T04 — ao desligar, a própria prévia é
  descartada na hora e os outros recebem a lista nova do servidor com `camera: false`; a diferença é
  que o quadro troca para o avatar em vez de ser removido. O `<video>` reaproveitado é tirado do
  quadro (não só escondido), então nenhuma imagem antiga fica visível.
- **Rationale**: a regra "quem tem quadro" é lógica da sala (Princípio III) e já tem testes em
  `quadros.test.js`, que são atualizados para a regra nova (SC-009 permite).
- **Alternatives considered**: esconder o `<video>` com CSS em vez de removê-lo (risco de mostrar o
  último quadro congelado); avatar com cor diferente por pessoa (fora da paleta; o nome já
  diferencia).

## 8. Layout da sala

- **Decision**: CSS Grid na `#tela-sala` com áreas nomeadas:
  - **≥ 1024 px**: topo (título, aviso de anfitrião, link + copiar) ocupando a largura; palco à
    esquerda (destaque, miniaturas, qualidade ativa) e coluna lateral de 20 rem à direita (grade de
    câmeras em uma coluna + lista de participantes). Largura máxima da sala 90 rem; páginas sem
    sala (início, nome, erros) continuam num cartão central de até 32 rem.
  - **< 1024 px**: tudo empilhado (topo, palco, câmeras em grade de 2 colunas, lista).
  - **< 480 px**: câmeras em 1 coluna; link quebra em duas linhas.
  - Barra de controles **fixa no rodapé, centralizada** (estilo chamada de vídeo), com
    `padding-bottom` na página do tamanho da barra para nada ficar escondido atrás dela.
- **Rationale**: FR-013/SC-007 com uma só folha de estilos e sem JS de layout; a barra no rodapé
  segue o padrão que as pessoas já conhecem de chamadas de vídeo.
- **Alternatives considered**: barra no topo (como hoje) — briga com o cabeçalho e o link;
  layout calculado em JS (desnecessário).

## 9. Mensagens (erro × sucesso)

- **Decision**: `mostrarMensagem(texto, { temporaria })` passa a marcar `#mensagem` com
  `data-tipo="sucesso"` quando `temporaria` (hoje só confirmações como "Link copiado!" são
  temporárias) e `data-tipo="erro"` nos demais casos, e a inserir o ícone correspondente
  (`sucesso` / `alerta`) antes do texto. Sem texto, o aviso fica invisível (opacidade 0 e
  `visibility: hidden` após a transição).
- **Rationale**: diferencia erro de sucesso por ícone e borda, não só pela cor (US1 cenário 6),
  sem mudar nenhuma chamada existente.
- **Alternatives considered**: passar o tipo em cada chamada (mexe em ~20 chamadas para chegar ao
  mesmo resultado).

## 10. Testes

- **Decision**: testes unitários novos para `icones.js` (todo nome usado no código existe; todo
  ícone tem pelo menos um elemento de desenho) e `inicialDoNome`; `quadros.test.js` atualizado para
  a regra nova (FR-017, SC-010). Estilos e animações são verificados pelo roteiro de
  [quickstart.md](quickstart.md) (Constituição, Princípio III permite). `estaticos.test.js` ganha
  uma verificação de que a página traz o cabeçalho com "Telão".
- **Rationale**: Princípio III — a lógica alterada (quem tem quadro) é testada; o resto é
  apresentação.
