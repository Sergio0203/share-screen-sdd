# Research: T10 · Mídia passando por um servidor (modelo Discord)

Hoje (T03–T06) cada navegador abre uma conexão WebRTC direta com cada outra pessoa (malha), só com
STUN, sinalizada pela mensagem `sinal` do WebSocket da sala; a tela só vai para quem a tem em
destaque (T05 research §2). Esta pesquisa troca a malha por um servidor de mídia que recebe uma
cópia de cada pessoa e repassa (SFU — *selective forwarding unit*), mantendo para quem usa tudo o
que T03–T09 definem.

## 1. Servidor de mídia

- **Decision**: **LiveKit** (código aberto, Apache-2.0), rodando como um container próprio
  (`livekit/livekit-server`, versão fixada) ao lado do app, na mesma máquina, com um arquivo de
  configuração no repositório. Uma "sala LiveKit" por sala do app, com o mesmo id.
- **Rationale**: entrega pronto o que a spec pede e que seria código nosso com outras opções:
  repasse seletivo, acesso por permissão assinada por sala e pessoa (FR-005), TURN embutido com TLS
  para redes restritas (FR-011), reconexão automática do lado do navegador (FR-008), e expulsão de
  participante por API (FR-006). Container separado torna a queda do servidor de mídia um caso
  real e testável (`docker stop`), sem derrubar lista e recados (US3). Não exige serviço pago
  (FR-010).
- **Alternatives considered**:
  - *mediasoup* (biblioteca Node, roda dentro do app): sem processo extra, e o acesso viria de graça
    pelo WebSocket da sala; mas o cliente (`mediasoup-client`) precisa de empacotador (o projeto
    não tem), toda a sinalização SFU seria nossa (transports, producers, consumers, reconexão) e
    não tem TURN — FR-011 exigiria ainda um coturn. Muito mais código próprio.
  - *Janus* / *Jitsi*: configuração pesada (plugins, vários serviços) para um grupo de 6.
  - *SFU próprio (Pion etc.)*: contraria o Princípio I.
  - *Serviço na nuvem*: descartado pela clarificação (FR-010).

## 2. Biblioteca do navegador

- **Decision**: dependência npm `livekit-client` (Apache-2.0). O pacote traz
  `dist/livekit-client.esm.mjs`, um módulo ES único sem `import` externos (~1,4 MB); o servidor do
  app serve esse arquivo em **`/js/livekit-client.js`** a partir de `node_modules` (uma rota fixa),
  e `midia.js` faz `import { Room, … } from "./livekit-client.js"`.
- **Rationale**: continua sem empacotador nem passo de build; a versão fica fixada no
  `package-lock.json` e entra na imagem Docker pelo `npm ci --omit=dev` que já existe.
- **Alternatives considered**: copiar o arquivo para `public/` (duplicaria 1,4 MB no repositório e
  sairia de sincronia com o lock); CDN (contraria "nenhum serviço externo" e depende de terceiros).

## 3. Permissão de mídia (FR-005)

- **Decision**: o app emite um **token JWT HS256** assinado com `node:crypto` (sem
  `livekit-server-sdk`) usando `LIVEKIT_API_KEY`/`LIVEKIT_API_SECRET`, com:
  `iss` = chave, `sub` = id público do participante, `name` = nome, `nbf`/`exp` (**validade 30 s**),
  `video: { room: idSala, roomJoin: true, canPublish: true, canSubscribe: true,
  canPublishData: false, canPublishSources: ["microphone", "camera", "screen_share",
  "screen_share_audio"] }`. O token só sai pelo WebSocket da sala, numa mensagem `midia`, depois de
  `entrou` e quando o navegador pede de novo (`pedir-midia`, para reconectar).
- **Rationale**: o único jeito de obter um token é ter passado pela entrada da sala (que já confere
  sala, vaga e nome); `room` prende o token à sala e `sub` à pessoa. Validade curta: o token só serve
  para *conectar* — conectado, o próprio LiveKit renova a sessão. Assinar HS256 são ~15 linhas com
  `crypto.createHmac`, menos que uma dependência.
- **Identidade**: o id público já é renovado ao recarregar e ao abrir em outra aba (T02/T03); o
  LiveKit derruba uma conexão antiga quando outra entra com a mesma identidade.
- **Defesa extra**: `room.max_participants: 6` na configuração do LiveKit.
- **Alternatives considered**: token longo (reusável por quem saiu); permissão pelo próprio
  WebSocket (só possível com SFU embutido, ver §1).

## 4. Tirar o acesso de quem sai (FR-006)

- **Decision**: duas regras no app:
  1. **Ao sair** (fechar aba, cair, ser substituído por outra aba, sala expirar), o registro avisa
     (`aoSair(idSala, idPublico)`) e o app chama a API do LiveKit `RoomService/RemoveParticipant`
     (HTTP POST em `LIVEKIT_API_URL/twirp/livekit.RoomService/RemoveParticipant`, token com
     `roomAdmin` daquela sala).
  2. **Ao entrar no LiveKit**, o LiveKit avisa o app por *webhook* (`participant_joined`, POST em
     `/api/livekit/eventos`, assinado com a mesma chave: cabeçalho `Authorization` JWT com o
     `sha256` do corpo). Se a identidade não está na sala no registro do app, o app chama
     `RemoveParticipant` na hora.
- **Rationale**: (1) cumpre "quem sai para de receber em até 3 s" (a chamada leva milissegundos).
  (2) fecha o buraco do token de 30 s usado depois da saída, e também o caso do servidor de mídia
  reiniciar e alguém que já saiu tentar voltar. Risco residual documentado: entre o
  `participant_joined` e a expulsão (< 1 s), dentro dos 30 s do token, quem acabou de sair poderia
  receber um instante de mídia — aceito para um grupo de amigos.
- **Alternatives considered**: consultar a lista de participantes do LiveKit a cada 2 s (mais
  chamadas, janela maior); tokens de uso único (o LiveKit não oferece).

## 5. Mapeamento de canais

- **Decision**: cada pessoa publica até 4 trilhas com as **fontes** do LiveKit: `microphone`,
  `camera`, `screen_share`, `screen_share_audio`. A identidade LiveKit é o id público da lista
  `participantes`, então `videoDe(id)`/`telaDe(id)` continuam iguais para `app.js`.
- **Rationale**: a fonte nomeada substitui a tabela `CANAIS` por posição (T05 §1) e a regra
  `devoIniciar`/`compararPares` (T03 §4) — tudo isso deixa de existir.

## 6. Receber só a tela em destaque (T05 FR-019)

- **Decision**: `autoSubscribe: false`. Cada navegador assina **sempre** `microphone` e `camera` de
  todos, e `screen_share`/`screen_share_audio` **só** de quem está no próprio destaque
  (`assistindo`). Trocar o destaque = cancelar a assinatura da tela anterior e assinar a nova. Regra
  pura `assinaturasDesejadas(publicacoes, assistindo)` testável.
- **Rationale**: o servidor só manda a quem assina — o download de quem assiste continua com uma
  tela só. Quem compartilha publica uma vez, sem depender de quem assiste (a regra
  `enviaTelaPara` some). `assistindo` continua indo ao servidor do app (outras telas usam).
- **Dynacast** ligado: se ninguém assina a tela, o navegador de quem compartilha pausa o envio.

## 7. Qualidade (T06, FR-002a)

- **Decision**: publicar com **`simulcast: false`** (uma qualidade só). Tela:
  `videoEncoding: { maxBitrate: taxaMaxima, maxFramerate: qps }`, `degradationPreference:
  "maintain-framerate"`, `contentHint = "motion"`, captura com `restricoesDeCaptura` (como hoje).
  Trocar a qualidade: `applyConstraints` + `sender.setParameters(parametrosDeEnvio(...))` no
  `sender` da publicação — reaproveita `qualidades.js` sem mudança. Câmera: 640×360 a 15 fps,
  `simulcast: false`. Voz: padrão do LiveKit (Opus com DTX).
- **`adaptiveStream: false`**: sem camadas, não há o que adaptar por quem assiste.
- **Rationale**: uma única transmissão por mídia é exatamente o que SC-001/SC-002 medem.

## 8. Captura sem mudança, publicação separada

- **Decision**: a captura continua em `midia.js` como hoje (`getUserMedia`/`getDisplayMedia` com as
  mesmas opções, inclusive `restrictOwnAudio`, `systemAudio`, `selfBrowserSurface`), e as trilhas
  capturadas são publicadas com `room.localParticipant.publishTrack(trilha, { source, … })`.
- **Rationale**: mantém mensagens de erro (`classificarErroCaptura`/`classificarErroCompartilhamento`),
  prévias e o fim pelo botão do navegador exatamente como em T03–T06; e mantém a trilha viva
  independente da conexão com o servidor de mídia (base do §9).

## 9. Queda e volta do servidor de mídia (FR-007, FR-008, US3)

- **Decision**: estados da conexão de mídia no navegador: `conectando` → `conectada` →
  (`reconectando` → `conectada` | `indisponivel`) → … Regras:
  - `RoomEvent.Reconnecting`: se não voltar em **3 s**, estado `indisponivel` (evita piscar a
    mensagem em quedas de 1 s). `Disconnected` (sem ter sido pedido) ou falha ao conectar →
    `indisponivel` na hora. Tempos de conexão do LiveKit: `websocketTimeout`/`peerConnectionTimeout`
    de 5 s → a mensagem aparece em ≤ 10 s (FR-007).
  - Em `indisponivel`: mensagem `TEXTOS.midiaIndisponivel`, botões só desligam (ligar fica
    `disabled`); as **trilhas locais continuam vivas** (o microfone segue capturado, a tela
    continua escolhida).
  - O app tenta de novo sozinho a cada **3 s**: pede token novo (`pedir-midia`) e conecta. Ao
    conectar, publica **as trilhas locais que ainda estão vivas** — o que a pessoa desligou na
    queda (trilha parada) não volta (clarificação Q4). Mensagem some, botões voltam (≤ 10 s após o
    servidor voltar: até 3 s de espera + conexão).
  - O próprio LiveKit tenta retomar sozinho por ~45 s; se retomar, ele mesmo republica.
  - Regra pura `trilhasParaPublicar(trilhasLocais)` (só `readyState === "live"`) e a máquina de
    estados `proximoEstadoMidia(estado, evento)` testáveis.
- **Lista e recados**: não dependem do servidor de mídia (vão pelo WebSocket do app), então
  continuam (FR-007).
- **Servidor do app cai**: comportamento atual ("Você perdeu a conexão…"); `room.disconnect()`.
- **Alternatives considered**: voltar desligado (rejeitado em Q4); voltar à malha (rejeitado em Q1).

## 10. Redes restritas e implantação (FR-010, FR-011)

- **Decision**: `docker-compose.yml` novo com três serviços:
  - **caddy** (imagem `livekit/caddyl4`, Caddy com módulo de camada 4): única coisa na porta
    **443**; HTTPS automático (Let's Encrypt) para o domínio do app; roteia por SNI
    `turn.<domínio>` para o TURN/TLS do LiveKit e o resto para HTTP: `/rtc*` → LiveKit (sinalização
    do navegador), demais → app.
  - **livekit**: `rtc.tcp_port: 7881`, `rtc.udp_port: 7882` (porta UDP única), `turn.enabled`,
    `turn.domain: turn.<domínio>`, `turn.tls_port: 5349` (atrás do Caddy, `external_tls: true`),
    `use_external_ip: true`, `webhook` apontando para o app, `room.max_participants: 6`.
  - **app**: a imagem atual, com `LIVEKIT_URL=wss://<domínio>`, `LIVEKIT_API_URL=http://livekit:7880`,
    `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (de `.env`, fora do repositório).
- Portas abertas na máquina: 80/tcp (certificado), 443/tcp, 7881/tcp, 7882/udp. DNS: o domínio e
  `turn.` apontando para a máquina.
- **Caminhos de mídia**, do melhor ao pior: UDP 7882 → TCP 7881 → TURN/TLS na 443 (o LiveKit oferece
  os três; o navegador escolhe o que passar). Numa rede que só libera HTTPS, só o último passa
  (SC-008: +≤ 1 s).
- **Rationale**: é a configuração que o próprio LiveKit documenta para "porta 443 compartilhada"; o
  Caddy também resolve o HTTPS do site, que hoje não está no repositório.
- **Desenvolvimento**: `docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp
  livekit/livekit-server --dev --bind 0.0.0.0` (chave `devkey`/`secret`); sem variáveis, o app usa
  esses valores de desenvolvimento. `http://localhost` continua bastando para microfone e câmera.
- **Banda**: sala cheia, por quem assiste ≈ 4 Mbit/s (tela 1080p30) + 5 × 0,5 (câmeras) + 5 × 0,05
  (vozes) ≈ 7 Mbit/s; servidor ≈ 6 × 7 ≈ 45–60 Mbit/s de saída e ≈ 8 Mbit/s de entrada. Máquina
  sugerida: 2 vCPU, 2 GB (o LiveKit só repassa, não recodifica).

### Conferido na implementação (2026-11-17)

- `livekit/livekit-server:v1.13.11`: `livekit.yaml` aceito (`ports` → 7880, 7881/tcp, 5349 TURN/TLS,
  7882/udp). Com `turn.external_tls: true` e `tls_port: 5349`, o servidor anuncia aos navegadores
  `turns:turn.<domínio>:443?transport=tcp` (lido em `RTCPeerConnection.getConfiguration()`).
- Domínio do TURN, chaves e chave dos avisos vão por ambiente (`LIVEKIT_TURN_DOMAIN`,
  `LIVEKIT_KEYS`, `LIVEKIT_WEBHOOK_API_KEY`), que prevalece sobre o arquivo — conferido com um
  domínio diferente no ambiente. Assim `livekit.yaml` fica sem segredos nem domínio.
- `livekit/caddyl4` (Caddy 2.11.3 com `layer4`): o `Caddyfile` usa a opção global `layer4` (SNI
  `turn.<domínio>` → `tls` + `proxy livekit:5349`; o resto → `proxy 127.0.0.1:8443` sem abrir o TLS)
  e um site em `https://<domínio>:8443, https://turn.<domínio>:8443` que obtém os dois certificados;
  `caddy validate` → "Valid configuration".
- Não conferido aqui (precisa de um servidor com domínio público): emissão real do certificado,
  TURN/TLS de ponta a ponta e SC-004/SC-008 — tarefa T041.

## 11. O que sai do código

- `midia-regras.js`: `devoIniciar` e `compararPares` (malha) removidos; ficam
  `classificarErroCaptura` e `classificarErroCompartilhamento`.
- `midia.js`: pares, `RTCPeerConnection`, `CANAIS`, `transceptorDe`, sinalização, `enviaTelaPara`,
  `aplicarEnvioTela`, `SERVIDORES_ICE` removidos.
- Servidor: mensagem `sinal` e `conexaoPorId`/`idPorConexao` (só serviam ao repasse) removidos.
- `app.js`: `aoFalharPar`/`paresSemConexao` passam a vir de "a trilha de alguém não chega" (falha de
  assinatura) — o quadro "falhou" da T04 continua existindo para esse caso.

## 12. Testes (Princípio III)

- **Unitários** (sem rede): assinatura e conteúdo do token (`permissao-midia.js`), verificação do
  webhook (assinatura válida, corpo alterado, chave errada), `assinaturasDesejadas`,
  `trilhasParaPublicar`, `proximoEstadoMidia`; `midia.test.js` reescrito com um `Room` falso
  (publicar uma vez por mídia, assinar só a tela em destaque, qualidade, republicar ao voltar).
- **Integração**: WebSocket só entrega `midia` depois de `entrou`; token com a sala e a pessoa
  certas; `pedir-midia` antes de entrar é recusado; ao sair, um LiveKit falso (servidor HTTP do
  teste) recebe `RemoveParticipant`; webhook com identidade fora da sala → `RemoveParticipant`;
  webhook com assinatura inválida → 401; `/js/livekit-client.js` servido como JavaScript.
- **Manual** ([quickstart.md](quickstart.md)): LiveKit real em Docker; `chrome://webrtc-internals`
  para SC-001/SC-002/SC-007; `docker stop livekit` para US3; rede só-HTTPS para SC-008; 6 janelas
  para SC-004; reexecutar os quickstarts de T03–T09 (SC-003).
