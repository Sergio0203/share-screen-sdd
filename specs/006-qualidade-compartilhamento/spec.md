# Feature Specification: T06 · Escolher a qualidade do compartilhamento

**Feature Branch**: `006-qualidade-compartilhamento`

**Created**: 2026-11-16

**Status**: Draft

**Input**: User description: "T06 · Escolher a qualidade do compartilhamento — Antes de compartilhar,
a pessoa escolhe entre pelo menos 3 qualidades: 720p 30 fps, 1080p 30 fps e 1080p 60 fps. Dá para
trocar a qualidade durante o compartilhamento, sem parar e recomeçar. A interface mostra para quem
compartilha qual qualidade está ativa. A qualidade escolhida muda de fato a resolução e o fps
enviados (dá para conferir nas estatísticas do navegador)."

## Clarifications

### Session 2026-11-16

- Q: Quando a internet não aguenta a qualidade escolhida, o que é sacrificado primeiro: a nitidez
  (resolução) ou a fluidez (quadros por segundo)? → A: Sempre manter a fluidez; reduzir a
  resolução, em todas as opções.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Escolher a qualidade antes de compartilhar (Priority: P1)

Antes de clicar em "Compartilhar tela", a pessoa escolhe a qualidade: 720p a 30 quadros por
segundo, 1080p a 30 quadros por segundo ou 1080p a 60 quadros por segundo. O compartilhamento
começa já nessa qualidade, e quem assiste recebe a imagem com a resolução e a fluidez escolhidas.

**Why this priority**: é o centro da tarefa — quem compartilha um jogo rápido quer 60 quadros por
segundo; quem tem internet fraca quer 720p. Sem isso, as outras histórias não têm o que trocar nem
mostrar.

**Independent Test**: com duas pessoas na sala (T05), quem compartilha escolhe "1080p · 60 fps" e
compartilha uma tela de pelo menos 1080p; nas estatísticas do navegador de quem assiste, o vídeo
recebido tem 1920×1080 e cerca de 60 quadros por segundo. Repetir com "720p · 30 fps" e conferir
1280×720 e cerca de 30 quadros por segundo.

**Acceptance Scenarios**:

1. **Given** uma pessoa na sala sem compartilhar, **When** olha os controles de compartilhamento,
   **Then** vê a escolha de qualidade com as opções "720p · 30 fps", "1080p · 30 fps" e
   "1080p · 60 fps", com uma delas já selecionada.
2. **Given** a pessoa escolheu "720p · 30 fps", **When** compartilha a tela, **Then** a imagem
   enviada tem no máximo 1280×720 e no máximo 30 quadros por segundo.
3. **Given** a pessoa escolheu "1080p · 30 fps", **When** compartilha uma tela de 1080p ou maior,
   **Then** a imagem enviada tem 1920×1080 (ou a proporção equivalente) e no máximo 30 quadros por
   segundo.
4. **Given** a pessoa escolheu "1080p · 60 fps", **When** compartilha uma tela de 1080p ou maior com
   conteúdo em movimento, **Then** a imagem enviada tem 1920×1080 e chega a cerca de 60 quadros por
   segundo numa conexão boa.
5. **Given** a pessoa nunca escolheu, **When** abre a sala, **Then** a qualidade selecionada é
   "1080p · 30 fps".
6. **Given** a pessoa já compartilhou antes neste navegador, **When** volta à sala (ou a outra sala),
   **Then** a última qualidade que ela usou já vem selecionada.

---

### User Story 2 - Trocar a qualidade durante o compartilhamento (Priority: P2)

Durante o compartilhamento, a pessoa percebe que a imagem está travando (ou que dá para melhorar) e
troca a qualidade. A troca acontece sem parar o compartilhamento: quem assiste continua vendo a
tela, que passa a chegar na nova qualidade.

**Why this priority**: a melhor qualidade depende da internet e do jogo no momento; obrigar a parar
e recomeçar (escolhendo a janela de novo) atrapalha justamente durante o jogo.

**Independent Test**: com alguém compartilhando em "1080p · 60 fps", trocar para "720p · 30 fps";
quem assiste continua vendo a tela sem interrupção, e em até 5 s as estatísticas mostram 1280×720 e
cerca de 30 quadros por segundo. Trocar de volta e conferir de novo.

**Acceptance Scenarios**:

1. **Given** a pessoa está compartilhando, **When** escolhe outra qualidade, **Then** o
   compartilhamento continua sem parar, sem nova janela de escolha de tela e sem que quem assiste
   veja a tela sumir ou ficar preta.
2. **Given** a pessoa trocou a qualidade, **When** passam até 5 s, **Then** a imagem recebida por
   todos que assistem já está na nova resolução e no novo limite de quadros por segundo.
3. **Given** a pessoa troca a qualidade várias vezes seguidas, **When** para de mexer, **Then** vale
   a última escolha.
4. **Given** a pessoa está compartilhando e troca a qualidade, **When** para e compartilha de novo,
   **Then** o novo compartilhamento começa na última qualidade escolhida.

---

### User Story 3 - Ver qual qualidade está ativa (Priority: P3)

Quem compartilha vê, junto do aviso "Você está compartilhando sua tela", qual qualidade está sendo
usada. Se a tela compartilhada for menor que a qualidade escolhida, ou se o navegador não conseguir
entregar a qualidade, a pessoa fica sabendo.

**Why this priority**: sem essa indicação, a pessoa não sabe se a troca funcionou nem por que a
imagem não está como esperava; depende das histórias anteriores para ter o que mostrar.

**Independent Test**: compartilhar em "1080p · 60 fps" e verificar o texto "Qualidade: 1080p · 60
fps"; trocar para "720p · 30 fps" e verificar que o texto muda em até 5 s; compartilhar uma janela
pequena em "1080p · 30 fps" e verificar o aviso de limitação.

**Acceptance Scenarios**:

1. **Given** a pessoa está compartilhando, **When** olha a sala, **Then** vê "Qualidade: <qualidade
   ativa>" junto do aviso de que está compartilhando.
2. **Given** a pessoa trocou a qualidade, **When** a troca é aplicada, **Then** o texto passa a
   mostrar a nova qualidade em até 5 s.
3. **Given** a tela ou janela compartilhada é menor que a resolução escolhida, **When** a pessoa
   compartilha, **Then** a imagem é enviada no tamanho original (sem aumentar) e o texto mostra a
   resolução real com a observação "limitada pelo tamanho da tela" (ex.: "Qualidade: 1366×768 ·
   30 fps (limitada pelo tamanho da tela)").
4. **Given** o navegador não consegue aplicar a qualidade escolhida, **When** a pessoa escolhe,
   **Then** vê a mensagem "Não foi possível usar essa qualidade. O compartilhamento continua na
   qualidade anterior." e a escolha volta para a qualidade que continua ativa.

---

### Edge Cases

- **Quem assiste**: não vê a escolha de qualidade de quem compartilha; só recebe a imagem. Nada
  muda para quem assiste além da resolução e da fluidez da imagem.
- **Internet fraca**: a qualidade escolhida é o máximo; se a conexão de quem compartilha ou de quem
  assiste não aguentar, a imagem perde **resolução** temporariamente, mantendo os quadros por
  segundo da opção escolhida (a fluidez é preservada em todas as opções), para a voz continuar
  compreensível (T05). O texto de qualidade ativa mostra a qualidade pedida, não essas reduções
  momentâneas.
- **Conteúdo parado**: com a tela sem movimento, o navegador pode enviar menos quadros por segundo
  do que o limite; isso não é falha.
- **Tela com proporção diferente de 16:9** (ex.: monitor ultrawide, janela estreita): a imagem cabe
  dentro do limite escolhido mantendo a proporção original, sem cortar nem esticar.
- **Navegador sem suporte a compartilhar** (celular, T05): a escolha de qualidade não aparece, junto
  com o botão indisponível.
- **Trocar a qualidade e o compartilhamento termina ao mesmo tempo** (ex.: pelo botão do navegador):
  o compartilhamento termina normalmente (T05) e a escolha fica guardada para o próximo.
- **Vários compartilhamentos** (T05): cada pessoa escolhe a própria qualidade; ela vale para todos
  que estão assistindo àquele compartilhamento.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A sala MUST oferecer, junto do botão "Compartilhar tela", uma escolha de qualidade
  com pelo menos as opções "720p · 30 fps", "1080p · 30 fps" e "1080p · 60 fps".
- **FR-002**: A escolha MUST estar disponível antes de compartilhar e durante o compartilhamento.
- **FR-003**: Sem escolha anterior, a qualidade selecionada MUST ser "1080p · 30 fps". O navegador
  MUST lembrar a última qualidade usada e selecioná-la nas próximas vezes.
- **FR-004**: A qualidade escolhida MUST definir de fato o máximo de resolução e de quadros por
  segundo da imagem enviada: 720p = até 1280×720 e 30 quadros por segundo; 1080p · 30 fps = até
  1920×1080 e 30 quadros por segundo; 1080p · 60 fps = até 1920×1080 e 60 quadros por segundo,
  sempre mantendo a proporção original da tela compartilhada. Quando a conexão não aguentar, a
  redução MUST ser na resolução, mantendo os quadros por segundo da opção escolhida, em todas as
  opções.
- **FR-005**: Uma tela ou janela menor que a resolução escolhida MUST ser enviada no tamanho
  original, sem aumentar.
- **FR-006**: Trocar a qualidade durante o compartilhamento MUST NOT parar nem reiniciar o
  compartilhamento, MUST NOT abrir de novo a escolha de tela e MUST NOT interromper a imagem para
  quem assiste; a nova qualidade MUST valer para todos que assistem em até 5 s.
- **FR-007**: Enquanto compartilha, a pessoa MUST ver "Qualidade: <qualidade ativa>" junto do aviso
  "Você está compartilhando sua tela"; quando a resolução real for menor que a escolhida por causa
  do tamanho da tela, o texto MUST mostrar a resolução real e "(limitada pelo tamanho da tela)".
- **FR-008**: Se o navegador não conseguir aplicar a qualidade escolhida, a pessoa MUST ver a
  mensagem de US3 cenário 4, o compartilhamento MUST continuar na qualidade anterior e a escolha
  MUST voltar a mostrar a qualidade que continua ativa.
- **FR-009**: A escolha de qualidade MUST afetar só o compartilhamento da própria pessoa; MUST NOT
  mudar câmera, microfone nem os compartilhamentos de outras pessoas.
- **FR-010**: Em navegadores que não permitem compartilhar (T05 FR-010), a escolha de qualidade
  MUST NOT aparecer.
- **FR-011**: Todos os textos desta funcionalidade MUST estar em pt-BR; os nomes das qualidades usam
  as abreviações conhecidas "720p", "1080p" e "fps".

### Key Entities

- **Qualidade de compartilhamento**: uma das opções oferecidas, definida por uma resolução máxima
  (largura × altura) e um máximo de quadros por segundo. Tem um nome exibido ("720p · 30 fps").
- **Preferência de qualidade**: a última qualidade usada pela pessoa, guardada no navegador; não é
  enviada ao servidor nem vista pelos outros.
- **Compartilhamento** (da T05): passa a ter a qualidade ativa, conhecida só por quem compartilha.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos compartilhamentos de uma tela de 1080p ou maior, numa conexão sem
  limitação, a resolução recebida por quem assiste corresponde à qualidade escolhida (1280×720 ou
  1920×1080), conferida nas estatísticas do navegador.
- **SC-002**: Com conteúdo em movimento contínuo e conexão sem limitação, a média de quadros por
  segundo recebida em 10 s fica entre 25 e 30 nas opções de 30 fps e acima de 50 na opção de 60 fps
  (num computador e navegador capazes de capturar a 60 fps).
- **SC-003**: Em 100% das trocas de qualidade durante o compartilhamento, quem assiste não vê a tela
  sumir nem ficar preta, e a nova qualidade aparece nas estatísticas em até 5 s.
- **SC-004**: Trocar a qualidade leva no máximo 2 interações (abrir a escolha e selecionar).
- **SC-005**: Em 100% dos compartilhamentos, quem compartilha vê a qualidade ativa na tela.
- **SC-006**: Pelo menos 9 em cada 10 pessoas conseguem trocar a qualidade durante um
  compartilhamento sem ajuda.
- **SC-007**: Com a banda de quem compartilha limitada abaixo do necessário para a qualidade
  escolhida, a média de quadros por segundo recebida continua dentro da meta da SC-002 para aquela
  opção, enquanto a resolução recebida diminui.

## Assumptions

- Depende da T05 (compartilhamento, aviso "Você está compartilhando sua tela", envio só para quem
  assiste, navegadores compatíveis).
- **Altera a T05**: a T05 capturava até 30 quadros por segundo com prioridade à fluidez; agora o
  limite vem da qualidade escolhida.
- A qualidade escolhida é um limite máximo: quando a internet não aguenta, a resolução é reduzida
  temporariamente (a fluidez é mantida), para manter a voz compreensível (T05). É o comportamento
  certo para jogos, mesmo que textos pequenos fiquem menos nítidos nesses momentos.
- 60 fps depende do computador e do navegador conseguirem capturar a tela nessa velocidade; quando
  não conseguem, a imagem chega com menos quadros por segundo, sem mensagem de erro (é o caso de
  "conteúdo/computador limitado", não de falha).
- Com 1080p · 60 fps e várias pessoas assistindo ao mesmo compartilhamento, quem compartilha precisa
  de uma internet com upload maior; a escolha de 720p existe para esses casos.
- Quem assiste não escolhe a qualidade que recebe nesta versão; a escolha é de quem compartilha.
- Ficam para tarefas futuras: qualidades acima de 1080p (ex.: 1440p, 4K), escolha automática de
  qualidade pela internet e mostrar a quem assiste a qualidade recebida.
