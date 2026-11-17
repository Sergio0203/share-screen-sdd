# Feature Specification: T07 · Escrever recados sobre o compartilhamento

**Feature Branch**: `007-recado-na-tela`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "Qualquer participante, inclusive quem está compartilhando, pode escrever
um recado que aparece em cima do compartilhamento, onde está o seu cursor. Para escrever, a pessoa
precisa estar com a aba do Telão aberta e em foco. Com a aba do Telão em foco e o cursor sobre o
compartilhamento, apertar / abre um campo de texto na posição do cursor. Quem está compartilhando
também consegue escrever, desde que esteja na aba do Telão. Enter envia, e Esc cancela sem enviar.
Apertar / enquanto digita em outro campo (ex.: o nome) não abre nada. O texto tem no máximo 100
caracteres. O campo não deixa passar disso e mostra quantos caracteres faltam. O recado aparece para
todos na sala, inclusive para quem está compartilhando, com o nome de quem escreveu. O recado aparece
no mesmo ponto da imagem para todo mundo, mesmo com janelas de tamanhos diferentes. O texto é sempre
mostrado como texto puro: <b>oi</b> aparece literalmente."

## Clarifications

### Session 2026-11-16

- Q: Como quem compartilha vê a própria tela no Telão para apontar e ver os recados? → A: Quem
  compartilha passa a ver a própria tela como qualquer outro compartilhamento (destaque/miniatura,
  pelas mesmas regras da T05), sem tocar o próprio som. Altera a T05 FR-004.
- Q: Quanto tempo o recado fica na tela? → A: Enquanto a pessoa está digitando, o recado aparece
  para todos, ao vivo; quando ela para de digitar, ele fica mais 8 s e some (detalhado na sessão
  2026-11-17: não é preciso apertar Enter).
- Q: Deve existir limite de recados seguidos por pessoa? → A: Não (sem resposta; adotado o padrão
  mais simples — o público é um grupo de amigos).

### Session 2026-11-17

- Q: Enquanto alguém digita, os outros veem o texto ao vivo ou só depois do Enter? → A: Ao vivo, e
  não é preciso apertar Enter: o recado some 8 s depois da última tecla. Enter só fecha o campo
  antes; Esc apaga o recado na hora para todos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escrever um recado sobre o compartilhamento (Priority: P1)

Uma pessoa está assistindo ao compartilhamento de um amigo (ex.: o mapa do jogo) e quer apontar
algo. Com a aba do Telão em foco, ela coloca o cursor sobre o ponto da imagem e aperta `/`. Um campo
de texto aparece exatamente ali; ela digita "olha o dragão aqui" e, enquanto digita, todos da sala
já veem o texto surgindo naquele ponto da imagem, com o nome dela. Ela não precisa apertar nada
para "enviar": quando para de digitar, o recado fica mais 8 s na tela e some.

**Why this priority**: é o centro da tarefa — apontar um lugar da tela sem precisar descrever em
voz ("lá em cima, à esquerda, não, mais pra direita..."). Sem isso, as outras histórias não têm o
que mostrar.

**Independent Test**: com duas pessoas na sala e uma compartilhando (T05), quem assiste põe o cursor
sobre um canto da imagem, aperta `/` e digita "aqui"; em até 1 s depois de cada tecla, o texto
digitado até ali aparece, com o nome de quem escreve, no mesmo canto da imagem nas duas telas. Sem
apertar Enter, a pessoa para de digitar; 8 s depois da última tecla o recado some das duas telas.

**Acceptance Scenarios**:

1. **Given** a aba do Telão em foco e o cursor sobre a imagem do compartilhamento em destaque,
   **When** a pessoa aperta `/`, **Then** um campo de texto abre na posição do cursor, já pronto
   para digitar, e o caractere `/` não é escrito no campo.
2. **Given** o campo aberto, **When** a pessoa digita ou apaga caracteres, **Then** em até 1 s todos
   na sala que veem aquele compartilhamento (incluindo quem compartilha) veem o texto atual, no
   ponto onde o campo foi aberto, com o nome de quem escreve.
3. **Given** o campo com texto, **When** a pessoa para de digitar (sem apertar nada), **Then** 8 s
   depois da última tecla o campo fecha e o recado some para todos.
4. **Given** a pessoa parou de digitar há menos de 8 s, **When** volta a digitar no mesmo campo,
   **Then** o recado é atualizado para todos e a contagem de 8 s recomeça a partir da nova última
   tecla.
5. **Given** o campo com texto, **When** a pessoa aperta Enter, **Then** o campo fecha na hora, mas
   o recado continua visível para todos até completar 8 s desde a última tecla (ou o Enter).
6. **Given** o campo aberto (com ou sem texto), **When** a pessoa aperta Esc, **Then** o campo fecha
   e o recado some para todos em até 1 s.
7. **Given** o campo aberto e vazio (ou só com espaços), **When** passam 8 s sem digitar ou a pessoa
   aperta Enter, **Then** o campo fecha e nada aparece para ninguém.
8. **Given** a aba do Telão em foco, **When** a pessoa aperta `/` com o cursor fora da imagem do
   compartilhamento (ex.: sobre as câmeras, a lista ou as faixas vazias ao redor da imagem),
   **Then** nenhum campo abre.
9. **Given** a pessoa está digitando em outro campo (ex.: o nome), **When** aperta `/`, **Then** o
   `/` é escrito nesse campo normalmente e nenhum campo de recado abre.
10. **Given** a aba do Telão não está em foco (outra aba ou outro app em primeiro plano), **When**
    a pessoa aperta `/`, **Then** nada acontece no Telão.
11. **Given** o compartilhamento em tela cheia (T05), **When** a pessoa aperta `/` com o cursor sobre
    a imagem, **Then** o campo abre na posição do cursor, e os recados aparecem também em tela
    cheia.

---

### User Story 2 - Limite de 100 caracteres e texto puro (Priority: P2)

Enquanto digita, a pessoa vê quantos caracteres ainda pode usar. O campo não aceita passar de 100
caracteres, nem colando um texto maior. O que ela escreve aparece exatamente como foi digitado: se
escrever `<b>oi</b>`, todos veem `<b>oi</b>`, e não "oi" em negrito.

**Why this priority**: mantém os recados curtos para não cobrir o jogo e garante que ninguém consiga
mudar a aparência da sala ou executar algo na tela dos outros através de um recado.

**Independent Test**: abrir o campo, digitar 100 caracteres e verificar que o 101º não entra e que o
contador mostra 0; colar um texto de 150 caracteres e verificar que só os 100 primeiros entram;
digitar `<b>oi</b>` e verificar que aparece literalmente para todos.

**Acceptance Scenarios**:

1. **Given** o campo acabou de abrir, **When** a pessoa olha o campo, **Then** vê o contador
   "Faltam 100 caracteres".
2. **Given** a pessoa digitou 37 caracteres, **When** olha o contador, **Then** vê "Faltam 63
   caracteres"; com 99, vê "Falta 1 caractere"; com 100, vê "Faltam 0 caracteres".
3. **Given** o campo com 100 caracteres, **When** a pessoa tenta digitar mais um, **Then** o
   caractere não entra.
4. **Given** o campo vazio, **When** a pessoa cola um texto com 150 caracteres, **Then** só os 100
   primeiros entram.
5. **Given** a pessoa digita `<b>oi</b>`, **When** o texto aparece para os outros,
   **Then** todos veem os caracteres `<b>oi</b>` literalmente, sem negrito nem qualquer formatação.
6. **Given** um nome de participante contendo `<i>Ana</i>`, **When** essa pessoa escreve um recado,
   **Then** o nome também aparece literalmente junto ao recado.
7. **Given** alguém tenta mandar um recado com mais de 100 caracteres sem usar o campo (ex.:
   alterando a página), **When** o recado chega à sala, **Then** ele não aparece para ninguém.

---

### User Story 3 - Recado no mesmo ponto da imagem para todos (Priority: P2)

Cada pessoa assiste com uma janela de tamanho diferente (notebook, monitor grande, tela cheia). O
recado aparece sobre o mesmo ponto da imagem compartilhada para todos — se foi escrito sobre o
mini-mapa, aparece sobre o mini-mapa para todo mundo.

**Why this priority**: se o recado aparecesse em pontos diferentes para cada pessoa, ele perderia o
sentido de "apontar"; tem a mesma importância que o limite de texto, mas depende da US1.

**Independent Test**: duas pessoas assistem com janelas de larguras bem diferentes (ex.: uma em tela
cheia e outra com a janela pela metade); uma escreve um recado com o cursor sobre um detalhe da
imagem; nas duas telas, o recado aponta para o mesmo detalhe. Redimensionar a janela com o recado na
tela e verificar que ele acompanha a imagem.

**Acceptance Scenarios**:

1. **Given** duas pessoas com janelas de tamanhos diferentes, **When** uma escreve um recado sobre
   um detalhe da imagem, **Then** nas duas telas o recado aponta para esse mesmo detalhe.
2. **Given** um recado na tela, **When** a pessoa redimensiona a janela ou entra/sai da tela cheia,
   **Then** o recado continua apontando para o mesmo ponto da imagem.
3. **Given** um recado escrito perto da borda da imagem, **When** aparece, **Then** o texto inteiro
   fica visível dentro da área do compartilhamento, e o ponto que ele indica continua sendo o ponto
   onde o campo foi aberto.

---

### User Story 4 - Quem compartilha também escreve e vê os recados (Priority: P3)

Quem está compartilhando a tela também pode escrever recados sobre a própria imagem e ver os recados
dos outros, desde que esteja com a aba do Telão aberta e em foco.

Para isso, quem compartilha passa a ver a própria tela no Telão como qualquer outro
compartilhamento: em destaque ou em miniatura, pelas mesmas regras da T05, sem ouvir o próprio som.

**Why this priority**: quem compartilha costuma ser quem está jogando e quer responder ("vou lá") no
mesmo lugar; depende das histórias anteriores.

**Independent Test**: quem compartilha volta para a aba do Telão, põe o cursor sobre a imagem da
própria tela, aperta `/` e escreve; quem assiste vê o recado no ponto certo. Quem assiste
escreve um recado; quem compartilha o vê na aba do Telão.

**Acceptance Scenarios**:

1. **Given** a pessoa começa a compartilhar e não escolheu outro destaque, **When** olha a sala,
   **Then** vê a imagem da própria tela em destaque (regra da T05: o compartilhamento mais recente vai
   para o destaque), sem ouvir o próprio som de volta.
2. **Given** a pessoa está compartilhando e há outros compartilhamentos, **When** olha a sala,
   **Then** a própria tela aparece como miniatura ou destaque, como qualquer outra, e ela pode trocar
   o destaque clicando nas miniaturas.
3. **Given** a pessoa está compartilhando e está com a aba do Telão em foco, **When** põe o cursor
   sobre a imagem do próprio compartilhamento e aperta `/`, **Then** o campo abre e funciona como
   para qualquer outra pessoa.
4. **Given** alguém escreve um recado sobre o compartilhamento de uma pessoa, **When** essa pessoa
   (quem compartilha) olha a aba do Telão, **Then** vê o recado no ponto certo da imagem da própria
   tela, com o nome de quem escreveu.
5. **Given** a pessoa está compartilhando e está em outra janela (ex.: no jogo), **When** aperta
   `/`, **Then** nada acontece no Telão e o jogo recebe a tecla normalmente.

---

### Edge Cases

- **Recado ligado a um compartilhamento**: cada recado pertence ao compartilhamento sobre o qual foi
  escrito. Com vários compartilhamentos (T05), o recado só aparece para quem está vendo aquele
  compartilhamento em destaque; nas miniaturas não aparece nada.
- **Compartilhamento termina** com recados na tela: os recados somem junto com ele.
- **Cursor se move ou a imagem muda depois de abrir o campo**: o campo fica onde foi aberto; o
  recado aparece nesse ponto.
- **Compartilhamento termina ou muda de destaque com o campo aberto**: o campo fecha e o recado
  some para todos, sem mensagem de erro.
- **Clicar fora do campo ou a aba perder o foco** (ex.: quem compartilha volta para o jogo logo
  depois de digitar): o campo fecha como no Enter; o recado continua visível até completar 8 s desde
  a última tecla. Só o Esc apaga o recado antes da hora.
- **Esc em tela cheia**: Esc com o campo aberto fecha o campo e apaga o recado; o navegador também
  pode sair da tela cheia nesse momento (comportamento do próprio navegador, como na T05).
- **Vários recados ao mesmo tempo**, inclusive no mesmo ponto: todos aparecem; o mais recente fica
  por cima.
- **Quem entra depois** (ou passa aquele compartilhamento para o destaque): vê os recados que ainda
  estão na tela naquele momento; não há histórico de recados que já sumiram.
- **Quem escreveu sai da sala** (ou recarrega a página): um recado com o campo ainda aberto some
  para todos em até 3 s; um recado com o campo já fechado continua até completar os 8 s.
- **Texto apagado até ficar vazio** com o campo aberto: o recado deixa de aparecer para os outros;
  se a pessoa voltar a digitar antes de o campo fechar, ele reaparece no mesmo ponto.
- **Caracteres especiais e emojis**: são aceitos e mostrados como digitados; cada símbolo visível
  (ex.: um emoji) conta como 1 caractere no limite de 100.
- **Quebras de linha**: o campo é de uma linha só; Enter sempre fecha o campo. Textos colados com
  quebras de linha viram uma linha (as quebras viram espaços).
- **Espaços nas pontas**: são removidos do que os outros veem; um recado só com espaços não aparece
  para ninguém.
- **Falha ao enviar** (ex.: conexão com a sala caiu): a pessoa vê "Não foi possível enviar o recado.
  Verifique sua conexão e tente de novo."; o que os outros já tinham visto some em até 3 s.
- **Celular / sem teclado físico**: sem tecla `/` e sem cursor, não há como abrir o campo; a pessoa
  continua vendo os recados dos outros.
- **Muitos recados seguidos** de uma mesma pessoa: não há limite; cada recado some 8 s depois da
  última tecla. Cada pessoa tem no máximo um campo de recado aberto por vez; recados anteriores dela
  que ainda estão nos 8 s continuam na tela.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Com a aba do Telão em foco e o cursor sobre a imagem do compartilhamento em destaque
  (inclusive em tela cheia), apertar `/` MUST abrir um campo de texto na posição do cursor, pronto
  para digitar, sem escrever o `/` no campo.
- **FR-002**: Apertar `/` MUST NOT abrir o campo quando: a aba do Telão não está em foco; o cursor
  não está sobre a imagem do compartilhamento (incluindo faixas vazias ao redor dela); não há
  compartilhamento em destaque; ou a pessoa está digitando em outro campo de texto (nesse caso, o
  `/` é escrito nesse campo normalmente). Enquanto o campo de recado está aberto, um novo `/` é só
  um caractere do texto.
- **FR-003**: Não é preciso apertar Enter para os outros verem o recado. Enter, clicar fora do campo
  ou a aba perder o foco MUST fechar o campo, mantendo o recado na tela até completar 8 s desde a
  última tecla. Esc MUST fechar o campo e apagar o recado para todos em até 1 s. Recados vazios ou só
  com espaços MUST NOT aparecer para ninguém.
- **FR-004**: O campo MUST aceitar no máximo 100 caracteres (cada símbolo visível conta como 1),
  inclusive ao colar, e MUST mostrar quantos caracteres faltam ("Faltam N caracteres" / "Falta 1
  caractere"), atualizado a cada tecla.
- **FR-005**: A sala MUST rejeitar textos com mais de 100 caracteres, mesmo que não venham do campo;
  o que for rejeitado MUST NOT aparecer para ninguém.
- **FR-006**: Enquanto o campo está aberto, o texto atual MUST aparecer ao vivo (em até 1 s após cada
  alteração), no ponto onde o campo foi aberto, para todos na sala que estão vendo aquele
  compartilhamento em destaque — incluindo quem escreve e quem está compartilhando —, com o nome de
  quem escreve.
- **FR-007**: O recado MUST ficar no mesmo ponto relativo da imagem compartilhada para todos,
  independentemente do tamanho da janela, de estar em tela cheia ou de redimensionar a janela
  depois; o texto MUST ficar inteiro dentro da área do compartilhamento.
- **FR-008**: O texto do recado e o nome de quem escreveu MUST ser sempre mostrados como texto puro:
  qualquer marcação (ex.: `<b>oi</b>`) MUST aparecer literalmente, sem formatar nem executar nada.
- **FR-009**: Cada recado MUST sumir para todos 8 s depois da última tecla digitada nele (ou do Enter,
  se for depois); voltar a digitar antes disso MUST reiniciar a contagem. Quando o recado some, o
  campo de quem escreve MUST fechar. O recado MUST sumir também quando o compartilhamento ao qual
  pertence termina.
- **FR-010**: Quem está compartilhando MUST ver a própria tela no Telão como qualquer outro
  compartilhamento (destaque ou miniatura, pelas regras da T05 FR-017/FR-018), sem tocar o próprio
  som, e MUST poder escrever e ver recados sobre ela na aba do Telão. **Altera a T05 FR-004**, que
  escondia a própria tela de quem compartilha.
- **FR-011**: Recados MUST NOT ser guardados: quem entra ou recarrega a página vê só os recados que
  ainda estão na tela naquele momento; recados que já sumiram não voltam.
- **FR-012**: Se o recado não puder ser enviado, quem escreveu MUST ver a mensagem "Não foi possível
  enviar o recado. Verifique sua conexão e tente de novo."; os outros MUST NOT ver erro.
- **FR-013**: Escrever ou receber recados MUST NOT interromper nem alterar o compartilhamento, a voz
  ou as câmeras (T03–T06), nem impedir os controles do destaque (ex.: botão "Tela cheia").
- **FR-014**: Todos os textos desta funcionalidade MUST estar em pt-BR.

### Key Entities

- **Recado**: texto curto (até 100 caracteres, texto puro) escrito por um participante sobre um
  compartilhamento. Tem: quem escreveu (nome), a qual compartilhamento pertence, o ponto da imagem
  (posição relativa à largura e à altura da imagem, igual para todos), se o campo de quem escreve
  ainda está aberto e o momento da última tecla (some 8 s depois). No máximo um campo aberto por
  pessoa. Não é guardado.
- **Compartilhamento** (da T05): passa a ter os recados escritos sobre ele; quando termina, os
  recados somem.
- **Participante** (da T02): o nome exibido junto a cada recado que escreve.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos recados, todos que estão vendo aquele compartilhamento em destaque
  (incluindo quem compartilha, na aba do Telão) veem cada alteração do texto em até 1 s.
- **SC-002**: Com duas janelas de tamanhos diferentes (ex.: 1280 px e 1920 px de largura), o ponto
  indicado pelo recado fica no mesmo lugar da imagem nas duas, com diferença de no máximo 1% da
  largura e da altura da imagem.
- **SC-003**: Em 100% das tentativas, nenhum recado com mais de 100 caracteres aparece para ninguém,
  e o contador sempre mostra o número certo de caracteres restantes.
- **SC-004**: Em 100% dos testes com marcação (ex.: `<b>oi</b>`, `<img src=x onerror=alert(1)>`), o
  texto aparece literalmente e nada é formatado nem executado.
- **SC-005**: Em 100% dos casos em que a pessoa digita `/` em outro campo de texto, o `/` é escrito
  nesse campo e nenhum campo de recado abre.
- **SC-006**: Uma pessoa consegue fazer um recado curto aparecer para todos em menos de 10 segundos
  (apertar `/` e digitar).
- **SC-007**: Pelo menos 9 em cada 10 pessoas, depois de ver a dica de uso uma vez, conseguem
  escrever um recado sem ajuda.
- **SC-008**: Em 100% dos recados, o recado some para todos entre 8 e 9 s depois da última tecla (sem
  precisar de Enter); em 100% dos Esc, o recado some para todos em até 1 s.

## Assumptions

- Depende da T02 (nome dos participantes), T05 (compartilhamento, destaque, tela cheia, vários
  compartilhamentos) e T06.
- **Altera a T05**: quem compartilha passa a ver a própria tela (antes escondida) para poder apontar
  e ver os recados. Como a própria imagem já está no computador dela, isso não usa mais internet.
- **Altera o pedido original** ("Enter envia, e Esc cancela sem enviar"): como o texto aparece ao
  vivo, não existe um "enviar" separado. Enter só fecha o campo; Esc apaga o recado na hora, mas os
  outros podem ter lido o que foi digitado antes.
- Sem limite de recados por pessoa: o público é um grupo de amigos, e cada recado some em 8 s.
- "Telão" é o nome do app; "aba do Telão" é a aba do navegador com a sala aberta. O recado aparece
  só dentro do Telão; não há nada desenhado por cima do jogo ou da tela real de quem compartilha.
- A posição do recado é relativa à imagem compartilhada (e não à janela de quem escreve), por isso
  é a mesma para todos.
- Uma dica discreta perto do compartilhamento ("Aperte / para escrever um recado") ajuda as pessoas
  a descobrirem o atalho.
- Recados não passam por moderação nem filtro de palavras; o público é um grupo de amigos.
- Escrever recados exige teclado físico e mouse/trackpad; no celular, a pessoa só vê os recados.
- Ficam para tarefas futuras: desenhar sobre a tela, setas, cores, apagar recados, histórico de
  recados e recados fora do compartilhamento (chat).
