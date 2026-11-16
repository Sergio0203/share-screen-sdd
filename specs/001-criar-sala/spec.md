# Feature Specification: T01 · Criar uma sala

**Feature Branch**: `001-criar-sala`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "T01 · Criar uma sala — Qualquer pessoa cria uma sala com um clique, sem
cadastro, e já sai com o link pronto para mandar. Um clique em 'Criar sala' cria uma sala nova e leva a
pessoa para dentro dela. Cada sala tem um link único e difícil de adivinhar. Ao criar a sala, o link é
copiado automaticamente para a área de transferência, e a interface mostra uma confirmação ('Link
copiado!'). Se o navegador bloquear a cópia automática, aparece um botão 'Copiar link' que funciona, e o
link fica visível na tela. Dentro da sala sempre há um jeito de copiar o link de novo."

## Clarifications

### Session 2026-11-16

- Q: Por quanto tempo uma sala deve continuar existindo depois de criada? → A: Enquanto houver ao
  menos uma pessoa nela; quando fica vazia, expira após um período de tolerância de ~1 minuto (que
  cobre recarregar a página).
- Q: Quem cria a sala deve ter algum papel ou poder especial? → A: Sim, quem cria é o "anfitrião"
  da sala; os poderes exclusivos (ex.: encerrar a sala, remover pessoas) serão definidos em tarefas
  futuras.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criar sala com um clique e receber o link copiado (Priority: P1)

Uma pessoa abre o app, clica em "Criar sala" e, sem preencher nada nem se cadastrar, é levada para
dentro de uma sala nova. O link da sala já está na área de transferência e a tela mostra "Link
copiado!", então ela pode colar o link direto na conversa com os amigos.

**Why this priority**: é o ponto de entrada de todo o produto; sem sala e sem link, não há como
compartilhar a tela com ninguém.

**Independent Test**: abrir o app num navegador que permite cópia automática, clicar em "Criar sala"
e verificar que a pessoa está dentro de uma sala nova, que a confirmação "Link copiado!" aparece e
que colar a área de transferência resulta no link dessa sala.

**Acceptance Scenarios**:

1. **Given** a pessoa está na página inicial e não tem cadastro, **When** clica em "Criar sala",
   **Then** uma sala nova é criada e a pessoa é levada para dentro dela como anfitriã, sem nenhum
   passo intermediário.
2. **Given** o navegador permite cópia automática, **When** a sala é criada, **Then** o link da sala
   é copiado para a área de transferência e a interface mostra a confirmação "Link copiado!".
3. **Given** duas salas criadas em sequência (pela mesma pessoa ou por pessoas diferentes),
   **When** os links são comparados, **Then** eles são diferentes.
4. **Given** a pessoa está dentro da sala que criou, **When** recarrega a página, **Then** continua
   na mesma sala, com o mesmo link, e continua sendo reconhecida como anfitriã.

---

### User Story 2 - Copiar o link quando a cópia automática é bloqueada (Priority: P2)

Alguns navegadores bloqueiam a cópia automática. Nesse caso, a pessoa vê o link escrito na tela e um
botão "Copiar link" que, ao ser clicado, copia o link e mostra "Link copiado!".

**Why this priority**: garante que a promessa "já sai com o link pronto para mandar" vale em
qualquer navegador; sem isso, parte das pessoas ficaria sem como convidar amigos.

**Independent Test**: num navegador (ou configuração) que bloqueia a cópia automática, criar uma sala
e verificar que o link aparece visível, que o botão "Copiar link" aparece e que clicar nele copia o
link correto.

**Acceptance Scenarios**:

1. **Given** o navegador bloqueia a cópia automática, **When** a sala é criada, **Then** a
   confirmação "Link copiado!" NÃO aparece, o link completo da sala fica visível na tela e o botão
   "Copiar link" é exibido.
2. **Given** a cópia automática foi bloqueada, **When** a pessoa clica em "Copiar link", **Then** o
   link da sala é copiado e a interface mostra "Link copiado!".
3. **Given** até o botão "Copiar link" falha ao copiar, **When** a pessoa clica nele, **Then** a
   interface mostra uma mensagem em pt-BR explicando que não foi possível copiar e orientando a
   selecionar e copiar o link visível manualmente.

---

### User Story 3 - Copiar o link de novo a qualquer momento dentro da sala (Priority: P3)

Depois de um tempo na sala, a pessoa quer mandar o link para mais um amigo. Ela encontra, sempre
disponível na sala, uma forma de copiar o link de novo.

**Why this priority**: convites acontecem ao longo da sessão, não só no momento da criação; mas o
fluxo principal já funciona sem isso.

**Independent Test**: entrar numa sala já criada, limpar a área de transferência, usar a opção de
copiar o link e verificar que a área de transferência contém o link da sala.

**Acceptance Scenarios**:

1. **Given** a pessoa está dentro de uma sala (logo após criar ou depois de recarregar), **When**
   olha a interface, **Then** a opção "Copiar link" está visível sem precisar abrir menus ou rolar a
   tela.
2. **Given** a pessoa já copiou o link antes, **When** clica em "Copiar link" de novo, **Then** o
   link é copiado novamente e a confirmação "Link copiado!" aparece outra vez.

---

### Edge Cases

- **Falha ao criar a sala** (ex.: sem conexão com a internet ou serviço indisponível): a pessoa
  continua na página inicial, vê uma mensagem em pt-BR dizendo que não foi possível criar a sala e
  pedindo para tentar novamente, e o botão "Criar sala" volta a ficar disponível.
- **Cliques repetidos em "Criar sala"**: enquanto a criação está em andamento, cliques extras não
  criam salas adicionais; a pessoa entra em uma única sala.
- **Cópia automática bloqueada**: coberta pela User Story 2.
- **Cópia manual também falha**: o link continua visível e selecionável, com orientação em pt-BR
  para copiá-lo manualmente.
- **Pessoa fecha a aba e volta depois**: se voltar em até ~1 minuto (sala vazia em tolerância),
  continua na mesma sala; depois disso a sala expirou.
- **Confirmação "Link copiado!"**: é temporária e some sozinha após alguns segundos, sem exigir
  ação da pessoa.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A página inicial MUST exibir um botão "Criar sala" acessível sem cadastro, login ou
  preenchimento de qualquer dado.
- **FR-002**: Um único clique em "Criar sala" MUST criar uma sala nova e levar a pessoa para dentro
  dela, sem etapas intermediárias.
- **FR-003**: Cada sala MUST ter um link único; duas salas MUST NOT compartilhar o mesmo link.
- **FR-004**: O link da sala MUST ser difícil de adivinhar: não pode ser sequencial, nem derivado de
  data/hora ou de dados da pessoa, e a chance de acertar o link de uma sala existente tentando links
  aleatórios MUST ser desprezível (inferior a 1 em 10^30 por tentativa).
- **FR-005**: Ao criar a sala, o sistema MUST tentar copiar o link automaticamente para a área de
  transferência.
- **FR-006**: Quando a cópia (automática ou manual) for bem-sucedida, a interface MUST mostrar a
  confirmação "Link copiado!" de forma temporária.
- **FR-007**: Quando a cópia automática for bloqueada, a interface MUST exibir o link completo da
  sala de forma visível e selecionável e MUST exibir o botão "Copiar link".
- **FR-008**: O botão "Copiar link" MUST copiar o link da sala atual para a área de transferência.
- **FR-009**: Dentro da sala, a opção de copiar o link MUST estar sempre disponível e visível, a
  qualquer momento.
- **FR-010**: O link de uma sala, aberto pela pessoa que a criou (inclusive ao recarregar a
  página dentro do período de tolerância), MUST levá-la de volta à mesma sala.
- **FR-014**: A sala MUST continuar existindo enquanto houver ao menos uma pessoa nela. Quando a
  última pessoa sai, a sala MUST continuar disponível por um período de tolerância de ~1 minuto e,
  se ninguém voltar nesse intervalo, MUST expirar e deixar de existir.
- **FR-015**: Quem cria a sala MUST ser registrado como anfitrião dela, sem cadastro nem login. O
  anfitrião MUST continuar sendo reconhecido como tal ao recarregar a página ou voltar à sala no
  mesmo navegador dentro do período de tolerância. Possuir apenas o link MUST NOT tornar outra
  pessoa anfitriã.
- **FR-016**: A interface da sala MUST indicar à pessoa anfitriã que ela é a anfitriã (ex.: "Você é
  o anfitrião desta sala").
- **FR-011**: Enquanto uma criação de sala estiver em andamento, novos cliques em "Criar sala" MUST
  NOT criar salas adicionais.
- **FR-012**: Toda falha nesta funcionalidade (criar sala, copiar link) MUST resultar numa mensagem
  visível em pt-BR, sem termos técnicos, que diga o que aconteceu e o que a pessoa pode fazer.
- **FR-013**: Todo texto da interface desta funcionalidade MUST estar em pt-BR.

### Key Entities

- **Sala**: espaço onde amigos vão se reunir para compartilhar a tela. Atributos: identificador
  único e difícil de adivinhar; link público derivado desse identificador; momento de criação;
  número de pessoas presentes. Ciclo de vida: criada → ativa (≥ 1 pessoa) → vazia (período de
  tolerância de ~1 minuto) → expirada; se alguém volta durante a tolerância, retorna a ativa.
  Não está associada a nenhuma conta ou cadastro. Cada sala tem exatamente um anfitrião.
- **Anfitrião**: a pessoa que criou a sala. Identificado sem cadastro, apenas pelo navegador em que
  a sala foi criada. Nesta tarefa não tem poderes exclusivos; eles serão definidos em tarefas
  futuras.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Uma pessoa sai da página inicial e chega dentro de uma sala nova, com o link pronto
  para colar, em no máximo 1 clique e menos de 3 segundos em uma conexão comum.
- **SC-002**: Em 100% das criações bem-sucedidas, a pessoa termina com o link na área de
  transferência ou com o link visível e o botão "Copiar link" disponível na tela.
- **SC-003**: Em um teste com 10.000 salas criadas, nenhum link se repete.
- **SC-004**: 100% das telas de sala exibem uma forma de copiar o link sem que a pessoa precise
  abrir menus ou rolar a tela.
- **SC-005**: Pelo menos 9 em cada 10 pessoas que testam o app pela primeira vez conseguem criar
  uma sala e mandar o link para um amigo sem ajuda.

## Assumptions

- O app roda em navegadores modernos de desktop; dispositivos móveis não são prioridade nesta
  tarefa, mas o fluxo não deve quebrar neles.
- Entrar numa sala a partir do link recebido (por outra pessoa), links inválidos/inexistentes e o
  compartilhamento de tela em si são tratados em tarefas futuras; esta tarefa cobre apenas criar a
  sala, estar dentro dela e copiar o link.
- Como a sala deixa de existir após ficar vazia, ela não precisa sobreviver a longos períodos sem
  ninguém; o que a pessoa vê ao abrir o link de uma sala expirada é tratado na tarefa de entrar
  pelo link.
- Os poderes exclusivos do anfitrião e o que acontece com o papel de anfitrião quando ele sai da
  sala enquanto outras pessoas continuam nela serão definidos em tarefas futuras.
- Não há limite de salas por pessoa nesta versão, considerando o público de grupos pequenos de
  amigos (Princípio I da constituição).
- A confirmação "Link copiado!" fica visível por cerca de 2 a 3 segundos.
