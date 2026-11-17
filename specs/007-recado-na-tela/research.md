# Research: T07 · Escrever recados sobre o compartilhamento

Nenhum item da Technical Context ficou em aberto; abaixo estão as decisões de desenho, cada uma com
o motivo e as alternativas descartadas.

## §1 Por onde os recados passam: o WebSocket da sala

- **Decision**: os recados vão pelo WebSocket que já existe (`/ws`), com o servidor guardando os
  recados ativos de cada sala em memória e enviando a lista inteira (`recados`) a todos a cada
  mudança.
- **Rationale**: o servidor já conhece a sala, os nomes e quem compartilha; guardar a lista permite
  que quem entra depois (ou recarrega) veja os recados ainda na tela (FR-011) e que o nome mostrado
  venha do servidor, não de quem escreve. Com no máximo 6 pessoas e textos de até 100 caracteres, a
  lista completa tem poucos KB — mesmo padrão da mensagem `participantes`, sem lógica de diferenças.
- **Alternatives considered**: canal de dados WebRTC entre as pessoas (exigiria mexer na
  negociação dos 4 canais, e quem entra depois não receberia nada); eventos incrementais
  (criar/atualizar/apagar) em vez da lista (mais casos para manter em sincronia, ganho irrelevante
  nesta escala).

## §2 Quem decide quando o recado some: o servidor

- **Decision**: o servidor agenda, por recado, um temporizador de 8 s reiniciado a cada `escrever`
  e no `fechar` (Enter, clicar fora, aba perde o foco). Ao vencer, o recado sai da lista e a lista
  nova é enviada. O campo de quem escreve fecha quando o próprio recado aberto some da lista.
- **Rationale**: um único relógio para todos garante que o recado some ao mesmo tempo em todas as
  telas (SC-008) e sobrevive a quem escreve fechar a aba. O registro de salas já recebe `agendar`/
  `cancelar` por injeção, então os testes controlam o tempo sem esperar 8 s.
- **Alternatives considered**: cada navegador contar os 8 s a partir de quando recebeu (relógios
  desencontrados; quem entra no meio veria o recado por 8 s inteiros).

## §3 Ponto na imagem: coordenadas relativas ao conteúdo do vídeo

- **Decision**: a posição é guardada como `x` e `y` entre 0 e 1, relativos à área onde a imagem do
  vídeo realmente aparece (descontando as faixas vazias de `object-fit: contain`). Duas funções
  puras fazem a conversão: `pontoNaImagem(caixa, larguraVideo, alturaVideo, clienteX, clienteY)` →
  `{x, y}` ou `null` (fora da imagem) e `areaDaImagem(caixa, larguraVideo, alturaVideo)` → retângulo
  em pixels onde a imagem aparece.
- **Rationale**: frações da imagem são iguais para todos, qualquer que seja o tamanho da janela, a
  tela cheia ou a qualidade recebida (a T06 pode reduzir a resolução, mas a proporção se mantém).
  Funções puras são testáveis sem navegador (Princípio III).
- **Alternatives considered**: pixels da janela de quem escreve (diferente para cada um); frações
  da caixa do `<video>` incluindo as faixas (o ponto muda quando a proporção da janela muda).

## §4 Desenho dos recados sobre o vídeo

- **Decision**: uma camada (`.camada-recados`) dentro do contêiner `.destaque`, posicionada em
  pixels sobre `areaDaImagem(...)` e recalculada com `ResizeObserver` no contêiner e no evento
  `resize` do vídeo. Cada recado é um elemento com nome e texto escritos por `textContent`,
  posicionado no ponto e empurrado para dentro da camada se passar da borda (o ponto indicado não
  muda). A ordem dos elementos segue a ordem de criação: o mais recente fica por cima.
- **Rationale**: como a T05 põe o contêiner `.destaque` (e não só o vídeo) em tela cheia, a camada
  vai junto para a tela cheia (FR-001, cenário 11). `textContent` nunca interpreta marcação (FR-008).
- **Alternatives considered**: `<canvas>` por cima (texto, contorno e acessibilidade mais
  trabalhosos); `innerHTML` com escape manual (fácil de errar).

## §5 Atalho `/`: quando abrir o campo

- **Decision**: um ouvinte de `keydown` no `document` abre o campo quando: `evento.key === "/"`;
  sem Ctrl/Alt/Meta; o alvo não é campo de texto (`input`, `textarea`, `select` ou
  `contentEditable`); há compartilhamento em destaque com imagem; e a última posição do ponteiro
  (guardada em `pointermove` sobre o destaque) cai dentro da imagem (`pontoNaImagem` não nulo).
  `preventDefault()` impede o `/` de entrar no campo novo.
- **Rationale**: o navegador só entrega `keydown` à aba em foco, então "aba do Telão em foco" vem de
  graça (cenário 10). Checar o alvo cobre o caso do campo de nome (SC-005). A regra de decisão fica
  numa função pura (`deveAbrirCampo`) para teste.
- **Alternatives considered**: `keypress` (obsoleto); `evento.code === "Slash"` (falha em teclados
  ABNT2, onde `/` fica em outra tecla — `key` respeita o layout).

## §6 Campo de texto: limite, contador e teclas

- **Decision**: `<input type="text">` posicionado no ponto, com um contador ao lado. O limite de 100
  caracteres (contados por grafemas, `Intl.Segmenter`) é aplicado **antes** de o texto entrar:
  - `beforeinput`: calcula como ficaria o texto (`textoDepoisDaInsercao(atual, inicio, fim,
    inserido)`, considerando a seleção que será substituída). Se passar de 100, `preventDefault()`.
    Ao colar ou soltar texto, insere só o que cabe (`caberNoLimite`) e bloqueia o resto. Com 100
    caracteres, digitar não tem efeito nenhum — nada aparece e some depois.
  - `input` (salvaguarda): composição de teclado (IME, acentos de tecla morta) não pode ser
    cancelada em todos os navegadores; se o texto passar de 100 mesmo assim, é cortado em 100 e o
    cursor é mantido. Esse texto cortado é o único enviado.
  - Quebras de linha viram espaços. A cada alteração, o recado é enviado (`escrever`). Enter →
    `fechar`; Esc → `apagar`; `blur` → `fechar`.
  - Contagem, corte e "quanto cabe" ficam no módulo puro `recados.js`, usado pelo navegador e pelo
    servidor (como `nome.js`); o servidor ainda descarta qualquer texto acima de 100 (FR-005).
- **Rationale**: a spec pede que o campo "não deixe passar" de 100: bloquear em `beforeinput` evita o
  caractere aparecer e sumir. `maxlength` não serve sozinho: conta unidades UTF-16 (um emoji conta
  2), contrariando "cada símbolo visível conta como 1". `Intl.Segmenter` existe no Node 22 e nos
  navegadores alvo, sem dependência. Enviar o texto inteiro a cada tecla é o mais simples e cabe com
  folga no limite de 1 s (SC-001).
- **Alternatives considered**: só cortar no `input` (o 101º caractere pisca na tela e o cursor pula);
  `[...texto].length` como em `nome.js` (emojis compostos, como 👨‍👩‍👧, contariam várias vezes);
  agrupar teclas por tempo (complexidade sem necessidade na escala atual).

## §7 Esc em tela cheia

- **Decision**: além do `keydown` de Esc, se a tela cheia termina (`fullscreenchange`) com o campo
  aberto, o recado é apagado — o mesmo efeito do Esc.
- **Rationale**: em tela cheia, alguns navegadores usam o Esc para sair da tela cheia e não o
  repassam à página; tratar a saída da tela cheia garante o comportamento do Edge Case "Esc em tela
  cheia". Outras saídas da tela cheia com o campo aberto são raras e o efeito é aceitável.
- **Alternatives considered**: Keyboard Lock API (só Chromium, exige tela cheia do documento).

## §8 Quem compartilha vê a própria tela (altera a T05)

- **Decision**: `escolherDestaque` deixa de excluir o próprio compartilhamento; para o próprio id,
  `midia.telaDe` devolve um `<video>` mudo com a trilha capturada localmente (prévia, como a da
  câmera). `assistindo` pode ser o próprio id; `enviaTelaPara` não muda (ninguém tem conexão
  consigo mesmo).
- **Rationale**: reaproveita todas as regras de destaque e miniaturas da T05 (decisão da
  clarificação) e não usa internet a mais. O vídeo local é mudo, então o próprio som não volta.
- **Alternatives considered**: prévia separada fora do destaque (rejeitada na clarificação).

## §9 Validação no servidor

- **Decision**: mensagem `recado` com formato errado (tipos errados, `acao` desconhecida) →
  `mensagem-invalida`, como as demais. Já um `escrever` com texto acima de 100 caracteres, alvo que
  não está compartilhando ou ponto fora de 0–1 é **ignorado** sem fechar a conexão.
- **Rationale**: um navegador honesto nunca envia esses casos, mas eles podem acontecer por corrida
  (o compartilhamento acabou de terminar) ou por pequenas diferenças nas tabelas Unicode entre
  navegador e servidor; derrubar a pessoa da sala seria desproporcional. Mesmo assim, nada inválido
  aparece para ninguém (FR-005).
- **Alternatives considered**: recusar tudo com `mensagem-invalida` (expulsaria da sala por uma
  corrida normal).

## §10 Falha ao enviar

- **Decision**: `sala.enviar` passa a devolver `false` quando o WebSocket não está aberto; o campo de
  recado então mostra `TEXTOS.erroEnviarRecado` e fecha. Do lado dos outros, quando a conexão de
  quem escreve cai, o servidor apaga o recado aberto dela (o ping percebe em até ~2 s).
- **Rationale**: atende FR-012 e o Edge Case "Falha ao enviar" sem novo mecanismo.
