# Feature Specification: T08 · O recado segue o cursor e some sozinho

**Feature Branch**: `008-recado-segue-cursor`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "T08 · O recado segue o cursor e some sozinho. O recado funciona como o
\"cursor chat\" do Figma: fica sempre em cima do cursor de quem escreve. Desde a primeira letra, o
recado fica preso ao cursor de quem escreve, inclusive enquanto a pessoa ainda está digitando: ela
pode mover o mouse e o campo vai junto. Para todos, o recado acompanha o movimento do cursor de quem
escreveu de forma contínua (sem pular de posição em posição), enquanto estiver visível. 8 s depois
da última tecla, o recado some aos poucos, com um fade de 1 s. Se a pessoa voltar a digitar antes
disso, a contagem recomeça. Se a mesma pessoa mandar outro recado, o novo substitui o anterior.
Recados de várias pessoas podem aparecer ao mesmo tempo, sem um apagar o outro."

## Clarifications

### Session 2026-11-17

- Q: O que acontece com o recado quando quem escreve tira o cursor de cima da imagem? → A: O recado
  fica parado no último ponto da imagem onde o cursor esteve e volta a seguir quando o cursor volta
  para cima da imagem (sem esconder, sem prender à borda, sem iniciar o fade).
- Q: Quando uma pessoa já tem um recado na tela e aperta `/`, o que acontece? → A: O campo fica
  ativo enquanto o recado está aparecendo (inclusive durante o fade), então `/` é só um caractere e
  aparece no texto. `/` só abre um recado novo depois que o anterior sumiu por completo; um recado
  novo nunca substitui um que ainda está na tela.
- Q: Com o campo sempre ativo enquanto o recado aparece, o que a tecla Enter deve fazer? → A: Nada:
  o campo continua ativo e o recado segue a contagem normal de 8 s + 1 s de fade.

## User Scenarios & Testing *(mandatory)*

Esta tarefa muda o comportamento dos recados da T07. Tudo o que a T07 define e não é citado aqui
continua valendo (atalho `/`, limite de 100 caracteres, texto puro, posição relativa à imagem, Esc,
quem compartilha também escreve, etc.).

### User Story 1 - O recado acompanha o cursor de quem escreve (Priority: P1)

Uma pessoa assiste ao compartilhamento de um amigo e quer apontar o caminho no mapa. Ela aperta `/`,
digita "vai por aqui" e, sem parar de digitar, arrasta o mouse ao longo do caminho. O campo de texto
vai junto com o cursor dela, e todos na sala veem o recado, com o nome dela, deslizando pela imagem
acompanhando o movimento — como um balão preso ao cursor.

**Why this priority**: é o centro da tarefa. Na T07 o recado ficava parado onde o campo foi aberto;
agora ele funciona como um "ponteiro que fala", permitindo indicar um caminho ou corrigir o ponto
sem abrir outro recado.

**Independent Test**: com duas pessoas na sala e uma compartilhando (T05), quem assiste aperta `/`
sobre a imagem, digita "aqui" e move o mouse de um canto ao outro da imagem. Na própria tela, o
campo acompanha o cursor; na tela da outra pessoa, o recado desliza pelo mesmo caminho, sem saltos,
terminando sobre o mesmo ponto da imagem.

**Acceptance Scenarios**:

1. **Given** o campo de recado aberto (T07), **When** quem escreve move o cursor sobre a imagem,
   **Then** o campo se move junto, mantendo-se sempre junto ao cursor, inclusive enquanto a pessoa
   digita.
2. **Given** o campo aberto com pelo menos um caractere, **When** quem escreve move o cursor,
   **Then** todos que veem aquele compartilhamento em destaque veem o recado acompanhar o movimento
   de forma contínua (deslizando, sem pular de posição em posição), com atraso de no máximo 0,5 s.
3. **Given** o campo aberto e ainda vazio, **When** quem escreve move o cursor, **Then** o campo
   acompanha o cursor só na tela de quem escreve; os outros não veem nada até a primeira letra.
4. **Given** quem escreve parou de digitar e o recado ainda está visível (inclusive durante o
   fade), **When** move o cursor sobre a imagem, **Then** o recado continua acompanhando o cursor
   para todos até sumir.
5. **Given** o recado acompanhando o cursor, **When** quem escreve tira o cursor de cima da imagem
   (ex.: para as câmeras ou para outra janela), **Then** o recado fica parado no último ponto da
   imagem onde o cursor esteve e volta a acompanhar quando o cursor volta para cima da imagem.
6. **Given** pessoas com janelas de tamanhos diferentes, **When** o recado se move, **Then** em todas
   as telas ele passa pelos mesmos pontos da imagem (posição relativa à imagem, como na T07).
7. **Given** o cursor perto da borda da imagem, **When** o recado é mostrado, **Then** o texto
   inteiro continua visível dentro da área do compartilhamento, e o ponto que ele indica continua
   sendo o ponto do cursor.

---

### User Story 2 - O recado some sozinho, aos poucos (Priority: P1)

A pessoa termina de escrever e simplesmente para de digitar. 8 s depois da última tecla, o recado
começa a desaparecer suavemente e, em 1 s, já não está mais na tela de ninguém. Enquanto o recado
aparece, o campo continua ativo: se ela voltar a digitar antes de ele sumir, o recado continua e a
contagem recomeça.

**Why this priority**: sem o desaparecimento automático, os recados se acumulariam sobre o jogo; o
fade evita que o recado "pisque" e suma de repente enquanto alguém ainda está lendo.

**Independent Test**: escrever "oi" e parar de digitar; nas duas telas, o recado fica totalmente
visível por 8 s, desaparece gradualmente durante 1 s e some de vez. Repetir digitando mais uma letra
aos 6 s: o recado continua e só começa a sumir 8 s depois dessa nova tecla. Repetir digitando uma
letra no meio do fade: o recado volta a ficar totalmente visível e a contagem recomeça.

**Acceptance Scenarios**:

1. **Given** um recado visível, **When** passam 8 s desde a última tecla, **Then** o recado começa a
   ficar transparente para todos e some totalmente 1 s depois (9 s após a última tecla).
2. **Given** um recado visível, **When** a pessoa digita ou apaga um caractere antes de completar
   8 s, **Then** o recado é atualizado para todos e a contagem recomeça a partir dessa tecla.
3. **Given** o recado está no fade, **When** a pessoa digita ou apaga um caractere, **Then** o
   recado volta a ficar totalmente visível para todos e a contagem de 8 s recomeça.
4. **Given** o recado some por completo, **When** isso acontece, **Then** o campo de quem escreve
   fecha.
5. **Given** um recado visível, **When** a pessoa aperta Esc, **Then** o campo fecha e o recado
   some para todos em até 1 s, sem esperar os 8 s (comportamento da T07 mantido).
6. **Given** um recado visível, **When** a pessoa aperta Enter, **Then** nada muda: o campo continua
   ativo e o recado segue a contagem normal de 8 s + 1 s de fade. **Altera a T07**, em que Enter
   fechava o campo.

---

### User Story 3 - Um recado por pessoa, vários ao mesmo tempo (Priority: P2)

Cada pessoa tem no máximo um recado na tela. Enquanto o recado dela aparece, tudo o que ela digita
— inclusive `/` — vai para esse mesmo recado. Só depois que ele some ela pode abrir um novo com `/`.
Recados de pessoas diferentes convivem: se três amigos escrevem ao mesmo tempo, os três recados
aparecem, cada um seguindo o cursor de quem o escreveu.

**Why this priority**: como o recado segue o cursor, dois recados da mesma pessoa no mesmo cursor
seriam confusos; já recados de pessoas diferentes são o uso normal numa sala de amigos.

**Independent Test**: com três pessoas na sala, A escreve "um" e para de digitar; antes de o recado
sumir, A aperta `/` e digita "dois": todos veem "um/dois" num único recado, no cursor de A. Depois
que o recado some, A aperta `/` e digita "três": aparece um recado novo só com "três". Ao mesmo
tempo, B e C escrevem recados: todos veem os recados de A, B e C juntos, cada um seguindo o cursor
de seu autor.

**Acceptance Scenarios**:

1. **Given** um recado de uma pessoa ainda visível (inclusive durante o fade), **When** ela aperta
   `/`, **Then** o `/` é escrito no fim do texto desse recado, como qualquer outro caractere, e
   nenhum recado novo é aberto.
2. **Given** o recado de uma pessoa já sumiu por completo, **When** ela aperta `/` com o cursor
   sobre a imagem, **Then** abre um campo novo, vazio, sem escrever o `/` (T07 FR-001).
3. **Given** recados de pessoas diferentes visíveis, **When** qualquer uma delas escreve, move o
   cursor, aperta Esc ou tem o recado sumindo, **Then** só o recado dela muda; os das outras pessoas
   continuam iguais.
4. **Given** recados de pessoas diferentes passando pelo mesmo ponto, **When** se sobrepõem,
   **Then** todos continuam aparecendo e o recado com a tecla mais recente fica por cima.

---

### Edge Cases

- **Recado ligado a um compartilhamento** (T07): o recado só se move sobre a imagem do
  compartilhamento em que foi aberto. Se quem escreve passar o cursor por cima de outra área, o
  recado fica parado no último ponto da imagem (US1 cenário 5).
- **Quem escreveu muda o destaque** para outro compartilhamento: o campo fecha e o recado some para
  todos, como na T07.
- **Quem escreveu sai para outra janela** (ex.: volta para o jogo) com o recado visível: o recado
  fica parado no último ponto e segue a contagem normal de 8 s + 1 s de fade. Se a pessoa voltar à
  aba do Telão antes de o recado sumir, o que ela digitar continua indo para o mesmo recado.
- **Clicar fora do campo** com o recado visível: o campo continua ativo e o recado não muda. Se a
  pessoa clicar em outro campo de texto (ex.: o nome), o que ela digita vai para esse campo; o
  recado segue a contagem normal. **Altera a T07**, em que clicar fora fechava o campo.
- **Movimento muito rápido do cursor**: o recado pode ficar um pouco atrás do cursor de quem escreve
  na tela dos outros, mas chega ao mesmo ponto final em até 0,5 s após o cursor parar e nunca
  "teleporta" no meio do caminho.
- **Conexão instável de quem escreve**: se as posições chegam com atraso ou irregulares, o recado
  continua deslizando entre a última posição mostrada e a nova, sem saltos; se a conexão com a sala
  cair, vale a regra da T07 (o recado some para os outros em até 3 s).
- **Quem entra depois** ou passa o compartilhamento para o destaque: vê os recados que estão
  visíveis naquele momento, já na posição atual de cada um; não vê recados que já sumiram.
- **Quem compartilha** escrevendo sobre a própria tela (T07 US4): o recado segue o cursor dela sobre
  a imagem no Telão, como o de qualquer pessoa.
- **Tela cheia e redimensionar a janela**: o recado continua no ponto relativo da imagem e continua
  acompanhando o cursor de quem escreve.
- **Recado apagado até ficar vazio**: deixa de aparecer para os outros (T07); o campo continua
  ativo e, se a pessoa não digitar nada em 8 s, fecha. Enquanto o campo está aberto, `/` continua
  sendo só um caractere.
- **Limite de 100 caracteres**: continuar escrevendo no mesmo recado (inclusive com `/`) segue o
  limite da T07; ao chegar a 100, novas teclas não entram, mas a contagem de 8 s recomeça a cada
  tecla apertada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Enquanto o campo de recado está aberto, ele MUST acompanhar o cursor de quem escreve
  sobre a imagem do compartilhamento, inclusive enquanto a pessoa digita. **Altera a T07**, em que
  o campo ficava onde foi aberto.
- **FR-002**: A partir da primeira letra, e enquanto o recado estiver visível (inclusive durante o
  fade), o ponto indicado pelo recado MUST ser a posição atual do cursor de quem escreve sobre a
  imagem, para todos que veem aquele compartilhamento em destaque.
- **FR-003**: Para quem vê o recado de outra pessoa, o movimento MUST ser contínuo: o recado desliza
  entre as posições, sem saltos, chegando à posição do cursor de quem escreve com atraso de no
  máximo 0,5 s.
- **FR-004**: Quando o cursor de quem escreve sai de cima da imagem do compartilhamento (ou a aba
  perde o foco), o recado MUST ficar parado no último ponto da imagem em que o cursor esteve e
  voltar a acompanhar quando o cursor voltar para cima da imagem.
- **FR-005**: O recado MUST continuar obedecendo à T07 FR-007: mesmo ponto relativo da imagem para
  todos, independentemente do tamanho da janela, e texto inteiro dentro da área do compartilhamento.
- **FR-006**: 8 s depois da última tecla, o recado MUST desaparecer gradualmente para todos ao longo
  de 1 s, sumindo totalmente 9 s após a última tecla. Qualquer tecla no recado antes de ele sumir
  (inclusive durante o fade) MUST reiniciar a contagem e deixá-lo totalmente visível de novo.
  **Detalha a T07 FR-009**, que fazia o recado sumir de uma vez.
- **FR-007**: O campo de quem escreve MUST continuar ativo enquanto o recado está aparecendo
  (inclusive durante o fade) e MUST fechar só quando o recado some por completo ou com Esc. Enter e
  clicar fora MUST NOT fechar o campo. **Altera a T07 FR-003**, em que Enter, clicar fora e perder o
  foco fechavam o campo.
- **FR-008**: Esc MUST continuar fechando o campo e apagando o recado para todos em até 1 s, sem
  fade obrigatório (T07 FR-003).
- **FR-009**: Cada pessoa MUST ter no máximo um recado visível. Enquanto o recado dela está
  aparecendo, `/` MUST ser tratado como um caractere desse recado; `/` MUST abrir um recado novo
  só depois que o anterior sumiu por completo (ou foi apagado com Esc). Um recado novo nunca
  substitui um recado ainda visível. **Altera a T07**, em que recados anteriores da mesma pessoa
  continuavam na tela junto com um novo.
- **FR-010**: Recados de pessoas diferentes MUST poder aparecer ao mesmo tempo, cada um seguindo o
  cursor do seu autor; nenhuma ação de uma pessoa MUST alterar ou apagar o recado de outra. Quando
  se sobrepõem, o recado com a tecla mais recente MUST ficar por cima.
- **FR-011**: Quem entra na sala ou passa o compartilhamento para o destaque MUST ver os recados
  visíveis naquele momento na posição atual de cada um.
- **FR-012**: Mover recados MUST NOT interromper nem atrasar perceptivelmente o compartilhamento, a
  voz ou as câmeras (T03–T06).

### Key Entities

- **Recado** (da T07): passa a ter uma posição que muda ao longo do tempo (a do cursor de quem
  escreve, relativa à imagem) e um estado de desaparecimento (visível → fade de 1 s → some). O
  campo de quem escreve fica aberto durante toda a vida do recado. No máximo um recado por pessoa.
- **Posição do cursor de quem escreve**: ponto relativo à imagem do compartilhamento, atualizado
  enquanto o recado da pessoa está visível; não é mostrado a ninguém quando a pessoa não tem
  recado visível.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes, o campo de quem escreve fica junto ao cursor enquanto ele se move
  sobre a imagem, inclusive durante a digitação.
- **SC-002**: Para quem vê o recado, a posição dele alcança a posição do cursor de quem escreve em
  até 0,5 s após o cursor parar, com diferença final de no máximo 1% da largura e da altura da
  imagem (mesma tolerância da T07 SC-002).
- **SC-003**: Em observações de recados em movimento, nenhum avaliador percebe o recado "pulando"
  de um ponto a outro em condições normais de conexão.
- **SC-004**: Em 100% dos recados, o recado fica totalmente visível até 8 s após a última tecla,
  desaparece gradualmente e some para todos entre 9 s e 9,5 s após a última tecla.
- **SC-005**: Em 100% dos testes, uma pessoa nunca tem mais de um recado visível ao mesmo tempo, e
  `/` apertado com o próprio recado visível sempre aparece no texto desse recado.
- **SC-006**: Com pelo menos 5 pessoas escrevendo e movendo o cursor ao mesmo tempo, todos os 5
  recados aparecem para todos, cada um seguindo o cursor certo, e o compartilhamento e a voz
  continuam sem cortes perceptíveis.

## Assumptions

- Depende da T07 (recados), T05 (compartilhamento, destaque, tela cheia) e T02 (nomes).
- O recado aparece "em cima do cursor" como um balão encostado no ponto do cursor (como o cursor
  chat do Figma); a posição exata do balão em relação à ponta do cursor é decisão de design, desde
  que o ponto indicado seja o do cursor.
- Os outros participantes não veem o cursor de ninguém fora dos recados: esta tarefa não cria
  "cursores ao vivo" permanentes.
- **Altera o pedido original** ("Se a mesma pessoa mandar outro recado, o novo substitui o
  anterior"): como o campo fica ativo enquanto o recado aparece, a pessoa continua escrevendo no
  mesmo recado; só abre outro depois que o anterior some. Na prática, cada pessoa continua com um
  recado por vez.
- **Altera a T07**: Enter e clicar fora não fecham mais o campo; o campo fecha quando o recado some
  ou com Esc.
- Esc continua apagando o recado na hora, sem esperar o fade, por ser um "desfazer" explícito.
- O texto continua com no máximo 100 caracteres, texto puro, e sem histórico (T07).
