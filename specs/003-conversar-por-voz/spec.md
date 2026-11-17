# Feature Specification: T03 · Conversar por voz

**Feature Branch**: `003-conversar-por-voz`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "T03 · Conversar por voz — A pessoa entra com o microfone desligado. Um
botão liga e desliga o microfone. Com ele ligado, todos os outros ouvem a pessoa. Todos veem quem
está com o microfone ligado ou desligado. Se a permissão do microfone for negada, aparece uma
mensagem explicando como liberar, e o resto da sala continua funcionando."

## Clarifications

### Session 2026-11-16

- Q: Quando a rede de alguém impedir a voz de chegar direto entre duas pessoas, a sala deve usar um
  servidor intermediário para a voz chegar mesmo assim? → A: Não; só conexão direta. Quando ela
  falha, a pessoa vê a mensagem de FR-014 (aceito nesta versão).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ligar o microfone e ser ouvido (Priority: P1)

Uma pessoa entra na sala com o microfone desligado. Quando quer falar, clica no botão do microfone,
autoriza o uso na primeira vez e passa a ser ouvida por todos os outros da sala. Quando clica de
novo, o microfone desliga e ninguém mais a ouve.

**Why this priority**: é o próprio objetivo da tarefa: os amigos conversarem dentro da sala. Sem
isso, nenhuma das outras histórias faz sentido.

**Independent Test**: com duas pessoas na sala (T02) em computadores diferentes, uma liga o
microfone e fala; a outra ouve. A primeira desliga o microfone e continua falando; a outra deixa de
ouvir.

**Acceptance Scenarios**:

1. **Given** uma pessoa acabou de entrar na sala, **When** a sala aparece, **Then** o microfone dela
   está desligado, ninguém a ouve e o navegador ainda não pediu permissão de microfone.
2. **Given** o microfone desligado e a permissão ainda não concedida, **When** a pessoa clica no
   botão do microfone, **Then** o navegador pede a permissão; ao autorizar, o microfone liga.
3. **Given** o microfone ligado, **When** a pessoa fala, **Then** todas as outras pessoas da sala a
   ouvem, sem precisar fazer nada.
4. **Given** o microfone ligado, **When** a pessoa clica no botão do microfone, **Then** ele desliga
   e, em até 1 s, ninguém mais a ouve.
5. **Given** a permissão já foi concedida antes, **When** a pessoa liga o microfone de novo,
   **Then** ele liga sem nova pergunta do navegador.
6. **Given** várias pessoas com o microfone ligado, **When** falam ao mesmo tempo, **Then** cada
   pessoa ouve todas as outras, mas não ouve a própria voz.
7. **Given** alguém está com o microfone ligado, **When** uma pessoa nova entra na sala, **Then** a
   pessoa nova passa a ouvi-la sem fazer nada.

---

### User Story 2 - Ver quem está com o microfone ligado (Priority: P2)

Na lista de participantes, cada pessoa aparece com a indicação de microfone ligado ou desligado.
Assim todos sabem quem pode ouvi-los falar e quem esqueceu o microfone desligado.

**Why this priority**: evita a situação mais comum em conversa por voz ("você está mudo?") e dá
segurança de saber quando a própria voz está saindo; depende da US1 para ter algo a indicar.

**Independent Test**: com três pessoas na sala, uma liga e desliga o microfone; as três telas mostram
a mudança na lista de participantes.

**Acceptance Scenarios**:

1. **Given** uma sala com várias pessoas, **When** alguém olha a lista de participantes, **Then**
   cada nome mostra se o microfone daquela pessoa está ligado ou desligado.
2. **Given** uma pessoa liga ou desliga o microfone, **When** a mudança acontece, **Then** em até
   3 s a indicação muda na tela de todos os presentes.
3. **Given** uma pessoa nova entra na sala, **When** a lista aparece para ela, **Then** já mostra o
   estado correto do microfone de cada pessoa, e o dela aparece como desligado para todos.
4. **Given** o próprio botão do microfone, **When** a pessoa olha para ele, **Then** ele mostra
   claramente se o microfone dela está ligado ou desligado, com texto que descreve a ação
   ("Ligar microfone" / "Desligar microfone").

---

### User Story 3 - Permissão do microfone negada (Priority: P3)

A pessoa clica no botão do microfone, mas a permissão é negada (agora ou numa visita anterior). Ela
vê uma mensagem em pt-BR explicando como liberar o microfone no navegador e continua na sala,
ouvindo os outros e vendo a lista normalmente.

**Why this priority**: é um caminho de erro, mas comum; sem ele, a pessoa fica sem saber por que
ninguém a ouve, e a sala não pode quebrar por causa disso.

**Independent Test**: bloquear o microfone para o site no navegador, entrar na sala, clicar no botão
do microfone e verificar a mensagem; verificar que a pessoa continua ouvindo quem fala e vendo a
lista atualizada.

**Acceptance Scenarios**:

1. **Given** a pessoa clica no botão do microfone, **When** nega a permissão no navegador (ou ela já
   estava bloqueada), **Then** vê a mensagem "Não conseguimos usar seu microfone. Para liberar,
   clique no ícone de cadeado ao lado do endereço do site, permita o microfone e clique em 'Ligar
   microfone' de novo." e o microfone continua desligado.
2. **Given** a permissão foi negada, **When** a pessoa continua na sala, **Then** continua ouvindo
   quem está com o microfone ligado, vendo a lista de participantes e podendo copiar o link, como
   antes.
3. **Given** a permissão foi negada, **When** os outros olham a lista, **Then** veem a pessoa com o
   microfone desligado, sem nenhum aviso de erro para eles.
4. **Given** a pessoa liberou o microfone no navegador seguindo a mensagem, **When** clica de novo
   no botão do microfone, **Then** o microfone liga e a mensagem some.

---

### Edge Cases

- **Nenhum microfone no computador**: ao clicar no botão, a pessoa vê "Não encontramos nenhum
  microfone. Conecte um microfone e tente de novo." e continua na sala.
- **Microfone em uso por outro programa ou outra falha ao ligar**: a pessoa vê "Não foi possível
  ligar seu microfone. Feche outros programas que possam estar usando o microfone e tente de novo."
  e continua na sala.
- **Microfone desconectado ou permissão retirada com ele ligado**: o microfone passa a desligado, a
  pessoa vê a mensagem correspondente e todos veem o estado desligado em até 3 s.
- **Cliques rápidos seguidos no botão**: o estado final é o do último clique; enquanto a permissão
  está sendo pedida, novos cliques não abrem outro pedido.
- **Recarregar a página**: a pessoa volta para a sala (T02) com o microfone desligado, mesmo que
  estivesse ligado antes.
- **Sair da sala**: ao sair (fechar a aba, navegar para outra página, perder a conexão), o
  microfone é liberado e o navegador deixa de indicar que ele está em uso.
- **Navegador bloqueia o som de chegada**: se o navegador não deixar tocar a voz dos outros
  automaticamente (ex.: ao voltar direto para a sala depois de recarregar), a pessoa vê o botão
  "Ativar som"; ao clicar, passa a ouvir todos.
- **Voz não chega a alguém** (ex.: rede de empresa, faculdade ou celular que bloqueia a conexão
  direta entre duas pessoas; não há servidor intermediário para contornar isso nesta versão): quem
  não consegue ouvir alguém com o microfone ligado vê "Não foi possível ouvir <nome>. Verifique sua
  conexão." em vez de ficar em silêncio sem explicação; o resto da sala continua funcionando.
- **Eco**: quem usa caixas de som em vez de fone não deve fazer os outros ouvirem a própria voz de
  volta de forma incômoda (ver Assumptions).
- **Sala cheia (6 pessoas) com todos de microfone ligado**: todos ouvem todos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda pessoa MUST entrar na sala (inclusive o anfitrião e quem volta ao recarregar a
  página) com o microfone desligado.
- **FR-002**: A permissão de microfone MUST ser pedida só quando a pessoa clica para ligar o
  microfone, nunca ao entrar na sala.
- **FR-003**: A sala MUST ter um botão sempre visível que liga e desliga o microfone da própria
  pessoa, com texto que descreve a ação: "Ligar microfone" quando desligado e "Desligar microfone"
  quando ligado.
- **FR-004**: Com o microfone ligado, a voz da pessoa MUST ser ouvida por todas as outras pessoas
  presentes na sala, sem que elas precisem fazer nada, com atraso que não atrapalhe a conversa (até
  cerca de 1 s).
- **FR-005**: Com o microfone desligado, nenhuma outra pessoa MUST ouvir a pessoa; ao desligar,
  isso MUST valer em até 1 s.
- **FR-006**: Ninguém MUST ouvir a própria voz pela sala.
- **FR-007**: Quem entra numa sala onde alguém já está com o microfone ligado MUST passar a ouvir
  essa pessoa automaticamente.
- **FR-008**: A lista de participantes MUST mostrar, para cada pessoa, se o microfone dela está
  ligado ou desligado, de forma visível sem precisar passar o mouse e com texto alternativo em pt-BR
  ("microfone ligado" / "microfone desligado").
- **FR-009**: Quando alguém liga ou desliga o microfone (por clique ou por falha), a indicação MUST
  ser atualizada na tela de todos os presentes em até 3 s.
- **FR-010**: Se a permissão de microfone for negada ou estiver bloqueada, a pessoa MUST ver a
  mensagem de US3 explicando como liberar, o microfone MUST continuar desligado e a pessoa MUST
  poder tentar de novo pelo mesmo botão.
- **FR-011**: Qualquer falha ao ligar ou manter o microfone (sem microfone, microfone em uso,
  dispositivo desconectado) MUST deixar o microfone desligado e mostrar uma mensagem em pt-BR que
  diga o que aconteceu e o que fazer (ver Edge Cases).
- **FR-012**: Falhas de microfone MUST afetar só a pessoa que as tem: ela MUST continuar na sala,
  ouvindo os outros, vendo a lista atualizada e usando as demais funções; as outras pessoas MUST NOT
  ver mensagens de erro por isso.
- **FR-013**: Se o navegador impedir tocar a voz dos outros automaticamente, a sala MUST mostrar o
  botão "Ativar som", que passa a tocar a voz de todos quando clicado.
- **FR-014**: A voz MUST ir diretamente de uma pessoa para a outra, sem servidor intermediário que
  repasse o áudio. Se a conexão direta com uma pessoa que está com o microfone ligado não for
  possível, quem não a ouve MUST ver uma mensagem em pt-BR dizendo de quem não está ouvindo; o resto
  da sala MUST continuar funcionando.
- **FR-015**: Ao sair da sala, o microfone da pessoa MUST ser liberado.
- **FR-016**: Todos os textos e mensagens desta funcionalidade MUST estar em pt-BR, sem termos
  técnicos.

### Key Entities

- **Participante** (da T02): passa a ter o estado do microfone (ligado ou desligado), visível para
  todos na sala. Começa sempre desligado e não é guardado depois que a pessoa sai ou recarrega a
  página.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que acabou de entrar consegue ser ouvida pelos outros em no máximo
  2 interações (clicar no botão e autorizar) e em menos de 10 segundos.
- **SC-002**: Em 100% das vezes em que alguém desliga o microfone, os outros deixam de ouvi-lo em
  até 1 s.
- **SC-003**: Em 100% das mudanças de microfone, todos os presentes veem o novo estado em até 3 s.
- **SC-004**: Em 100% das entradas na sala, o microfone começa desligado e ninguém ouve a pessoa
  antes de ela ligá-lo.
- **SC-005**: Em 100% dos casos de permissão negada ou falha de microfone, a pessoa vê uma mensagem
  explicativa em pt-BR e continua ouvindo e vendo a sala normalmente.
- **SC-006**: Com 6 pessoas na sala e todas de microfone ligado, cada uma consegue conversar com as
  outras sem cortes que impeçam entender o que é dito, numa conexão de internet doméstica comum que permita
  a conexão direta entre as pessoas.
- **SC-007**: Pelo menos 9 em cada 10 pessoas conseguem ligar o microfone e ser ouvidas sem ajuda na
  primeira tentativa.

## Assumptions

- Depende da T01 (sala, anfitrião) e da T02 (entrar na sala, lista de participantes, limite de 6
  pessoas, retorno ao recarregar).
- Não há "apertar para falar": o microfone ligado transmite continuamente até ser desligado.
- O estado do microfone não é lembrado entre visitas; toda entrada começa com ele desligado, por
  privacidade.
- Supressão de eco e de ruído usa o comportamento padrão que o navegador já oferece; não há ajuste
  manual. Recomendar fone de ouvido não faz parte da interface nesta versão.
- O anfitrião não tem poderes sobre o microfone dos outros nesta versão.
- Os participantes estão, na maioria, em internet doméstica, onde a conexão direta entre duas
  pessoas costuma funcionar. Em redes restritivas, algumas pessoas podem não se ouvir; um servidor
  intermediário de voz pode ser avaliado numa tarefa futura se isso acontecer na prática.
- Ficam para tarefas futuras: desligar o microfone de outras pessoas, indicar quem está falando no
  momento, ajustar volume por pessoa, escolher qual microfone ou saída de som usar, atalhos de
  teclado e vídeo/câmera.
- A mensagem de permissão negada usa uma instrução genérica (ícone ao lado do endereço do site), que
  vale para os navegadores mais comuns; não há instruções específicas por navegador.
