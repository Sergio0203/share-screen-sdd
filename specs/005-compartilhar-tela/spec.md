# Feature Specification: T05 · Compartilhar a tela

**Feature Branch**: `005-compartilhar-tela`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "T05 · Compartilhar a tela — A feature principal. Um botão
'Compartilhar tela' deixa escolher entre a tela inteira ou a janela de um app específico (ex.:
League of Legends). Os outros participantes começam a ver o compartilhamento em até 5 s. A pessoa
pode parar pelo botão do app ou pelo botão nativo do navegador. Nos dois casos, os outros param de
ver em até 3 s. O compartilhamento aparece em destaque, maior que as câmeras, e pode ir para tela
cheia (sai com Esc). Se a permissão for negada ou o navegador não permitir compartilhar (ex.:
celular), aparece uma explicação, e a pessoa continua podendo assistir."

## Clarifications

### Session 2026-11-16

- Q: Mais de uma pessoa pode compartilhar ao mesmo tempo? → A: Sim; vários compartilhamentos ao
  mesmo tempo, e quem assiste escolhe qual fica em destaque.
- Q: O som do que está sendo compartilhado vai junto? → A: Sim, quando o navegador permitir; quando
  não der, compartilha só a imagem, sem erro.
- Q: Com vários compartilhamentos, as miniaturas dos que não estão em destaque mostram a imagem ao
  vivo ou só o nome? → A: Só o nome (com um ícone de tela); a imagem chega apenas para o
  compartilhamento em destaque, e trocar o destaque leva até cerca de 2 s.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Compartilhar a tela e os outros assistirem (Priority: P1)

Uma pessoa clica em "Compartilhar tela", escolhe se quer mostrar a tela inteira ou só a janela de
um app (por exemplo, o jogo) e, em poucos segundos, todos os outros da sala passam a ver o que ela
está mostrando, em destaque, maior que as câmeras. Quando termina, ela clica em "Parar de
compartilhar" (ou no botão do próprio navegador) e o compartilhamento some para todos.

**Why this priority**: é a funcionalidade principal do produto — assistir juntos ao que um amigo
está fazendo (ex.: jogando). Sem isso, o app é só uma chamada de voz e vídeo.

**Independent Test**: com duas pessoas na sala (T02) em computadores ou perfis diferentes, uma
compartilha a janela de um app; a outra vê o conteúdo em destaque em até 5 s. A primeira para pelo
botão do app; em até 3 s o compartilhamento some da outra tela. Repetir parando pelo botão do
navegador.

**Acceptance Scenarios**:

1. **Given** uma pessoa na sala sem compartilhar, **When** clica em "Compartilhar tela", **Then** o
   navegador mostra a escolha do que compartilhar, com as opções de tela inteira e de janela de um
   app.
2. **Given** a escolha aberta, **When** a pessoa escolhe a janela de um app e confirma, **Then** em
   até 5 s todos os outros da sala passam a ver o conteúdo dessa janela em destaque, identificado
   com o nome de quem está compartilhando, e a ouvir o som dela quando o navegador permitir
   enviá-lo.
3. **Given** a escolha aberta, **When** a pessoa escolhe a tela inteira e confirma, **Then** em até
   5 s todos os outros passam a ver a tela inteira dela em destaque.
4. **Given** a pessoa está compartilhando, **When** olha a própria sala, **Then** vê que está
   compartilhando (botão "Parar de compartilhar" e uma indicação "Você está compartilhando sua
   tela"), não vê a própria tela repetida em destaque e não ouve o próprio som de volta.
5. **Given** a pessoa está compartilhando, **When** clica em "Parar de compartilhar", **Then** em até
   3 s o compartilhamento some da tela de todos.
6. **Given** a pessoa está compartilhando, **When** para pelo botão do próprio navegador, **Then** em
   até 3 s o compartilhamento some da tela de todos e o botão do app volta a "Compartilhar tela".
7. **Given** a escolha aberta, **When** a pessoa cancela, **Then** nada é compartilhado, nenhuma
   mensagem de erro aparece e o botão continua "Compartilhar tela".
8. **Given** alguém está compartilhando, **When** uma pessoa nova entra na sala, **Then** ela já vê o
   compartilhamento em destaque em até 5 s, sem fazer nada.

---

### User Story 2 - Assistir em destaque, escolher entre compartilhamentos e tela cheia (Priority: P2)

Quem assiste vê um compartilhamento grande, acima das câmeras, e pode colocá-lo em tela cheia para
ver os detalhes (ex.: o mapa do jogo). Para sair, aperta Esc. Se várias pessoas estão
compartilhando ao mesmo tempo, os outros compartilhamentos aparecem menores, e quem assiste escolhe
qual fica em destaque.

**Why this priority**: o compartilhamento só é útil se dá para enxergar bem; a tela cheia é o modo
natural de assistir a um jogo. Depende da US1 para ter o que mostrar.

**Independent Test**: com alguém compartilhando, quem assiste verifica que o compartilhamento ocupa
mais espaço que qualquer câmera; clica em "Tela cheia"; o compartilhamento ocupa a tela inteira;
aperta Esc e volta à sala. Com duas pessoas compartilhando, uma terceira troca o destaque entre os
dois e ouve só o som do que está em destaque.

**Acceptance Scenarios**:

1. **Given** alguém está compartilhando e há câmeras ligadas, **When** os outros olham a sala,
   **Then** o compartilhamento aparece acima das câmeras e com área visivelmente maior que a de
   qualquer quadro de câmera.
2. **Given** o compartilhamento em destaque, **When** a pessoa clica em "Tela cheia", **Then** o
   compartilhamento ocupa a tela inteira do computador, sem outros elementos da sala por cima, e
   mantém a proporção original (sem cortar nem esticar a imagem).
3. **Given** o compartilhamento em tela cheia, **When** a pessoa aperta Esc, **Then** a tela cheia
   termina e a sala volta ao normal.
4. **Given** o compartilhamento em tela cheia, **When** quem compartilha para de compartilhar,
   **Then** a tela cheia termina sozinha em até 3 s e a sala volta ao normal.
5. **Given** o compartilhamento em destaque, **When** a pessoa olha a imagem, **Then** ela mantém a
   proporção original da tela ou janela compartilhada (sem cortar nem esticar).
6. **Given** duas ou mais pessoas compartilhando, **When** alguém olha a sala, **Then** vê um
   compartilhamento em destaque e os demais em miniaturas menores logo abaixo dele; cada miniatura
   mostra só um ícone de tela e o nome de quem compartilha, sem a imagem.
7. **Given** vários compartilhamentos, **When** a pessoa clica numa miniatura, **Then** em até 2 s a
   imagem desse compartilhamento aparece no destaque e o que estava em destaque vira miniatura (só
   com o nome); a escolha vale só para a tela dela.
8. **Given** a pessoa ainda não escolheu nenhum, **When** um novo compartilhamento começa, **Then**
   ele vai para o destaque; **Given** a pessoa escolheu um, **When** outro começa, **Then** o
   escolhido continua em destaque e o novo aparece como miniatura.
9. **Given** o compartilhamento em destaque termina, **When** ainda há outros, **Then** o que
   começou mais recentemente passa para o destaque.
10. **Given** vários compartilhamentos com som, **When** a pessoa assiste, **Then** ouve só o som
    do que está em destaque.

---

### User Story 3 - Compartilhamento indisponível ou negado (Priority: P3)

A permissão de compartilhar é negada, ou o navegador não permite compartilhar (como acontece em
celulares). A pessoa vê uma explicação clara e continua na sala, podendo assistir, ouvir, falar e
usar a câmera normalmente.

**Why this priority**: é um caminho de erro, mas certo de acontecer (amigos entrando pelo celular);
a pessoa precisa entender por que não consegue compartilhar e continuar assistindo.

**Independent Test**: abrir a sala num celular e verificar a explicação no lugar do botão
funcional, enquanto o compartilhamento de outra pessoa aparece normalmente; num computador, negar a
permissão e verificar a mensagem.

**Acceptance Scenarios**:

1. **Given** um navegador que não permite compartilhar a tela (ex.: celular), **When** a pessoa
   entra na sala, **Then** o botão "Compartilhar tela" aparece indisponível com a explicação "Seu
   navegador não permite compartilhar a tela. Para compartilhar, use um computador com Chrome, Edge
   ou Firefox. Você continua podendo assistir." e todo o resto da sala funciona.
2. **Given** a pessoa clica em "Compartilhar tela", **When** a permissão é negada pelo sistema ou
   pelo navegador, **Then** vê a mensagem "Não conseguimos compartilhar sua tela. Verifique se o
   navegador tem permissão para gravar a tela nas configurações do computador e tente de novo." e
   continua na sala.
3. **Given** compartilhar não foi possível, **When** a pessoa continua na sala, **Then** continua
   vendo o compartilhamento dos outros, as câmeras, ouvindo e falando como antes, e os outros não
   veem nenhum erro.

---

### Edge Cases

- **Várias pessoas compartilhando**: permitido, até todas as pessoas da sala; cada pessoa compartilha
  no máximo uma tela ou janela por vez. Como cada pessoa recebe só a imagem do compartilhamento em
  destaque, ter vários compartilhamentos não pesa mais na internet de quem assiste do que ter um.
- **Compartilhamento sem som**: quando o navegador não permite enviar o som (ex.: janela de um app
  no Mac), o compartilhamento acontece só com a imagem, sem mensagem de erro; para quem assiste, o
  nome de quem compartilha aparece com a marca "sem som".
- **Som do jogo e microfone**: o som compartilhado e a voz de quem compartilha chegam separados;
  desligar o microfone não corta o som do compartilhamento, e parar de compartilhar não desliga o
  microfone.
- **Quem compartilha sai da sala, recarrega ou perde a conexão**: o compartilhamento some para todos
  em até 3 s; ao recarregar, a pessoa volta sem compartilhar.
- **Janela compartilhada é fechada ou minimizada**: se o app compartilhado é fechado, o
  compartilhamento termina sozinho e some para todos em até 3 s; se a janela é minimizada, os
  outros podem ver a imagem parada até ela voltar (comportamento do sistema).
- **Cliques repetidos em "Compartilhar tela"**: enquanto a escolha está aberta, novos cliques não
  abrem outra escolha.
- **Compartilhamento não chega a alguém** (rede que bloqueia a conexão direta, como na T03/T04): no
  destaque, quem não consegue ver aparece "Não foi possível mostrar a tela de <nome>. Verifique sua
  conexão."; o resto da sala continua funcionando.
- **Navegador sem tela cheia disponível**: o botão "Tela cheia" não aparece; o compartilhamento
  continua em destaque.
- **Câmera ligada enquanto compartilha**: a câmera continua funcionando e aparecendo para os outros
  junto com o compartilhamento (T04); compartilhar não liga nem desliga câmera ou microfone.
- **Tela cheia e o navegador sai dela por outro meio** (ex.: tecla do sistema, trocar de aba): a sala
  volta ao normal, como ao apertar Esc.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda pessoa MUST entrar na sala sem compartilhar a tela, inclusive ao recarregar a
  página.
- **FR-002**: A sala MUST ter um botão sempre visível "Compartilhar tela"; ao clicar, a pessoa MUST
  poder escolher entre compartilhar a tela inteira ou a janela de um app específico.
- **FR-003**: Depois que a pessoa confirma a escolha, todos os outros presentes MUST começar a ver o
  compartilhamento em até 5 s, sem precisar fazer nada, identificado com o nome de quem compartilha.
  Quando o navegador permitir, o som da tela ou janela compartilhada MUST ir junto; quando não
  permitir, o compartilhamento MUST acontecer só com a imagem, sem mensagem de erro.
- **FR-004**: Enquanto compartilha, a pessoa MUST ver o botão "Parar de compartilhar" e a indicação
  "Você está compartilhando sua tela"; a própria tela MUST NOT aparecer em destaque nem em miniatura
  para ela, e o próprio som compartilhado MUST NOT tocar de volta para ela.
- **FR-005**: Parar pelo botão "Parar de compartilhar" ou pelo controle do próprio navegador MUST
  fazer o compartilhamento sumir da tela de todos em até 3 s; nos dois casos, o botão do app MUST
  voltar a "Compartilhar tela".
- **FR-006**: O compartilhamento MUST aparecer em destaque, acima das câmeras e com área maior que a
  de qualquer quadro de câmera, mantendo a proporção original da imagem.
- **FR-007**: Quem assiste MUST poder colocar o compartilhamento em tela cheia por um botão "Tela
  cheia"; apertar Esc MUST sair da tela cheia e voltar à sala.
- **FR-008**: Se o compartilhamento termina enquanto alguém o assiste em tela cheia, a tela cheia
  MUST terminar em até 3 s.
- **FR-009**: Quem entra numa sala com um compartilhamento em andamento MUST passar a vê-lo em até
  5 s automaticamente.
- **FR-010**: Se o navegador não permite compartilhar a tela, o botão MUST aparecer indisponível com
  a explicação de US3; a pessoa MUST continuar podendo assistir e usar o resto da sala.
- **FR-011**: Se a permissão de compartilhar for negada ou o compartilhamento falhar ao começar, a
  pessoa MUST ver uma mensagem em pt-BR que diga o que aconteceu e o que fazer; cancelar a escolha
  MUST NOT mostrar mensagem de erro.
- **FR-012**: Falhas de compartilhamento MUST afetar só a pessoa que as tem; os outros MUST NOT ver
  mensagens de erro por isso.
- **FR-013**: Compartilhar a tela MUST NOT mudar o estado do microfone nem da câmera, nem
  interromper a voz e os vídeos (T03, T04).
- **FR-014**: Se não for possível receber o compartilhamento de alguém, quem não o recebe MUST ver,
  no lugar do destaque, o nome dessa pessoa e uma mensagem em pt-BR dizendo que não foi possível
  mostrar a tela.
- **FR-015**: Ao sair da sala, o compartilhamento da pessoa MUST terminar e sumir para todos em até
  3 s.
- **FR-016**: Todos os textos e mensagens desta funcionalidade MUST estar em pt-BR, sem termos
  técnicos.
- **FR-017**: Várias pessoas MUST poder compartilhar ao mesmo tempo (no máximo um compartilhamento
  por pessoa). Quem assiste MUST ver um compartilhamento em destaque e os demais em miniaturas com
  um ícone de tela e o nome de quem compartilha, e MUST poder trocar o destaque clicando numa
  miniatura; a escolha vale só para a própria tela. A imagem (e o som) MUST chegar a cada pessoa
  apenas para o compartilhamento que ela tem em destaque; ao trocar, a imagem do novo destaque MUST
  aparecer em até 2 s.
- **FR-018**: Sem escolha da pessoa, o compartilhamento iniciado mais recentemente MUST ficar em
  destaque. Depois que a pessoa escolhe, a escolha MUST ser mantida enquanto aquele compartilhamento
  existir; quando o destacado termina, o mais recente dos restantes MUST ir para o destaque.
- **FR-019**: Quem assiste MUST ouvir só o som do compartilhamento em destaque; compartilhamentos
  sem som MUST ser identificados com a marca "sem som" junto ao nome.

### Key Entities

- **Participante** (da T02–T04): passa a ter o estado de compartilhamento (compartilhando ou não),
  conhecido por todos na sala. Começa sempre sem compartilhar e não é guardado depois que a pessoa
  sai ou recarrega a página.
- **Compartilhamento**: a imagem (e o som, quando o navegador permitir) da tela inteira ou da janela
  escolhida por um participante, sempre acompanhada do nome de quem compartilha e de se tem som.
  Existe só enquanto a pessoa está compartilhando; no máximo um por participante, vários por sala.
  Guarda quando começou, para decidir qual vai para o destaque.
- **Escolha de destaque**: qual compartilhamento cada pessoa está vendo em destaque. É individual
  (não afeta os outros), decide de qual compartilhamento a pessoa recebe imagem e som, e não é
  guardada depois que a pessoa sai ou recarrega a página.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos compartilhamentos iniciados, os outros presentes começam a ver em até 5 s
  após a pessoa confirmar a escolha.
- **SC-002**: Em 100% das paradas (pelo app, pelo navegador, ao fechar o app compartilhado ou ao sair
  da sala), o compartilhamento some para todos em até 3 s.
- **SC-003**: Uma pessoa consegue começar a compartilhar em no máximo 3 interações (clicar no botão,
  escolher a tela ou janela, confirmar) e em menos de 15 segundos.
- **SC-004**: Com o compartilhamento em destaque, numa internet doméstica comum que permita a
  conexão direta, textos de tamanho normal da tela compartilhada (ex.: chat do jogo) são legíveis em
  tela cheia, e movimentos rápidos aparecem sem travamentos que impeçam acompanhar o jogo.
- **SC-005**: Em 100% dos casos de permissão negada ou navegador sem suporte, a pessoa vê uma
  explicação em pt-BR e continua assistindo e conversando normalmente.
- **SC-006**: Pelo menos 9 em cada 10 pessoas conseguem compartilhar a janela de um jogo sem ajuda na
  primeira tentativa.
- **SC-007**: Com um compartilhamento em andamento e até 6 pessoas na sala, a voz continua sem cortes
  que impeçam entender o que é dito.
- **SC-008**: Com dois compartilhamentos ao mesmo tempo, quem assiste troca o destaque em 1 clique e
  vê a imagem do novo destaque em até 2 s.
- **SC-009**: Quando o navegador permite enviar o som, em 100% dos compartilhamentos em destaque
  quem assiste ouve o som da tela ou janela compartilhada.

## Assumptions

- Depende da T01–T04: sala, lista, limite de 6 pessoas, retorno ao recarregar, conexão direta entre
  as pessoas (sem servidor intermediário; mesma limitação em redes restritivas), câmeras e
  microfones.
- A escolha entre tela inteira e janela de app é feita pela janela de seleção do próprio navegador;
  as opções exatas (ex.: abas do navegador) variam entre navegadores.
- Compartilhar exige um navegador de computador que permita compartilhar a tela (Chrome, Edge ou
  Firefox atuais); celulares e tablets só assistem.
- No macOS, o navegador precisa de permissão de "Gravação de Tela" nas configurações do sistema; a
  mensagem de permissão negada orienta a verificar isso.
- O compartilhamento prioriza nitidez e fluidez suficientes para acompanhar um jogo; se a conexão
  de alguém ficar fraca, é aceitável perder qualidade de imagem para a voz continuar compreensível.
- O compartilhamento não é gravado nem guardado.
- O envio do som depende do navegador e do sistema (ex.: tela inteira ou aba no Chrome/Edge do
  Windows; no Mac, em geral, só aba); a escolha de incluir o som é feita na janela de seleção do
  próprio navegador.
- Não há volume separado por compartilhamento nesta versão.
- Ficam para tarefas futuras: anotar ou desenhar sobre a tela, controle remoto da tela de outra
  pessoa, escolher a qualidade manualmente, ver vários compartilhamentos lado a lado do mesmo
  tamanho e o anfitrião interromper o compartilhamento de outros.
