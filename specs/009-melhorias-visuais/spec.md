# Feature Specification: T09 · Melhorias visuais (vermelho e preto)

**Feature Branch**: `009-melhorias-visuais`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "T09 - Aplicar melhorias de visual, atualmente o site não tem apelo
visual algum, quero que ajuste UI/UX, quero que use tons vermelho com degradês indo para preto, um
visual moderno e bonito, essa task é inteiramente focada em visual. Critérios de aceite: iconografia
consistente; fluidez no site; smooth animations."

## Clarifications

### Session 2026-11-17

- Q: Qual a intensidade do vermelho no degradê de fundo? → A: Predominantemente preto com brilho
  vermelho: fundo quase preto com um brilho vermelho profundo (vinho) vindo de um canto ou do topo;
  o vermelho vivo fica nos botões e destaques.
- Q: Os controles da sala mostram só o ícone ou ícone com texto? → A: Só ícone, sempre (barra
  compacta, estilo Meet/Discord), com o nome em dica ao passar o mouse/focar e para leitores de
  tela.
- Q: O que aparece no lugar de quem está com a câmera desligada? → A: Avatar com inicial: círculo
  com a primeira letra do nome sobre degradê vermelho escuro, com o nome completo embaixo. **Altera
  a T04** (FR-006/FR-008): todos os participantes passam a ter quadro na grade.
- Q: O novo visual pode adicionar textos (nome/logo, frase de apresentação)? → A: Sim: cabeçalho com
  o nome "Telão" e um logo em todas as telas, e uma frase curta de apresentação na página inicial.

## User Scenarios & Testing *(mandatory)*

Esta tarefa muda **só a aparência** do site. Todo o comportamento definido de T01 a T08 (criar e
entrar na sala, voz, câmera, compartilhamento, destaque, tela cheia, qualidade, recados que seguem o
cursor, mensagens de erro) continua igual. Os textos da interface continuam os mesmos, em pt-BR.

### User Story 1 - Um site com identidade visual vermelho e preto (Priority: P1)

Uma pessoa recebe o link da sala de um amigo e abre o site. Em vez de uma página cinza com botões
azuis, ela vê um visual escuro e moderno: fundo em degradê que vai do vermelho ao preto, cartões e
painéis escuros bem definidos, tipografia clara e botões vermelhos que se destacam. A mesma
identidade aparece em todas as telas: página inicial, tela de nome, sala e telas de erro.

**Why this priority**: é o pedido central da tarefa. Sem a nova identidade visual, nenhuma outra
melhoria (ícones, animações) faz sentido.

**Independent Test**: abrir cada tela do site (início, nome, sala vazia, sala com compartilhamento
em destaque, tela de "Sala cheia", "Esta sala não existe", "aberta em outra aba", "conexão perdida")
e verificar que todas usam a mesma paleta de vermelhos e pretos, com degradê vermelho → preto no
fundo, e que todos os textos continuam legíveis.

**Acceptance Scenarios**:

1. **Given** qualquer tela do site, **When** ela é exibida, **Then** há um cabeçalho com o logo e o
   nome "Telão"; na página inicial aparece também a frase "Compartilhe sua tela com os amigos, com
   voz e câmera.".
2. **Given** qualquer tela do site, **When** ela é exibida, **Then** o fundo usa um degradê que vai
   de tons de vermelho a preto, e os demais elementos (cartões, painéis, campos, botões) usam a
   mesma paleta escura com destaques em vermelho.
3. **Given** a ação principal de uma tela (ex.: "Criar sala", "Entrar na sala", "Compartilhar
   tela"), **When** a tela é exibida, **Then** essa ação se destaca visualmente das secundárias
   (botão vermelho preenchido versus botões discretos).
4. **Given** qualquer texto da interface, **When** exibido sobre o fundo escuro ou sobre os
   degradês, **Then** o texto é legível, com contraste suficiente para leitura confortável.
5. **Given** a sala com o compartilhamento em destaque, **When** a pessoa assiste, **Then** a imagem
   compartilhada fica em uma área neutra e escura (sem degradê nem cor por cima da imagem), para não
   atrapalhar a visualização do que está sendo mostrado.
6. **Given** uma mensagem de erro ou aviso (T01–T08), **When** ela aparece, **Then** fica claramente
   visível e diferenciada de mensagens de sucesso (ex.: "Link copiado!"), sem depender só da cor
   para ser entendida.

---

### User Story 2 - Ícones consistentes nas ações (Priority: P1)

Na sala, a pessoa encontra os controles de microfone, câmera, compartilhar tela, tela cheia,
qualidade e copiar link. Cada controle tem um ícone que deixa claro o que faz, todos no mesmo
estilo, e o ícone muda para refletir o estado (ex.: microfone ligado e microfone cortado).

**Why this priority**: é um dos critérios de aceite explícitos; ícones tornam os controles da sala
mais rápidos de reconhecer, principalmente durante uma chamada.

**Independent Test**: listar todos os botões e indicadores do site e verificar que cada um tem um
ícone do mesmo conjunto (mesmo traço, mesmo tamanho, mesmo alinhamento com o texto) e que os ícones
de estado mudam quando o estado muda.

**Acceptance Scenarios**:

1. **Given** os controles da sala (microfone, câmera, compartilhar/parar de compartilhar, tela
   cheia, qualidade, copiar link, ativar som), **When** exibidos, **Then** cada um tem um ícone que
   representa a ação, todos do mesmo conjunto visual (mesmo estilo de traço, espessura, tamanho e
   cantos).
2. **Given** um controle com dois estados (microfone ligado/desligado, câmera ligada/desligada,
   compartilhando/não compartilhando), **When** o estado muda, **Then** o ícone muda para indicar o
   novo estado (ex.: microfone com traço cortado quando desligado).
3. **Given** a lista de participantes, **When** exibida, **Then** os indicadores de estado de cada
   pessoa (microfone, câmera, anfitrião, compartilhando) usam os mesmos ícones dos controles
   correspondentes.
4. **Given** qualquer botão com ícone, **When** a pessoa usa leitor de tela ou passa o mouse/foco,
   **Then** o nome da ação continua disponível em pt-BR (dica ao passar o mouse/focar e nome para
   leitor de tela), igual ao texto atual do botão.
5. **Given** um ícone puramente decorativo, **When** a página é lida por leitor de tela, **Then** ele
   não é anunciado em duplicidade com o texto do botão.

---

### User Story 3 - Navegação fluida com animações suaves (Priority: P2)

Ao criar a sala, entrar, ligar a câmera ou começar a compartilhar, a interface reage de forma suave:
botões respondem ao passar o mouse e ao clicar, as telas aparecem com uma transição curta, novos
participantes e vídeos entram na grade sem "pular", e mensagens aparecem e somem gradualmente. Nada
trava nem atrasa por causa das animações.

**Why this priority**: são os critérios de aceite "fluidez" e "smooth animations"; dependem da nova
identidade (US1) e dos ícones (US2) já estarem definidos para fazer sentido.

**Independent Test**: percorrer o fluxo completo (criar sala → nome → sala → ligar microfone e
câmera → compartilhar → tela cheia → recado → sair) observando que toda mudança visual é animada de
forma curta e suave, sem saltos de layout, e que a imagem compartilhada, a voz e as câmeras
continuam sem cortes.

**Acceptance Scenarios**:

1. **Given** qualquer botão ou elemento clicável, **When** a pessoa passa o mouse, foca com teclado
   ou clica, **Then** há um retorno visual imediato e suave (mudança de cor, brilho ou leve escala)
   em cada um desses estados.
2. **Given** a troca entre telas (início → nome → sala, ou para uma tela de erro), **When** ela
   acontece, **Then** a nova tela aparece com uma transição curta (até 0,4 s), sem piscar.
3. **Given** um participante entra ou sai, uma câmera liga ou desliga, ou um compartilhamento começa
   ou termina, **When** a grade muda, **Then** os elementos entram e saem com animação, e os demais
   se reorganizam sem saltos bruscos.
4. **Given** uma mensagem de status ou erro, **When** ela aparece ou some, **Then** aparece e some
   com transição suave, sem empurrar o conteúdo da página.
5. **Given** um botão em estado de carregamento ("Criando sala…", "Ligando microfone…", "Ligando
   câmera…", "Escolhendo o que compartilhar…"), **When** a ação está em andamento, **Then** o botão
   mostra um indicador animado de carregamento: junto ao texto, nos botões com texto; no lugar do
   ícone, nos controles só com ícone, com o texto de espera na dica e no nome para leitor de tela.
6. **Given** uma pessoa que configurou o sistema para reduzir movimento, **When** usa o site,
   **Then** as animações de movimento são removidas ou reduzidas a transições instantâneas ou
   simples de opacidade, sem perder nenhuma informação.
7. **Given** a sala com compartilhamento, voz e câmeras ativos, **When** animações da interface
   acontecem, **Then** não há travamentos perceptíveis na imagem compartilhada, nas câmeras ou na
   voz.

---

### User Story 4 - Layout organizado em qualquer tamanho de janela (Priority: P3)

A pessoa usa o site no notebook, num monitor grande ou com a janela pela metade da tela. A sala se
organiza em áreas claras — destaque do compartilhamento, grade de câmeras, lista de participantes e
barra de controles — que se reorganizam conforme o espaço, sem sobreposições nem barras de rolagem
horizontais.

**Why this priority**: melhora a experiência, mas a sala já funciona hoje; é um refinamento sobre a
nova identidade visual.

**Independent Test**: abrir a sala com compartilhamento e câmeras ativos e redimensionar a janela de
360 px até 1920 px de largura, verificando que nada se sobrepõe, nada é cortado e não aparece
rolagem horizontal.

**Acceptance Scenarios**:

1. **Given** a sala aberta, **When** exibida em telas largas, **Then** o destaque ocupa a maior parte
   do espaço e os controles ficam agrupados em uma barra fácil de alcançar.
2. **Given** a janela redimensionada até 360 px de largura, **When** a sala é exibida, **Then** os
   elementos se reorganizam (ex.: empilhados) sem sobreposição e sem rolagem horizontal.
3. **Given** a tela cheia do compartilhamento (T05), **When** ativada, **Then** continua mostrando
   só a imagem e os recados, sem elementos decorativos novos por cima.

---

### Edge Cases

- **Recados (T07/T08)**: ganham o novo estilo visual (balão escuro com destaque vermelho e nome do
  autor), mas mantêm todo o comportamento: seguir o cursor, fade de 1 s após 8 s, limite de 100
  caracteres, recado mais recente por cima. O recado precisa continuar legível sobre qualquer imagem
  compartilhada (clara ou escura).
- **Vários recados com a mesma cor**: recados de pessoas diferentes continuam identificáveis pelo
  nome do autor, mesmo usando a mesma paleta.
- **Botões desabilitados ou em espera**: precisam parecer claramente indisponíveis, e não apenas
  "mais apagados" a ponto de sumir no fundo escuro.
- **Foco por teclado**: o indicador de foco precisa ser visível sobre o fundo escuro e sobre os
  botões vermelhos.
- **Navegadores sem suporte a algum efeito visual** (ex.: desfoque de fundo): o site continua
  legível e utilizável, apenas sem o efeito.
- **Muitos participantes (6, o máximo)**: a grade de câmeras e a lista continuam organizadas e as
  animações de entrada não se acumulam em atraso.
- **Câmera desligada**: o quadro da pessoa mostra o avatar com a inicial do nome (FR-017); ao
  ligar ou desligar a câmera, a troca entre vídeo e avatar é animada, sem o quadro sumir ou
  reaparecer.
- **Nomes que começam com emoji, número ou símbolo**: o avatar mostra o primeiro caractere visível
  do nome, do jeito que ele aparece na lista de participantes.
- **Imagem compartilhada vermelha ou escura**: bordas e controles sobre o destaque continuam
  distinguíveis da imagem.
- **Carregamento inicial**: o fundo escuro aparece desde o primeiro instante, sem "flash" de fundo
  branco antes do estilo carregar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O site MUST usar uma paleta única baseada em tons de vermelho e preto, aplicada a
  todas as telas (início, nome, sala, telas de erro). O fundo MUST ser predominantemente preto, com
  um brilho em degradê de vermelho profundo (vinho) para preto vindo de um canto ou do topo; o
  vermelho vivo MUST ficar reservado a botões principais e destaques.
- **FR-002**: Ações principais MUST se destacar visualmente das secundárias, de forma consistente
  em todo o site.
- **FR-003**: Todo texto MUST ter contraste suficiente com o fundo em que aparece (no mínimo 4,5:1
  para texto normal e 3:1 para texto grande e ícones), inclusive sobre os degradês.
- **FR-004**: Todos os botões e indicadores de estado MUST usar ícones de um único conjunto visual,
  com estilo, espessura, tamanho e alinhamento consistentes.
- **FR-005**: Controles com dois estados (microfone, câmera, compartilhamento) MUST ter ícones
  distintos para cada estado, e os indicadores da lista de participantes MUST usar os mesmos ícones.
- **FR-006**: Os controles da sala (microfone, câmera, compartilhar/parar, tela cheia, qualidade)
  MUST mostrar só o ícone, em qualquer tamanho de janela, numa barra compacta. Todo controle só com
  ícone MUST mostrar seu nome em pt-BR numa dica ao passar o mouse ou focar com teclado e MUST ter
  esse nome disponível para leitores de tela, usando os textos atuais da interface. Botões fora da
  barra da sala (ex.: "Criar sala", "Entrar na sala", "Copiar link", "Tentar de novo") mantêm ícone e
  texto visível.
- **FR-007**: Todo elemento clicável MUST ter estados visuais distintos e animados para passar o
  mouse, foco por teclado, clique e desabilitado.
- **FR-008**: Trocas de tela, entrada e saída de participantes, vídeos e compartilhamentos, e o
  aparecimento e desaparecimento de mensagens MUST ser animados de forma suave, com duração entre
  0,15 s e 0,4 s.
- **FR-009**: Ações em andamento MUST mostrar um indicador de carregamento animado: junto ao texto
  atual, nos botões com texto; no lugar do ícone, nos controles só com ícone, com o texto de espera
  (ex.: "Ligando microfone…") na dica e no nome para leitor de tela.
- **FR-010**: Quando a pessoa tiver configurado o sistema para reduzir movimento, as animações de
  deslocamento e escala MUST ser removidas ou substituídas por transições simples de opacidade.
- **FR-011**: As animações e efeitos visuais MUST NOT causar travamentos perceptíveis na interface
  nem prejudicar a imagem compartilhada, a voz ou as câmeras (T03–T06).
- **FR-012**: Aparecimento de mensagens e elementos MUST NOT causar saltos de layout (conteúdo
  sendo empurrado de repente).
- **FR-013**: O layout MUST funcionar sem sobreposição nem rolagem horizontal em larguras de janela
  de 360 px a 1920 px.
- **FR-014**: A área onde a imagem compartilhada aparece MUST ser neutra e escura, sem degradês ou
  efeitos por cima da imagem; a tela cheia MUST continuar mostrando apenas a imagem e os recados.
- **FR-015**: Os recados MUST adotar o novo estilo visual mantendo o comportamento da T07 e da T08 e
  continuar legíveis sobre imagens claras e escuras.
- **FR-016**: Esta tarefa MUST NOT alterar comportamento, fluxos ou textos existentes da interface;
  todas as funcionalidades de T01 a T08 MUST continuar funcionando como especificadas, com as únicas
  exceções de FR-017 (avatar) e FR-018 (cabeçalho e frase de apresentação, que só adicionam texto).
- **FR-018**: Todas as telas (início, nome, sala e telas de erro) MUST ter um cabeçalho com um logo e
  o nome "Telão". A página inicial MUST mostrar, junto ao botão "Criar sala", uma frase curta de
  apresentação em pt-BR: "Compartilhe sua tela com os amigos, com voz e câmera.". O cabeçalho MUST
  NOT aparecer na tela cheia do compartilhamento e MUST ocupar pouco espaço na sala, para não
  reduzir a área do destaque. O título da aba do navegador MUST passar a conter "Telão".
- **FR-017**: Todo participante da sala MUST ter um quadro na grade de vídeos. Com a câmera ligada,
  o quadro mostra o vídeo; com a câmera desligada (por clique, falha ou antes de ligar), mostra um
  avatar: círculo com a primeira letra do nome sobre degradê vermelho escuro, com o nome completo
  embaixo. Ao desligar a câmera, a imagem da pessoa MUST ser trocada pelo avatar para todos em até
  3 s, e ninguém MUST continuar vendo imagem dela. Quem sai da sala MUST ter o quadro removido.
  **Altera a T04** FR-006 (o quadro sumia ao desligar a câmera) e FR-008 (só quem tinha câmera
  ligada tinha quadro); a grade continua cabendo na tela com até 6 quadros, sem esconder a lista
  nem os controles.

### Key Entities

- **Identidade visual**: paleta (vermelhos, pretos e neutros), degradês, tipografia, espaçamentos,
  cantos e sombras usados de forma consistente em todo o site.
- **Conjunto de ícones**: um ícone para cada ação ou estado da interface (microfone ligado/desligado,
  câmera ligada/desligada, compartilhar/parar, tela cheia, qualidade, copiar link, ativar som,
  anfitrião, participantes, erro, sucesso), todos no mesmo estilo.
- **Marca**: nome "Telão", logo (desenho simples no estilo do conjunto de ícones, nas cores da
  paleta) e frase de apresentação da página inicial.
- **Avatar**: representação de um participante sem câmera na grade (inicial do nome em círculo
  sobre degradê vermelho escuro + nome completo); derivado do nome, sem dado novo.
- **Movimento**: o conjunto de transições e animações (durações, curvas de aceleração e
  comportamento com movimento reduzido) aplicado de forma uniforme.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das telas do site (início, nome, sala, e as 4 telas/mensagens de erro de sala)
  usam a nova paleta vermelho → preto; nenhuma cor da identidade anterior (azul, cinza claro de
  fundo) permanece.
- **SC-002**: 100% dos textos e ícones atendem ao contraste mínimo de FR-003 em uma verificação de
  contraste.
- **SC-003**: 100% dos botões e indicadores de estado têm ícone, e todos os ícones pertencem ao
  mesmo conjunto visual.
- **SC-004**: Toda mudança visual do fluxo completo (criar → entrar → ligar mídia → compartilhar →
  recado → sair) é animada com duração entre 0,15 s e 0,4 s, exceto o fade do recado, que mantém
  1 s (T08).
- **SC-005**: Durante animações da interface, com compartilhamento, voz e 6 câmeras ativos, não há
  quadros travados perceptíveis na interface nem cortes na imagem ou na voz.
- **SC-006**: Com a opção de reduzir movimento ativada, nenhuma animação de deslocamento ou escala
  é exibida.
- **SC-007**: Em larguras de 360 px a 1920 px, nenhum elemento se sobrepõe e não há rolagem
  horizontal.
- **SC-008**: Em uma avaliação com pelo menos 3 pessoas do grupo, todas consideram o novo visual
  mais moderno e bonito que o anterior e conseguem identificar cada controle da sala pelo ícone.
- **SC-009**: Todos os testes automatizados existentes continuam passando; só os testes que
  verificam a regra "só quem tem câmera ligada tem quadro" (T04) MAY ser atualizados para refletir
  FR-017.
- **SC-010**: Em 100% dos testes, cada participante presente aparece exatamente uma vez na grade:
  com vídeo se a câmera está ligada e com avatar se está desligada.

## Assumptions

- O site passa a ter **só tema escuro**; não haverá alternância entre tema claro e escuro.
- "Degradê vermelho → preto" é um brilho vinho sobre fundo quase preto (ver Clarifications); áreas
  de conteúdo usam pretos e cinzas muito escuros para manter a leitura.
- Os ícones vêm de um único conjunto (próprio ou de uso livre), servido junto com o site, sem
  depender de serviços externos para carregar.
- Controles da barra da sala mostram só o ícone (ver Clarifications e FR-006); os demais botões
  mantêm texto visível ao lado do ícone.
- A tipografia pode mudar, desde que continue legível e sem depender de serviços externos.
- Não é necessário teste automatizado para estilos (Constituição, Princípio III); a verificação é
  visual e pelos testes existentes, que devem continuar passando.
- Mudanças de marcação feitas apenas para permitir o novo visual (ex.: envolver um texto para
  receber um ícone) são permitidas, desde que não alterem comportamento nem textos.
- O logo é um desenho simples criado para o projeto (sem imitar marcas existentes), também usado
  como ícone da aba do navegador.
- **Altera a T04**: a grade passa a mostrar todos os participantes (avatar para câmera desligada);
  esta é a única mudança de comportamento da tarefa e foi pedida em Clarifications.
- Depende de T01–T08 já implementadas; o comportamento dos recados (T07/T08) é preservado.
