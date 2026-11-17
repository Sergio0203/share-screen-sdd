# Modelo de dados: T09 · Melhorias visuais

Nenhum dado novo no servidor nem nas mensagens WebSocket. As estruturas abaixo vivem só no
navegador e são derivadas do que já existe.

## Quadro (altera a T04)

Saída de `quadrosDeVideo(lista, idVoce, idsComFalha)` em `public/js/quadros.js`.

| Campo | Tipo | Origem / regra |
|-------|------|----------------|
| `id` | string | id do participante |
| `nome` | string | nome do participante |
| `rotulo` | string | `nome` + `TEXTOS.marcaVoce` se for você (inalterado) |
| `ehVoce` | boolean | `id === idVoce` (inalterado) |
| `cameraLigada` | boolean | **novo**: `camera === true` na lista do servidor |
| `falhou` | boolean | **muda**: `cameraLigada && !ehVoce && idsComFalha.has(id)` |
| `inicial` | string | **novo**: `inicialDoNome(nome)` |

Regras:

- **Muda**: há exatamente um quadro por participante da lista, na ordem da lista (antes, só quem
  tinha câmera ligada). Ninguém na lista → nenhum quadro.
- O que o quadro mostra:

  | Situação | Conteúdo |
  |----------|----------|
  | `cameraLigada` e vídeo disponível e não `falhou` | `<video>` (reaproveitado, como hoje) |
  | `cameraLigada` e `falhou` | mensagem `naoFoiPossivelMostrarVideo(nome)` (inalterado) |
  | `cameraLigada` e vídeo ainda não chegou | avatar (até o vídeo chegar) |
  | câmera desligada | avatar |

- Transições do quadro: `novo → visível` (animação de entrada), `vídeo ↔ avatar` (cross-fade, o
  `<video>` é retirado do quadro ao virar avatar), `visível → saindo → removido` (participante saiu
  da lista).

## `inicialDoNome(nome)`

- Devolve o primeiro grafema do nome já normalizado (T02), em maiúscula (`toLocaleUpperCase("pt-BR")`).
- Usa segmentação por grafema, então "Élia" → "É", "🎮 Léo" → "🎮", "ñandu" → "Ñ".
- Nome vazio (não deveria acontecer, T02 impede) → `"?"`.

## Ícone

`ICONES` em `public/js/icones.js`: objeto `nome → [elemento, atributos]…` (ex.:
`["path", { d: "…" }]`, `["circle", { cx, cy, r }]`). `criarIcone(nome)` devolve um `<svg>` com os
atributos fixos da research §2. Nome inexistente é erro de programação (lança `Error`), coberto por
teste que verifica todos os nomes usados.

## Item da lista de participantes (apresentação)

Mesmos campos de `rotularParticipantes` (T03/T04); `app.js` acrescenta só a escolha do ícone:

| Indicador | Ícone | Rótulo (inalterado) |
|-----------|-------|---------------------|
| microfone | `microfone` / `microfone-desligado` | `rotuloMicrofone` |
| câmera | `camera` / `camera-desligada` | `rotuloCamera` |
| anfitrião | `coroa` ao lado do nome (decorativo; o texto " · anfitrião" continua) | — |
| compartilhando | `monitor` quando `tela` existe na lista (decorativo; a miniatura já anuncia) | — |

Itens são reaproveitados por `id` (entrada/saída animadas).

## Mensagem (aviso flutuante)

| Campo | Valor |
|-------|-------|
| texto | igual a hoje |
| tipo | `sucesso` quando `temporaria`, senão `erro` (`data-tipo` em `#mensagem`) |
| ícone | `sucesso` / `alerta` |
