# Research: T08 · O recado segue o cursor e some sozinho

Nenhum item da Technical Context ficou em aberto. Tudo da
[research da T07](../007-recado-na-tela/research.md) continua valendo, exceto onde indicado abaixo.

## §1 Como a posição chega aos outros: ação `mover` no WebSocket, no máximo a cada 50 ms

- **Decision**: enquanto a pessoa tem recado (campo aberto e já enviado) e o ponteiro se move sobre
  a imagem, o navegador envia `{ tipo: "recado", acao: "mover", x, y }`, no máximo uma vez a cada
  50 ms e só se o ponto mudou. O último ponto do intervalo nunca se perde: se o ponteiro para no meio
  de um intervalo, a posição final é enviada quando ele termina. O servidor atualiza `x`/`y` e envia
  a lista `recados` inteira, como em qualquer mudança. `mover` não reinicia a contagem de 8 s (só
  teclas reiniciam, FR-006).
- **Rationale**: o WebSocket já leva o texto ao vivo; 20 posições/s bastam para um movimento
  contínuo quando combinadas com a transição do §2. No pior caso (6 pessoas, todas movendo), são
  120 listas/s de poucos KB para cada pessoa — insignificante perto do vídeo. Manter a lista inteira
  evita um segundo formato de mensagem. A regra "enviar agora?" fica numa função pura
  (`devoEnviarPosicao`), testável.
- **Alternatives considered**: enviar a cada `pointermove` (até 120+/s em mouses rápidos, sem ganho
  visível); mensagem só com `{ id, x, y }` (um formato a mais para manter, ganho irrelevante nesta
  escala); canal de dados WebRTC (rejeitado na T07 §1 pelos mesmos motivos).

## §2 Movimento contínuo e fade: transição CSS em elementos reaproveitados

- **Decision**: cada recado na camada passa a ser um elemento mantido por `id` (criado quando o
  recado aparece, atualizado depois, removido quando some), em vez de recriar todos a cada lista. A
  posição é aplicada com `transform: translate(...)` e uma transição `transform 100ms linear`; o
  fade é `opacity 1s linear` ligado pela classe `apagando`.
- **Rationale**: com posições chegando a cada ~50 ms, uma transição de 100 ms emenda um trecho no
  outro e o recado desliza sem saltos (FR-003), com atraso total bem abaixo de 0,5 s (envio ≤ 50 ms
  + rede + 100 ms). Recriar o elemento cortaria a transição. Transição CSS não precisa de laço de
  animação nem de cálculo de interpolação (Princípio I).
- **Mudança de tamanho** (janela, tela cheia): a posição em pixels muda e o recado também desliza
  para o lugar novo em 100 ms — aceitável e sem efeito no ponto final.
- **Alternatives considered**: interpolação própria com `requestAnimationFrame` (mais código para o
  mesmo resultado); transição longa (≥ 300 ms) — fica "atrasado" demais em relação à voz.

## §3 O próprio campo segue o ponteiro localmente

- **Decision**: o campo de quem escreve é reposicionado direto a cada `pointermove` sobre a imagem
  (sem esperar o servidor e sem transição), usando o mesmo `pontoNaImagem` da T07. Fora da imagem,
  `pontoNaImagem` é `null` e o campo fica no último ponto (clarificação 1, FR-004). Nada é enviado
  enquanto o campo ainda está vazio e nunca foi enviado (cenário US1-3); o primeiro `escrever` leva o
  ponto atual.
- **Rationale**: a pessoa precisa sentir o campo "preso" ao cursor (SC-001); ir e voltar ao servidor
  daria atraso visível. A posição local e a enviada são o mesmo ponto relativo, então todos convergem.

## §4 Fases do recado no servidor: visível → apagando → removido

- **Decision**: o temporizador do recado (`vence`) passa a ter duas etapas: 8 s após a última tecla,
  o recado ganha `apagando: true` e a lista é enviada; 1 s depois, é removido. Um `escrever` em
  qualquer etapa volta a `apagando: false` e reagenda os 8 s. `apagar` (Esc) remove na hora.
- **Rationale**: um único relógio garante que todos começam e terminam o fade juntos (SC-004) e que
  "tecla no fade" funciona igual para todos. O registro já recebe `agendar`/`cancelar` por injeção,
  então os testes controlam o tempo.
- **Quem entra durante o fade** recebe `apagando: true` e vê o recado sumir no tempo que resta da
  transição (o elemento já nasce com a classe e, por isso, desaparece rápido) — aceitável, pois o
  recado está acabando.
- **Alternatives considered**: cada navegador contar o fade sozinho (relógios desencontrados; a
  tecla no fade exigiria avisar todos de novo de qualquer forma).

## §5 Campo ativo enquanto o recado vive (clarificações 2 e 3)

- **Decision**:
  - A ação `fechar` e o campo `aberto` são removidos: um recado existe se e somente se o campo de
    quem escreve está aberto. O campo fecha quando o próprio recado some da lista (fim do fade,
    compartilhamento acabou) ou com Esc.
  - Enter: `preventDefault()` e nada mais.
  - `blur` (clicar fora, trocar de aba): o campo não fecha.
  - Teclas com o campo aberto mas sem foco (a pessoa clicou na imagem ou voltou de outra janela):
    o ouvinte de `keydown` no `document` devolve o foco ao campo antes de a tecla ser tratada, então
    ela é escrita no recado. Isso **não** vale quando o alvo é outro campo de texto (ex.: o nome).
    Teclas com Ctrl/Alt/⌘ (atalhos do navegador) e teclas que não escrevem (setas, Tab, F1…) não
    puxam o foco. Esc com o campo sem foco também apaga o recado.
  - Como o campo fica aberto enquanto o recado aparece, `/` nesse período cai na regra "já há campo
    aberto" e é escrito no texto (FR-009).
  - A decisão fica em `acaoDaTecla(evento, estado)` → `"abrir"` | `"voltarAoCampo"` | `"apagar"` |
    `null`, que substitui `deveAbrirCampo` em `atalho-recado.js`.
- **Rationale**: devolver o foco no `keydown` faz o navegador entregar a tecla ao campo (o foco muda
  antes da inserção do caractere), sem simular digitação. Tudo testável numa função pura.
- **Alternatives considered**: impedir o `blur` (prender o foco) — bloquearia o campo de nome e os
  botões; capturar as teclas e montar o texto à mão — reimplementaria o `<input>` (acentos, IME).

## §6 Recado de quem sai

- **Decision**: quem escreve sai, recarrega ou cai → o recado dela é removido (em até ~3 s, pelo
  ping da T07).
- **Rationale**: na T07 só o recado aberto sumia; como agora todo recado está aberto até sumir, a
  regra fica mais simples e ninguém vê um recado parado de alguém que já saiu.

## §7 Validação no servidor

- **Decision**: `mover` com `x`/`y` que não são números → `mensagem-invalida` (como os demais
  formatos errados). `x`/`y` fora de 0–1 ou não finitos, ou `mover` sem recado → ignorado sem erro.
  `fechar` passa a ser ação desconhecida → `mensagem-invalida`.
- **Rationale**: mesma linha da T07 §9: formato errado é erro de protocolo; valor fora do esperado
  pode vir de corrida normal (recado acabou de sumir) e não deve derrubar a pessoa.
- **Alternatives considered**: limitar no servidor a quantidade de `mover` por segundo — desnecessário
  para um grupo de amigos (Princípio I).
