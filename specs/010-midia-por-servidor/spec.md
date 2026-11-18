# Feature Specification: T10 · Mídia passando por um servidor (modelo Discord)

**Feature Branch**: `010-midia-por-servidor`

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "T10 · Mídia passando por um servidor (modelo Discord). Hoje quem
compartilha a tela manda uma cópia para cada pessoa, e o upload de casa engasga com a sala cheia. A
voz, a câmera e a tela passam a ir para um servidor de mídia, que repassa para os outros. Critérios
de aceite: quem compartilha a tela envia uma única transmissão de tela, seja qual for o número de
pessoas assistindo (dá para conferir nas estatísticas do navegador); o mesmo vale para o microfone e
a câmera: cada pessoa envia uma transmissão de cada, não uma por participante; todos os critérios de
aceite de T03 a T09 continuam passando, com os mesmos tempos; sala cheia (6 pessoas) com a tela em
1080p 30 fps e as 6 câmeras ligadas funciona sem travar; ninguém de fora entra na mídia de uma
sala: o acesso ao servidor de mídia só é liberado para quem entrou na sala pelo app, e vale só para
aquela sala; se o servidor de mídia cair ou não responder, a pessoa vê uma mensagem clara, e a
lista de participantes e os recados continuam funcionando."

## Clarifications

### Session 2026-11-17

- Q: Onde o servidor de mídia roda? → A: No mesmo servidor do app, instalado e mantido por quem
  hospeda o site, sem serviço pago de terceiros; a mídia não sai da infraestrutura do projeto.
- Q: Quando o servidor de mídia cai, a mídia para ou volta a ir direto entre navegadores? → A: Para;
  sem volta ao envio direto. Aparece a mensagem, o app tenta reconectar sozinho, e lista e recados
  continuam.
- Q: Quem tem internet fraca recebe uma versão mais leve ou todos recebem a mesma qualidade? → A: A
  mesma qualidade para todos; cada mídia é enviada numa única qualidade (mantém "uma única
  transmissão"); a qualidade é escolhida por quem compartilha (T06).
- Q: A mídia precisa funcionar em redes que só liberam navegação comum (empresa, faculdade)? → A:
  Sim; a mídia também passa pela mesma porta segura do site quando a rede bloqueia o resto.
- Q: Quando o servidor de mídia volta, microfone, câmera e tela voltam como estavam ou desligados?
  → A: Como estavam; o que estava ligado volta sozinho (inclusive a mesma tela), e o que a pessoa
  desligou durante a queda continua desligado.

## User Scenarios & Testing *(mandatory)*

Hoje cada navegador manda voz, câmera e tela diretamente para cada um dos outros (T03–T05). Numa
sala com 6 pessoas, quem compartilha em 1080p envia 5 cópias da tela, além de 5 cópias da câmera e
da voz; o upload de uma internet doméstica não aguenta e a imagem trava para todos. Com o servidor
de mídia, cada pessoa envia **uma** cópia de cada coisa e o servidor repassa aos outros. Para quem
usa, nada muda na tela: os mesmos botões, os mesmos tempos, mas sem travar com a sala cheia.

### User Story 1 - Sala cheia sem travar (Priority: P1)

Seis amigos estão na sala, todos com câmera e microfone ligados, e um deles compartilha um jogo em
1080p a 30 quadros por segundo. Todos veem e ouvem tudo com fluidez, e o upload de quem compartilha
não aumenta conforme mais gente entra.

**Why this priority**: é o motivo da task; sem isso o problema relatado continua.

**Independent Test**: com 6 navegadores (em máquinas/internets diferentes, ao menos um numa internet
doméstica comum), ligar as 6 câmeras e microfones e compartilhar em "1080p · 30 fps". Nas estatísticas
do navegador de quem compartilha, contar as transmissões de saída: 1 de tela, 1 de câmera, 1 de voz
(e 1 de som da tela, quando houver). Assistir por 10 minutos.

**Acceptance Scenarios**:

1. **Given** uma pessoa compartilhando, **When** o número de pessoas assistindo vai de 1 a 5,
   **Then** ela continua enviando uma única transmissão de tela (e uma do som da tela, quando houver).
2. **Given** uma pessoa com microfone e câmera ligados, **When** a sala tem de 2 a 6 pessoas,
   **Then** ela envia uma única transmissão de voz e uma única de câmera.
3. **Given** a sala cheia com 6 câmeras ligadas e a tela em 1080p 30 fps, **When** todos assistem
   por 10 minutos, **Then** ninguém vê a imagem congelar por mais de 1 s nem ouve cortes na voz.
4. **Given** a sala com o servidor de mídia, **When** qualquer pessoa usa microfone, câmera,
   compartilhamento, qualidade, tela cheia, destaque/miniaturas e recados, **Then** tudo funciona
   como na T09, com os mesmos tempos (ex.: ser ouvido/visto após entrar, mudar o estado em até 3 s,
   começar a ver a tela em até 5 s, recados ao vivo em até 1 s).

---

### User Story 2 - Só quem está na sala acessa a mídia (Priority: P1)

A mídia de uma sala só chega a quem entrou nela pelo app. Quem não está na sala, quem já saiu ou
quem está numa sala diferente não consegue ouvir nem ver nada, mesmo que saiba o endereço do
servidor de mídia.

**Why this priority**: a mídia passa a ficar num ponto central; sem essa proteção, qualquer um
poderia escutar uma sala. Vale tanto quanto a US1.

**Independent Test**: tentar conectar ao servidor de mídia sem ter entrado na sala, com a permissão
de outra sala e com a permissão de quem já saiu; nos três casos, recusa e nenhuma mídia chega.

**Acceptance Scenarios**:

1. **Given** uma pessoa que entrou na sala pelo app, **When** ela liga microfone, câmera ou tela,
   **Then** a mídia chega a todos da sala.
2. **Given** alguém que não entrou na sala (sem permissão, ou com permissão inventada), **When**
   tenta se conectar à mídia da sala, **Then** é recusado e não recebe nem envia nada.
3. **Given** uma permissão válida para a sala A, **When** é usada para a sala B, **Then** é recusada.
4. **Given** uma pessoa que saiu, foi desconectada ou fechou a aba, **When** sua permissão é usada
   de novo, **Then** é recusada; e quem saiu para de receber a mídia da sala em até 3 s.
5. **Given** a sala cheia (a 7ª vê "Sala cheia", T02), **When** essa 7ª pessoa tenta a mídia,
   **Then** não recebe permissão.

---

### User Story 3 - Servidor de mídia fora do ar (Priority: P2)

Se o servidor de mídia cair ou parar de responder, a pessoa vê uma mensagem clara em pt-BR. Ela
continua na sala: a lista de participantes, o link e os recados seguem funcionando. Quando o
servidor volta, voz, câmera e tela voltam sozinhas, como estavam.

**Why this priority**: falha rara, mas sem tratamento a sala parece quebrada sem explicação.

**Independent Test**: com 3 pessoas na sala e mídia ativa, desligar o servidor de mídia; conferir a
mensagem, mandar um recado, ver alguém entrar/sair na lista; religar e conferir a volta da mídia.

**Acceptance Scenarios**:

1. **Given** a sala com mídia ativa, **When** o servidor de mídia cai ou não responde, **Then** em
   até 10 s cada pessoa vê "Não foi possível conectar voz, câmera e tela. Tentando de novo…"; os
   controles de microfone, câmera e tela só permitem desligar (ligar fica indisponível).
2. **Given** o servidor de mídia fora do ar, **When** alguém entra, sai ou manda um recado, **Then**
   a lista de participantes e os recados funcionam normalmente.
3. **Given** o servidor de mídia fora do ar, **When** ele volta, **Then** em até 10 s a mensagem some
   e os controles voltam; microfone, câmera e tela voltam como estavam antes da queda, sem a pessoa
   fazer nada (o que ela desligou durante a queda continua desligado).
4. **Given** uma pessoa entrando numa sala com o servidor de mídia fora do ar, **When** a sala abre,
   **Then** ela entra normalmente e vê a mesma mensagem.

---

### Edge Cases

- **Conexão de uma pessoa ruim**: só ela é afetada (atraso ou imagem pior para ela); os outros não
  travam por causa dela.
- **Rede que só libera navegação comum** (empresa, faculdade): a mídia passa pela mesma porta segura
  do site; voz, câmera e tela funcionam, com atraso um pouco maior. Se a rede bloquear até o site, a
  pessoa nem entra na sala (como hoje).
- **Vários compartilhando**: cada um envia uma transmissão de tela; quem assiste continua
  recebendo só a tela em destaque (T05 FR-019), com a troca de destaque nos mesmos tempos.
- **Permissão expira com a pessoa ainda na sala** (ex.: aba aberta por horas): a mídia não cai; a
  permissão é renovada sem a pessoa perceber.
- **Pessoa recarrega a página**: volta sem mídia ligada (como hoje) e recebe permissão nova.
- **Duas abas da mesma pessoa** (T02 "aberta em outra aba"): a aba antiga perde o acesso à mídia.
- **O app principal cai, mas o servidor de mídia não**: comportamento atual de perda de conexão
  ("Você perdeu a conexão…"); a mídia também é encerrada.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Voz, câmera, tela e som da tela de cada pessoa MUST ir uma única vez para o servidor
  de mídia, que MUST repassar a cada outra pessoa da sala; nenhum navegador MUST enviar mídia
  diretamente para outro.
- **FR-002**: O número de transmissões de saída de cada pessoa MUST NOT depender do número de
  pessoas na sala: no máximo uma de voz, uma de câmera, uma de tela e uma de som da tela.
- **FR-002a**: Cada mídia MUST ser enviada numa única qualidade; todos que assistem MUST receber a
  mesma qualidade, escolhida por quem compartilha (T06). Quem tem internet fraca MAY ver a imagem
  atrasada ou pior, sem afetar os outros.
- **FR-003**: Todos os critérios de aceite de T03 a T09 MUST continuar valendo, com os mesmos tempos
  e textos; em particular quem assiste MUST continuar recebendo só a tela em destaque (T05 FR-019) e
  as qualidades da T06 MUST chegar a quem assiste.
- **FR-004**: Com 6 pessoas, 6 câmeras e microfones ligados e uma tela em 1080p 30 fps, a sala MUST
  funcionar sem congelamentos maiores que 1 s nem cortes de voz numa internet doméstica comum
  (≥ 10 Mbit/s de upload e ≥ 50 Mbit/s de download).
- **FR-005**: O acesso à mídia de uma sala MUST exigir uma permissão emitida pelo app só para quem
  entrou naquela sala; a permissão MUST valer só para aquela sala e para aquela pessoa.
- **FR-006**: Permissões inexistentes, de outra sala ou de quem já saiu MUST ser recusadas; quem sai
  MUST parar de receber a mídia da sala em até 3 s.
- **FR-007**: Quando o servidor de mídia cai ou não responde, cada pessoa MUST ver em até 10 s a
  mensagem "Não foi possível conectar voz, câmera e tela. Tentando de novo…"; os controles de
  microfone, câmera e tela MUST permitir só desligar; lista de participantes, link e recados MUST
  continuar funcionando. O app MUST NOT voltar a enviar mídia direto entre navegadores nesse caso.
- **FR-008**: O app MUST tentar reconectar sozinho; quando o servidor volta, a mensagem MUST sumir e
  os controles MUST voltar em até 10 s, e o que estava ligado MUST voltar a ser transmitido sozinho
  (inclusive a mesma tela, sem escolher de novo); o que a pessoa desligou durante a queda MUST
  continuar desligado.
- **FR-009**: Para quem usa, a interface MUST continuar a mesma da T09 (sem novos botões nem passos);
  o único texto novo é a mensagem do FR-007.
- **FR-010**: O servidor de mídia MUST rodar no mesmo servidor do app, instalado e mantido por quem
  hospeda o site, e MUST subir junto com ele pelo mesmo processo de instalação; nenhum serviço pago
  de terceiros MUST ser necessário.
- **FR-011**: Voz, câmera e tela MUST funcionar também em redes que só permitem navegação comum
  (acesso a sites seguros), passando pela mesma porta segura do site, sem nada a configurar por quem
  usa.

### Key Entities

- **Servidor de mídia**: recebe a voz, câmera, tela e som da tela de cada pessoa e repassa para os
  outros da mesma sala; não guarda nada.
- **Permissão de mídia**: autorização emitida pelo app quando a pessoa entra na sala; liga uma
  pessoa a uma sala, tem validade curta, é renovada enquanto a pessoa está na sala e deixa de valer
  quando ela sai.
- **Transmissão**: um envio de voz, câmera, tela ou som da tela de uma pessoa ao servidor de mídia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em salas de 2 a 6 pessoas, as estatísticas do navegador de quem compartilha mostram
  exatamente 1 transmissão de saída de tela em 100% das medições.
- **SC-002**: Em salas de 2 a 6 pessoas, cada pessoa tem no máximo 1 transmissão de saída de voz e 1
  de câmera em 100% das medições.
- **SC-003**: Todos os critérios de aceite de T03 a T09 passam de novo, com os mesmos tempos.
- **SC-004**: Com 6 pessoas, 6 câmeras e 1080p 30 fps por 10 minutos, nenhum participante registra
  congelamento de imagem acima de 1 s nem corte de voz perceptível.
- **SC-005**: 100% das tentativas de acesso sem permissão, com permissão de outra sala ou de quem já
  saiu são recusadas sem que nenhuma mídia chegue.
- **SC-006**: Com o servidor de mídia desligado, 100% das pessoas na sala veem a mensagem em até 10 s
  e conseguem mandar recados e ver a lista atualizada; ao religar, em até 10 s a mídia volta como estava,
  sem recarregar a página nem ligar nada de novo.
- **SC-007**: O upload de quem compartilha em 1080p 30 fps fica igual (±20%) numa sala de 2 e numa
  sala de 6 pessoas.
- **SC-008**: Numa rede que só libera navegação segura, uma pessoa consegue ouvir, falar, ver as
  câmeras e a tela, com os mesmos tempos de T03–T05 acrescidos de no máximo 1 s.

## Assumptions

- O limite de 6 pessoas por sala (T02) continua; não é objetivo suportar salas maiores.
- Ninguém instala nada: tudo continua no navegador (restrição da constituição).
- A conversa continua só ao vivo: o servidor de mídia não grava nem guarda nada.
- Quem assiste recebe as transmissões que precisa (5 vozes, até 5 câmeras e 1 tela); o download
  de uma internet doméstica comum dá conta disso.
- Adaptar a qualidade separadamente para cada pessoa que assiste fica fora desta task (ver
  Clarifications).
- A privacidade é a mesma de hoje: a mídia é cifrada no caminho e só passa pelo servidor do
  próprio projeto.
- A máquina que hospeda o site tem endereço público, as portas de rede necessárias para a mídia
  liberadas e banda de saída suficiente (≈ 60 Mbit/s por sala cheia).
- O site é servido com um domínio próprio e certificado de site seguro (HTTPS), usados também pelo
  servidor de mídia (FR-011).
- **Altera T03–T05**: as decisões de "conexão direta com cada pessoa" desses specs deixam de valer;
  os comportamentos para quem usa continuam.
