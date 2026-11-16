# Feature Specification: T02 · Entrar na sala pelo link

**Feature Branch**: `002-entrar-sala-link`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "T02 · Entrar na sala pelo link — Quem recebe o link entra na sala e vê
quem está lá. Abrir o link leva para a sala. Antes de entrar, a pessoa informa um nome de exibição.
Depois de entrar, todos veem a lista de participantes com os nomes, atualizada em até 3 s quando
alguém entra ou sai. Um link de sala que não existe mostra uma mensagem clara e um botão para criar
uma sala nova. A sala aceita até 6 pessoas. A 7ª vê a mensagem 'Sala cheia' e não entra."

## Clarifications

### Session 2026-11-16

- Q: Quando e como o anfitrião informa o nome de exibição? → A: Na página inicial, num campo ao
  lado de "Criar sala", obrigatório para criar a sala.
- Q: Se o anfitrião sai enquanto outras pessoas continuam na sala, o que acontece com a sala e com o
  papel de anfitrião? → A: O papel passa automaticamente para quem está na sala há mais tempo.
- Q: Quanto tempo a sala espera o anfitrião voltar antes de passar o papel adiante? → A: Cerca de
  10 segundos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar na sala com um nome e ver quem está lá (Priority: P1)

Uma pessoa recebe o link de um amigo, abre no navegador, digita como quer ser chamada e entra na
sala. Lá dentro ela vê a lista de quem está na sala, com os nomes. Quem já estava na sala vê o nome
dela aparecer na lista.

**Why this priority**: é o que transforma uma sala de uma pessoa só em um encontro entre amigos;
sem isso, o link criado na T01 não leva a lugar nenhum.

**Independent Test**: criar uma sala (T01), abrir o link em outro navegador, informar um nome e
entrar; verificar que as duas telas mostram os dois nomes na lista de participantes.

**Acceptance Scenarios**:

1. **Given** uma sala existente com vaga, **When** alguém abre o link dela, **Then** vê uma tela
   pedindo um nome de exibição antes de entrar, e ainda não aparece na lista de participantes.
2. **Given** a tela de nome, **When** a pessoa informa um nome válido e confirma, **Then** entra na
   sala e vê a lista de participantes com o próprio nome identificado como "(você)".
3. **Given** a pessoa tenta confirmar com o nome vazio ou só com espaços, **When** confirma,
   **Then** não entra e vê uma mensagem em pt-BR pedindo para informar um nome.
4. **Given** já há pessoas na sala, **When** alguém novo entra, **Then** em até 3 s todos os
   presentes veem o novo nome na lista.
5. **Given** há várias pessoas na sala, **When** uma delas sai (fecha a aba, navega para outra
   página ou perde a conexão), **Then** em até 3 s o nome dela some da lista de todos os demais.
6. **Given** a pessoa já entrou nesta sala antes neste navegador, **When** recarrega a página,
   **Then** volta para a sala com o mesmo nome, sem precisar digitá-lo de novo.

---

### User Story 2 - Link de sala que não existe (Priority: P2)

Alguém abre um link de sala que nunca existiu, foi digitado errado ou cuja sala já expirou. Em vez
de uma tela quebrada, vê uma mensagem clara e um botão para criar uma sala nova.

**Why this priority**: links antigos e errados vão acontecer com frequência entre amigos; sem
isso, a pessoa fica sem saber o que fazer.

**Independent Test**: abrir `/sala/<id inventado>` e verificar a mensagem e o botão; clicar no
botão e verificar que leva para a criação de sala.

**Acceptance Scenarios**:

1. **Given** um link de sala inexistente ou expirada, **When** alguém o abre, **Then** vê a
   mensagem "Esta sala não existe ou já foi encerrada." e um botão "Criar nova sala", sem que a tela
   de nome seja exibida.
2. **Given** a mensagem de sala inexistente, **When** a pessoa clica em "Criar nova sala",
   **Then** é levada para a página inicial, onde pode criar uma sala com um clique (T01).
3. **Given** a pessoa está na tela de nome de uma sala, **When** a sala expira antes de ela
   confirmar, **Then** ao confirmar vê a mensagem de sala inexistente.

---

### User Story 3 - Limite de 6 pessoas por sala (Priority: P3)

Uma sala comporta no máximo 6 pessoas ao mesmo tempo. Quem tenta entrar quando já há 6 vê a
mensagem "Sala cheia" e não entra.

**Why this priority**: protege a qualidade do compartilhamento de tela para o grupo; é um limite,
não um fluxo principal.

**Independent Test**: com 6 pessoas na sala, abrir o link num 7º navegador e verificar "Sala
cheia"; fazer uma pessoa sair e verificar que o 7º consegue entrar.

**Acceptance Scenarios**:

1. **Given** uma sala com 6 pessoas, **When** uma 7ª pessoa abre o link, **Then** vê a mensagem
   "Sala cheia" com uma explicação em pt-BR, não vê a tela de nome e não entra na sala.
2. **Given** uma sala com 5 pessoas e duas pessoas na tela de nome, **When** as duas confirmam,
   **Then** a primeira a confirmar entra e a segunda vê "Sala cheia".
3. **Given** uma sala cheia, **When** alguém sai, **Then** uma nova pessoa consegue entrar.
4. **Given** uma sala cheia, **When** os 6 presentes olham a lista, **Then** a lista mostra os 6
   nomes e quem foi recusado não aparece.

---

### Edge Cases

- **Nomes repetidos**: permitidos; cada pessoa vê o próprio nome marcado com "(você)" para se
  distinguir.
- **Nome longo**: nomes com mais de 30 caracteres não são aceitos; a interface impede digitar além
  do limite.
- **Espaços nas pontas**: são removidos antes de usar o nome.
- **Mesma pessoa em duas abas**: o navegador é uma pessoa só na sala. Abrir a mesma sala numa
  segunda aba do mesmo navegador leva a pessoa para a aba nova; a aba antiga mostra "Esta sala foi
  aberta em outra aba." e sai da sala. (Ajustado no plano: é o que garante que recarregar a página
  nunca duplica a pessoa nem tira o papel de anfitrião.)
- **Recarregar a página**: a pessoa sai e volta. Se nesse intervalo alguém ocupar a última vaga, ela
  vê "Sala cheia" (aceito, dado o público de amigos).
- **Anfitrião**: informa o nome na página inicial antes de criar a sala (FR-011); aparece na lista
  identificado como anfitrião e ocupa uma das 6 vagas.
- **Anfitrião sai e é o único na sala**: não há para quem transferir; a sala fica vazia e segue a
  regra de expiração da T01 (~1 minuto). Se ele volta nesse período, continua anfitrião.
- **Anfitrião recarrega a página**: volta em menos de 10 s e continua anfitrião; os demais podem ver
  o nome dele sumir e voltar na lista.
- **Empate de tempo de entrada**: o papel vai para quem entrou primeiro segundo a ordem registrada
  pela sala; nunca fica com duas pessoas.
- **Criar sala com nome vazio**: a sala não é criada e a pessoa vê a mensagem pedindo um nome.
- **Perda de conexão de quem está na sala**: a pessoa vê a mensagem de conexão perdida (T01) e some
  da lista dos demais em até 3 s.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Abrir o link de uma sala existente e com vaga MUST mostrar uma tela pedindo um nome de
  exibição, com o botão "Entrar na sala".
- **FR-002**: O nome de exibição MUST ter de 1 a 30 caracteres após remover espaços nas pontas; fora
  disso, a pessoa MUST NOT entrar e MUST ver uma mensagem em pt-BR explicando o problema.
- **FR-003**: A pessoa só MUST contar como presente na sala (e aparecer na lista) depois de
  confirmar um nome válido.
- **FR-004**: Dentro da sala, todas as pessoas MUST ver a lista de participantes presentes, com os
  nomes de exibição.
- **FR-005**: Na lista, cada pessoa MUST ver o próprio nome identificado com "(você)", e o anfitrião
  MUST aparecer identificado como "anfitrião" para todos.
- **FR-006**: Quando alguém entra ou sai, a lista de todas as pessoas presentes MUST ser atualizada
  em até 3 s.
- **FR-007**: O navegador MUST lembrar o último nome usado e preenchê-lo automaticamente na tela de
  nome; ao recarregar a página de uma sala em que já entrou, a pessoa MUST voltar direto para a sala
  com o mesmo nome.
- **FR-008**: Abrir o link de uma sala inexistente ou expirada MUST mostrar a mensagem "Esta sala
  não existe ou já foi encerrada." e o botão "Criar nova sala", que leva à página inicial.
- **FR-009**: A sala MUST aceitar no máximo 6 pessoas presentes ao mesmo tempo, incluindo o
  anfitrião.
- **FR-010**: Quem tenta entrar numa sala com 6 pessoas MUST ver a mensagem "Sala cheia" com a
  explicação "Esta sala já tem 6 pessoas. Tente de novo quando alguém sair." e MUST NOT entrar. A
  verificação MUST acontecer ao abrir o link e novamente ao confirmar o nome.
- **FR-011**: A página inicial MUST ter um campo de nome de exibição ao lado do botão "Criar sala",
  com as mesmas regras de FR-002 e preenchido automaticamente com o último nome usado (FR-007).
  "Criar sala" MUST NOT criar a sala enquanto o nome for inválido, mostrando a mensagem de FR-002.
  O anfitrião entra na sala já com esse nome, sem passar pela tela de nome.
- **FR-012**: Todos os textos e mensagens desta funcionalidade MUST estar em pt-BR, sem termos
  técnicos.
- **FR-013**: Se o anfitrião sai da sala e não volta em até 10 s (tempo suficiente para recarregar
  a página), o papel de anfitrião MUST passar automaticamente para a pessoa presente há mais tempo, e
  a lista de todos MUST refletir o novo anfitrião em até 3 s. A sala continua normalmente para os
  demais.
- **FR-014**: Se o anfitrião volta dentro dos 10 s, MUST continuar sendo o anfitrião. Se volta
  depois que o papel foi transferido, MUST entrar como participante comum.
- **FR-015**: Quem recebe o papel de anfitrião MUST ser reconhecido como tal ao recarregar a página
  no mesmo navegador, com as mesmas regras do anfitrião original (T01 FR-015).

### Key Entities

- **Sala** (da T01): passa a ter capacidade máxima de 6 participantes e sempre no máximo um
  anfitrião; o anfitrião pode mudar ao longo da vida da sala (FR-013).
- **Participante**: uma pessoa presente na sala. Atributos: nome de exibição (1–30 caracteres),
  se é o anfitrião, momento de entrada (define quem herda o papel de anfitrião). Deixa de existir
  quando a pessoa sai. Não está ligado a nenhuma conta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Quem recebe o link entra na sala em até 2 interações (digitar o nome e confirmar)
  e em menos de 15 segundos.
- **SC-002**: Em 100% das entradas e saídas, a lista de participantes de todos os presentes reflete
  a mudança em até 3 s.
- **SC-003**: Em 100% das tentativas com a sala cheia, a 7ª pessoa vê "Sala cheia" e a sala
  continua com no máximo 6 participantes, inclusive com várias pessoas tentando entrar ao mesmo
  tempo.
- **SC-004**: 100% dos links inexistentes ou expirados mostram a mensagem e o botão "Criar nova
  sala", sem tela em branco ou erro técnico.
- **SC-005**: Pelo menos 9 em cada 10 pessoas que recebem um link conseguem entrar na sala sem
  ajuda na primeira tentativa.
- **SC-006**: Em 100% dos casos em que o anfitrião sai e não volta em 10 s com outras pessoas na
  sala, exatamente uma pessoa passa a ser anfitriã e todos veem isso na lista em até 3 s depois da
  transferência.

## Assumptions

- Depende da T01 (criar sala, link, anfitrião, expiração da sala vazia após ~1 minuto).
- **Altera a T01**: criar sala deixa de ser "sem preencher nada" (T01 FR-001/FR-002). Agora é
  informar o nome e clicar em "Criar sala"; quando o navegador já lembra o nome, continua sendo um
  clique. A cópia automática do link e o resto do fluxo da T01 não mudam.
- O nome de exibição é só um apelido para a sala: não é verificado, não é único e não fica
  guardado no servidor depois que a pessoa sai.
- Quem está só na tela de nome não mantém a sala viva nem ocupa vaga.
- O limite de 6 é fixo nesta versão; não há configuração por sala.
- Não há fila de espera nem aviso automático quando uma vaga abre.
- Esta tarefa resolve o que a T01 deixou em aberto sobre o papel de anfitrião quando ele sai com
  outras pessoas na sala.
- Trocar o nome depois de entrar, expulsar pessoas e o compartilhamento de tela em si ficam para
  tarefas futuras.
