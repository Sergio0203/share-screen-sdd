# Feature Specification: T04 · Ativar a webcam

**Feature Branch**: `004-ativar-webcam`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "T04 · Ativar a webcam — A pessoa entra com a câmera desligada. Um
botão liga e desliga a câmera. Com ela ligada, todos os outros veem o vídeo da pessoa, identificado
pelo nome. Desligar a câmera faz o vídeo sumir para todos em até 3 s. Se a permissão da câmera for
negada, aparece uma mensagem explicando como liberar, e o resto da sala continua funcionando."

## Clarifications

### Session 2026-11-16

- Q: A lista de participantes deve mostrar quem está com a câmera ligada, como já mostra o
  microfone? → A: Sim; cada nome ganha um indicador de câmera ligada/desligada, ao lado do de
  microfone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ligar a câmera e ser visto (Priority: P1)

Uma pessoa entra na sala com a câmera desligada. Quando quer aparecer, clica no botão da câmera,
autoriza o uso na primeira vez e passa a ser vista por todos os outros da sala, num quadro com o
nome dela. Quando clica de novo, a câmera desliga e o quadro dela some para todos.

**Why this priority**: é o objetivo da tarefa: os amigos se verem durante a conversa. Sem isso, as
outras histórias não têm o que mostrar.

**Independent Test**: com duas pessoas na sala (T02) em navegadores diferentes, uma liga a câmera;
a outra vê o vídeo com o nome dela. A primeira desliga; em até 3 s o vídeo some da tela da outra.

**Acceptance Scenarios**:

1. **Given** uma pessoa acabou de entrar na sala, **When** a sala aparece, **Then** a câmera dela
   está desligada, ninguém a vê e o navegador ainda não pediu permissão de câmera.
2. **Given** a câmera desligada e a permissão ainda não concedida, **When** a pessoa clica no botão
   da câmera, **Then** o navegador pede a permissão; ao autorizar, a câmera liga.
3. **Given** a câmera ligada, **When** os outros olham a sala, **Then** veem o vídeo da pessoa num
   quadro identificado com o nome de exibição dela, sem precisar fazer nada.
4. **Given** a câmera ligada, **When** a pessoa olha a própria tela, **Then** vê a própria imagem
   num quadro marcado com "(você)", para saber como está aparecendo.
5. **Given** a câmera ligada, **When** a pessoa clica no botão da câmera, **Then** ela desliga e, em
   até 3 s, o quadro da pessoa some da tela de todos.
6. **Given** alguém está com a câmera ligada, **When** uma pessoa nova entra na sala, **Then** a
   pessoa nova já vê esse vídeo, sem fazer nada.
7. **Given** uma sala com várias pessoas, **When** alguém liga ou desliga a câmera, **Then** em até
   3 s a lista de participantes de todos mostra o novo estado da câmera dessa pessoa, e quem entra
   depois já vê o estado correto.
8. **Given** a permissão já foi concedida antes, **When** a pessoa liga a câmera de novo, **Then**
   ela liga sem nova pergunta do navegador.

---

### User Story 2 - Câmera e microfone independentes (Priority: P2)

A pessoa pode estar com a câmera ligada e o microfone desligado, ou o contrário. Ligar ou desligar
um não muda o outro, e a conversa por voz (T03) continua funcionando enquanto os vídeos aparecem e
somem.

**Why this priority**: é comum querer aparecer sem falar (ou falar sem aparecer); se um controle
interferir no outro, a pessoa pode ser ouvida ou vista sem querer.

**Independent Test**: com duas pessoas, ligar só a câmera (o outro vê e não ouve); ligar o
microfone (o outro vê e ouve); desligar a câmera (o outro continua ouvindo).

**Acceptance Scenarios**:

1. **Given** microfone e câmera desligados, **When** a pessoa liga só a câmera, **Then** os outros
   a veem, mas não a ouvem; na lista, o indicador de câmera dela aparece ligado e o de microfone
   continua desligado.
2. **Given** microfone ligado, **When** a pessoa liga e desliga a câmera, **Then** os outros
   continuam ouvindo a pessoa sem interrupção perceptível.
3. **Given** câmera ligada, **When** a pessoa desliga o microfone, **Then** os outros continuam
   vendo o vídeo dela.

---

### User Story 3 - Permissão da câmera negada (Priority: P3)

A pessoa clica no botão da câmera, mas a permissão é negada (agora ou antes). Ela vê uma mensagem
em pt-BR explicando como liberar a câmera no navegador e continua na sala, vendo, ouvindo e falando
normalmente.

**Why this priority**: é um caminho de erro, mas comum; sem ele, a pessoa não sabe por que ninguém
a vê, e a sala não pode quebrar por causa disso.

**Independent Test**: bloquear a câmera para o site, entrar na sala, clicar no botão da câmera e
verificar a mensagem; verificar que a pessoa continua vendo os vídeos dos outros, ouvindo e podendo
ligar o microfone.

**Acceptance Scenarios**:

1. **Given** a pessoa clica no botão da câmera, **When** nega a permissão (ou ela já estava
   bloqueada), **Then** vê a mensagem "Não conseguimos usar sua câmera. Para liberar, clique no
   ícone de cadeado ao lado do endereço do site, permita a câmera e clique em 'Ligar câmera' de
   novo." e a câmera continua desligada.
2. **Given** a permissão da câmera foi negada, **When** a pessoa continua na sala, **Then** continua
   vendo os vídeos dos outros, ouvindo, usando o microfone e copiando o link, como antes.
3. **Given** a permissão da câmera foi negada, **When** os outros olham a sala, **Then** não veem
   quadro da pessoa, veem a câmera dela como desligada na lista e nenhum aviso de erro.
4. **Given** a pessoa liberou a câmera seguindo a mensagem, **When** clica de novo no botão da
   câmera, **Then** a câmera liga e a mensagem some.

---

### Edge Cases

- **Nenhuma câmera no computador**: ao clicar no botão, a pessoa vê "Não encontramos nenhuma câmera.
  Conecte uma câmera e tente de novo." e continua na sala.
- **Câmera em uso por outro programa ou outra falha ao ligar**: a pessoa vê "Não foi possível ligar
  sua câmera. Feche outros programas que possam estar usando a câmera e tente de novo." e continua
  na sala.
- **Câmera desconectada ou permissão retirada com ela ligada**: a câmera passa a desligada, a pessoa
  vê "Sua câmera foi desconectada. Verifique a câmera e clique em 'Ligar câmera' de novo." e o
  quadro dela some para todos em até 3 s.
- **Permissão de microfone já negada**: não impede ligar a câmera (e vice-versa); cada permissão é
  tratada separadamente.
- **Cliques rápidos seguidos no botão**: enquanto a permissão está sendo pedida, novos cliques não
  abrem outro pedido.
- **Recarregar a página**: a pessoa volta para a sala (T02) com a câmera desligada, mesmo que
  estivesse ligada antes; o quadro dela some para os outros até ela ligar de novo.
- **Sair da sala**: ao sair (fechar a aba, navegar para outra página, perder a conexão), a câmera é
  liberada (a luz da câmera apaga) e o quadro da pessoa some para todos em até 3 s.
- **Vídeo não chega a alguém** (rede que bloqueia a conexão direta, como na T03): no lugar do vídeo,
  quem não consegue ver aparece um quadro com o nome e "Não foi possível mostrar o vídeo de <nome>.
  Verifique sua conexão."; o resto da sala continua funcionando.
- **Sala cheia (6 pessoas) com todas as câmeras ligadas**: todos veem os 6 quadros (5 dos outros e
  o próprio) sem que nenhum fique escondido ou cortado.
- **Nome longo** (até 30 caracteres, T02): o nome no quadro aparece inteiro ou abreviado com
  reticências, sem cobrir o vídeo inteiro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda pessoa MUST entrar na sala (inclusive o anfitrião e quem volta ao recarregar a
  página) com a câmera desligada.
- **FR-002**: A permissão de câmera MUST ser pedida só quando a pessoa clica para ligar a câmera,
  nunca ao entrar na sala nem ao ligar o microfone.
- **FR-003**: A sala MUST ter um botão sempre visível que liga e desliga a câmera da própria
  pessoa, com texto que descreve a ação: "Ligar câmera" quando desligada e "Desligar câmera" quando
  ligada.
- **FR-004**: Com a câmera ligada, todas as outras pessoas presentes MUST ver o vídeo da pessoa,
  sem precisar fazer nada, num quadro identificado com o nome de exibição dela.
- **FR-005**: Com a câmera ligada, a própria pessoa MUST ver a própria imagem num quadro marcado com
  "(você)".
- **FR-006**: Ao desligar a câmera (por clique, falha ou saída da sala), o quadro da pessoa MUST
  sumir da tela de todos os presentes em até 3 s, e ninguém MUST continuar vendo imagem dela.
- **FR-007**: Quem entra numa sala onde alguém já está com a câmera ligada MUST passar a ver esse
  vídeo automaticamente.
- **FR-008**: Só pessoas com a câmera ligada MUST ter quadro de vídeo; os quadros MUST caber na tela
  ao mesmo tempo, até 6, sem esconder a lista de participantes nem os botões da sala.
- **FR-009**: A câmera e o microfone MUST ser controlados de forma independente: ligar ou desligar
  um MUST NOT mudar o estado do outro nem interromper a voz (T03).
- **FR-010**: Se a permissão de câmera for negada ou estiver bloqueada, a pessoa MUST ver a mensagem
  de US3 explicando como liberar, a câmera MUST continuar desligada e a pessoa MUST poder tentar de
  novo pelo mesmo botão.
- **FR-011**: Qualquer falha ao ligar ou manter a câmera (sem câmera, câmera em uso, desconectada)
  MUST deixar a câmera desligada e mostrar uma mensagem em pt-BR que diga o que aconteceu e o que
  fazer (ver Edge Cases).
- **FR-012**: Falhas de câmera MUST afetar só a pessoa que as tem: ela MUST continuar na sala
  vendo, ouvindo, falando e usando as demais funções; as outras pessoas MUST NOT ver mensagens de
  erro por isso.
- **FR-013**: Se não for possível receber o vídeo de uma pessoa que está com a câmera ligada, quem
  não o recebe MUST ver, no quadro dessa pessoa, o nome dela e uma mensagem em pt-BR dizendo que não
  foi possível mostrar o vídeo.
- **FR-014**: Ao sair da sala, a câmera da pessoa MUST ser liberada.
- **FR-015**: Todos os textos e mensagens desta funcionalidade MUST estar em pt-BR, sem termos
  técnicos.
- **FR-016**: A lista de participantes MUST mostrar, para cada pessoa, se a câmera dela está ligada
  ou desligada, ao lado do indicador de microfone (T03), de forma visível sem precisar passar o mouse
  e com texto alternativo em pt-BR ("câmera ligada" / "câmera desligada"). A indicação MUST ser
  atualizada na tela de todos em até 3 s quando a câmera liga ou desliga (por clique, falha ou
  recarregar a página).

### Key Entities

- **Participante** (da T02/T03): passa a ter o estado da câmera (ligada ou desligada), conhecido por
  todos na sala e mostrado na lista de participantes. Começa sempre desligada e não é guardado depois que a pessoa sai ou recarrega a
  página.
- **Quadro de vídeo**: a imagem de um participante com a câmera ligada, sempre acompanhada do nome
  de exibição dele (ou "(você)" para a própria pessoa). Existe só enquanto a câmera daquela pessoa
  está ligada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa que acabou de entrar consegue ser vista pelos outros em no máximo
  2 interações (clicar no botão e autorizar) e em menos de 10 segundos.
- **SC-002**: Em 100% das vezes em que alguém desliga a câmera, o quadro some da tela de todos em
  até 3 s.
- **SC-003**: Em 100% das entradas na sala, a câmera começa desligada e ninguém vê a pessoa antes de
  ela ligá-la.
- **SC-004**: Em 100% dos casos de permissão negada ou falha de câmera, a pessoa vê uma mensagem
  explicativa em pt-BR e continua vendo, ouvindo e falando na sala normalmente.
- **SC-005**: Em 100% dos quadros de vídeo, o nome da pessoa está visível.
- **SC-008**: Em 100% das mudanças de câmera, a lista de participantes de todos os presentes mostra
  o novo estado em até 3 s.
- **SC-006**: Com 6 pessoas na sala e todas as câmeras e microfones ligados, numa internet doméstica
  comum que permita a conexão direta, cada pessoa vê os outros 5 vídeos em movimento e a voz
  continua sem cortes que impeçam entender o que é dito.
- **SC-007**: Pelo menos 9 em cada 10 pessoas conseguem ligar a câmera e ser vistas sem ajuda na
  primeira tentativa.

## Assumptions

- Depende da T01, T02 (sala, lista, limite de 6, retorno ao recarregar) e da T03 (conexão direta
  entre as pessoas, sem servidor intermediário; mesma limitação em redes restritivas).
- A voz tem prioridade sobre o vídeo: se a conexão de alguém estiver fraca, é aceitável o vídeo
  perder qualidade para a voz continuar compreensível.
- O vídeo usa uma qualidade moderada, suficiente para ver o rosto, pensando em 5 vídeos chegando
  ao mesmo tempo numa internet doméstica.
- A própria imagem aparece espelhada (como num espelho); para os outros, aparece sem espelhar.
- O estado da câmera não é lembrado entre visitas; toda entrada começa com ela desligada, por
  privacidade.
- O anfitrião não tem poderes sobre a câmera dos outros nesta versão.
- Ficam para tarefas futuras: escolher qual câmera usar, ampliar o vídeo de uma pessoa, fundo
  desfocado, desligar a câmera de outras pessoas e o compartilhamento de tela em si.
- A mensagem de permissão negada usa uma instrução genérica (ícone ao lado do endereço do site),
  como na T03.
