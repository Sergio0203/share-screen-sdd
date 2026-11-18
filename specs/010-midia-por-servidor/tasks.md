---

description: "Task list for T10 · Mídia passando por um servidor (modelo Discord)"
---

# Tasks: T10 · Mídia passando por um servidor (modelo Discord)

**Input**: Design documents from `/specs/010-midia-por-servidor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (websocket.md,
livekit.md, ui.md), quickstart.md

**Tests**: Incluídos (constituição, Princípio III: acesso à mídia e conexões são lógica principal).
Em cada fase, os testes vêm antes da implementação e devem falhar primeiro. A parte que depende de
um LiveKit real (uma transmissão por mídia, sala cheia, rede só-HTTPS) é conferida no roteiro manual
do [quickstart.md](quickstart.md).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto único: `src/` (servidor), `public/` (navegador), `tests/`, arquivos de implantação na raiz.
Ver [plan.md](plan.md).

**Regras gerais**: decisões em [research.md](research.md) ("research §N"); campos e regras em
[data-model.md](data-model.md); mensagens em [contracts/websocket.md](contracts/websocket.md);
LiveKit em [contracts/livekit.md](contracts/livekit.md); interface em [contracts/ui.md](contracts/ui.md).
Nenhum texto existente de `public/js/textos.js` muda; o único novo é `midiaIndisponivel`. Nenhuma
dependência além de `livekit-client` (sem `livekit-server-sdk`, sem empacotador). Após cada fase,
`npm test` e `npm run format:check` devem passar.

### Constantes

```text
Validade da permissão de mídia (e do token de administração): 30 s
Estado "reconectando" vira "indisponivel" após: 3 s
Intervalo entre tentativas em "indisponivel": 3 s
websocketTimeout / peerConnectionTimeout do livekit-client: 5000 ms
Opções da sala LiveKit: autoSubscribe false, adaptiveStream false, dynacast true
Fontes: microphone, camera, screen_share, screen_share_audio (simulcast: false em todas)
Corpo máximo do webhook: 64 KiB
Rota do cliente: GET /js/livekit-client.js → node_modules/livekit-client/dist/livekit-client.esm.mjs
Rota do webhook: POST /api/livekit/eventos
Padrões de desenvolvimento: LIVEKIT_URL ws://localhost:7880, LIVEKIT_API_URL http://localhost:7880,
  LIVEKIT_API_KEY devkey, LIVEKIT_API_SECRET secret
Texto: midiaIndisponivel = "Não foi possível conectar voz, câmera e tela. Tentando de novo…"
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependência do navegador servida pelo app e configuração do LiveKit

- [X] T001 Adicionar `livekit-client` (2.x, versão exata fixada) às `dependencies` em `package.json` e atualizar `package-lock.json` com `npm install`; conferir que `node_modules/livekit-client/dist/livekit-client.esm.mjs` não tem `import` externo (research §2)
- [X] T002 [P] Teste em `tests/integration/estaticos.test.js`: `GET /js/livekit-client.js` devolve 200 com `content-type` JavaScript e um corpo que contém `class Room`; `GET /js/../node_modules/...` continua 404
- [X] T003 Rota fixa em `src/servidor.js` (`servirEstatico` ou antes dela): o caminho exato `/js/livekit-client.js` lê `node_modules/livekit-client/dist/livekit-client.esm.mjs` (resolvido com `createRequire(import.meta.url).resolve("livekit-client/package.json")` + `dist/livekit-client.esm.mjs`) e responde `text/javascript; charset=utf-8`; nenhum outro arquivo de `node_modules` fica acessível
- [X] T004 [P] Criar `src/livekit.js` com `lerConfiguracaoLivekit(env = process.env)` → `{ url, urlApi, chave, segredo }` a partir de `LIVEKIT_URL`, `LIVEKIT_API_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, com os padrões de desenvolvimento das Constantes; e `criarServidor` em `src/servidor.js` passa a aceitar `livekit` nas opções (padrão: `lerConfiguracaoLivekit()`), para os testes injetarem valores
- [X] T005 [P] Criar `.env.exemplo` na raiz com `DOMINIO=telao.exemplo.com`, `LIVEKIT_API_KEY=troque-esta-chave`, `LIVEKIT_API_SECRET=troque-este-segredo-com-32-caracteres-ou-mais` e comentários em pt-BR; confirmar que `.env` está no `.gitignore` (adicionar se faltar)

**Checkpoint**: `npm test` passa; o navegador consegue `import("/js/livekit-client.js")`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: permissão de mídia emitida pelo app e entregue pelo WebSocket — sem ela nenhuma
história conecta ao servidor de mídia

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 [P] Testes em `tests/unit/permissao-midia.test.js` para `criarPermissaoMidia({ chave, segredo, idSala, idPublico, nome, agora })`: é um JWT de 3 partes base64url com cabeçalho `{"alg":"HS256","typ":"JWT"}`; a assinatura confere com `crypto.createHmac("sha256", segredo)`; claims exatamente `iss` = chave, `sub` = idPublico, `name` = nome, `nbf` = agora (s), `exp` = agora + 30, `video` = `{ room: idSala, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: false, canPublishSources: ["microphone","camera","screen_share","screen_share_audio"] }`; e para `criarPermissaoAdministracao({ chave, segredo, idSala, agora })`: `sub` = `"telao-app"`, `video` = `{ room: idSala, roomAdmin: true }`, `exp` = agora + 30
- [X] T007 Implementar `src/permissao-midia.js` com `criarPermissaoMidia` e `criarPermissaoAdministracao` (JWT HS256 com `node:crypto`, base64url sem preenchimento, `agora` em ms com padrão `Date.now()`) — data-model.md "Permissão de mídia"
- [X] T008 Ajustar `tests/integration/auxiliares.js`: o cliente de teste guarda à parte as mensagens `midia` (ex.: `cliente.midias`) e `proxima()` as pula, para os testes de T02–T08 em `tests/integration/websocket.test.js` não mudarem; rodar `npm test` e confirmar que nada quebrou
- [X] T009 [P] Testes em `tests/integration/midia-acesso.test.js` (servidor com `livekit: { url: "ws://midia.teste", urlApi, chave: "chave", segredo: "segredo-de-teste" }`): (a) depois de `entrou`, chega `{ tipo: "midia", url: "ws://midia.teste", token }` e o token tem `video.room` = id da sala e `sub` = `entrou.voce`; (b) `pedir-midia` depois de entrar → nova `midia` com token válido; (c) `pedir-midia` antes de `entrar` → `erro` `mensagem-invalida` e conexão fechada; (d) conexão substituída por outra aba não recebe mais `midia` ao pedir; (e) a 7ª pessoa ("Sala cheia") não recebe `midia`
- [X] T010 Em `src/servidor.js`: em `tratarEntrar`, logo depois de `entrou`, enviar `midia` com `criarPermissaoMidia` (sala, `participante.id`, nome); nova mensagem `pedir-midia` (só com `jaEntrou`) que reenvia `midia` com o id público **atual** da conexão (via registro); para isso adicionar em `src/salas.js` `participantePublicoPorConexao(idSala, conexao)` → `{ id, nome } | null` (null para conexão substituída → nada enviado). Contrato: contracts/websocket.md

**Checkpoint**: `npm test` passa; quem entra recebe a permissão; ninguém de fora recebe.

---

## Phase 3: User Story 1 - Sala cheia sem travar (Priority: P1) 🎯 MVP

**Goal**: voz, câmera e tela vão uma vez ao servidor de mídia e chegam a todos; tudo de T03–T09
continua igual

**Independent Test**: quickstart passos 1–4 e 7 (uma transmissão por mídia em `webrtc-internals`, 6
pessoas sem travar, só a tela em destaque, regressão de T03–T09)

### Tests for User Story 1

- [X] T011 [P] [US1] Testes em `tests/unit/midia-estado.test.js` para `assinaturasDesejadas(publicacoes, assistindo)` (cada publicação `{ identidade, fonte }`, devolve as mesmas na mesma ordem com `assinar: boolean`): `microphone`/`camera` sempre `true`; `screen_share` e `screen_share_audio` `true` só se `identidade === assistindo`; `assistindo` null → nenhuma tela; e para `trilhasParaPublicar(trilhas)` (objeto `{ microfone, camera, tela, somTela }` com trilhas ou null) → lista `{ fonte, trilha }` só das com `readyState === "live"`, na ordem microphone, camera, screen_share, screen_share_audio
- [X] T012 [P] [US1] Reescrever `tests/unit/midia.test.js` com um `Room` falso injetado em `criarMidia({ criarSala })` (registra `connect(url, token, opções)`, `localParticipant.publishTrack(trilha, opções)`/`unpublishTrack`, emite `participantConnected`, `trackPublished`, `trackSubscribed`, `trackSubscriptionFailed`, e cada publicação remota tem `setSubscribed`): (a) `conectar(url, token)` usa as opções da sala das Constantes; (b) ligar microfone/câmera publica uma vez com `source` certo e `simulcast: false`, desligar despublica e para a trilha; (c) compartilhar publica `screen_share` com `videoEncoding: { maxBitrate: taxaMaxima, maxFramerate: qps }` e `screen_share_audio` quando há som; (d) só a tela de quem está em `assistindo` é assinada, e trocar o destaque troca a assinatura; (e) `videoDe(id)`/`telaDe(id)` devolvem o mesmo `<video>` a cada chamada e `aoChegarVideo(id)` é chamado quando chega trilha; (f) `mudarQualidade` chama `applyConstraints` e `setParameters(parametrosDeEnvio(...))` no `sender` da publicação da tela; (g) `trackSubscriptionFailed` → `aoFalharPar(identidade)`; manter os casos atuais de prévia da própria tela, qualidade recusada e `qualidadeAtiva`
- [X] T013 [P] [US1] Atualizar `tests/unit/midia-regras.test.js`: remover os testes de `devoIniciar` e `compararPares`; manter os de `classificarErroCaptura` e `classificarErroCompartilhamento`
- [X] T014 [P] [US1] Atualizar `tests/integration/websocket.test.js`: remover os 3 testes de `sinal` e adicionar um que confirma que `{ tipo: "sinal", … }` depois de entrar agora dá `mensagem-invalida`

### Implementation for User Story 1

- [X] T015 [P] [US1] Criar `public/js/midia-estado.js` com `assinaturasDesejadas` e `trilhasParaPublicar` (funções puras, sem DOM nem LiveKit) — data-model.md "Assinaturas" e "Trilhas locais"
- [X] T016 [P] [US1] Remover `devoIniciar` e `compararPares` de `public/js/midia-regras.js` (e o comentário da malha)
- [X] T017 [US1] Reescrever `public/js/midia.js` sobre `livekit-client` (`import { Room, RoomEvent, Track } from "./livekit-client.js"`, com `criarSala` injetável para os testes): manter a captura e as opções atuais (`OPCOES_MICROFONE`, `OPCOES_CAMERA`, `OPCOES_TELA`, `contentHint = "motion"`, prévias, `ended`) e a mesma interface usada por `app.js` (`ligarMicrofone`, `desligarMicrofone`, `ligarCamera`, `desligarCamera`, `compartilharTela`, `pararCompartilhamento`, `mudarQualidade`, `qualidadeAtiva`, `previa`, `videoDe`, `telaDe`, `ativarSom`, `atualizarParticipantes`, `encerrar`); novo `conectar(url, token)`; publicar com `publishTrack(trilha, { source, simulcast: false, … })` (research §5, §7) e `degradationPreference: "maintain-framerate"` na tela; `atualizarParticipantes(lista, idVoce)` guarda o próprio `assistindo` e reaplica `assinaturasDesejadas` (research §6); ao receber trilha, ligar ao `<video>`/`<audio>` guardado por identidade e fonte (mesmos elementos reaproveitados como hoje) e chamar `aoChegarVideo`; `ativarSom` chama também `room.startAudio()`; `RoomEvent.AudioPlaybackStatusChanged` → `aoMudarSomBloqueado`; remover pares, `RTCPeerConnection`, `CANAIS`, `transceptorDe`, `enviaTelaPara`, `aplicarEnvioTela`, `receberSinal`, `SERVIDORES_ICE`
- [X] T018 [US1] Em `public/js/app.js`: tirar `enviarSinal` de `criarMidia` e `aoReceberSinal`/o ramo `sinal` de `conectar`; tratar a mensagem `midia` chamando `midia.conectar(mensagem.url, mensagem.token)`; trocar o comentário de `atualizarTela` ("quem compartilha só envia a tela…") pelo novo papel de `assistindo` (assinatura em quem assiste); `paresSemConexao` passa a ser alimentado por `aoFalharPar` vindo de `trackSubscriptionFailed`
- [X] T019 [US1] Em `src/servidor.js` e `src/salas.js`: remover `tratarSinal`, o ramo `sinal` de `atenderConexao`, `conexaoPorId` e `idPorConexao` (e os comentários que citam o repasse de sinais); ajustar `tests/unit/salas.test.js` se testar essas funções
- [X] T020 [US1] Rodar `npm test` e `npm run format:check`; com o LiveKit de desenvolvimento (quickstart "Desenvolvimento local"), fazer os passos 1, 2 e 4 do quickstart em 2–3 janelas e registrar o resultado na seção Notes deste arquivo

**Checkpoint**: voz, câmera e tela funcionam pelo servidor de mídia; cada pessoa envia uma
transmissão por mídia.

---

## Phase 4: User Story 2 - Só quem está na sala acessa a mídia (Priority: P1)

**Goal**: quem sai perde a mídia em ≤ 3 s; quem não está na sala é expulso ao tentar entrar

**Independent Test**: `tests/integration/midia-acesso.test.js` completo + quickstart passo 5

### Tests for User Story 2

- [X] T021 [P] [US2] Testes em `tests/unit/salas.test.js`: `aoSair(idSala, idPublico)` é chamado ao `sair`, com o id **antigo** quando a conexão é substituída por outra aba, e para cada participante restante quando a sala expira; não é chamado quando a conexão já substituída fecha; `participanteNaSala(idSala, idPublico)` → `true` só para ids públicos atuais da sala (false para id antigo, outra sala, sala inexistente)
- [X] T022 [P] [US2] Testes em `tests/unit/permissao-midia.test.js` para `verificarAvisoLivekit({ corpo, autorizacao, chave, segredo, agora })` → objeto do evento ou `null`: válido quando o JWT tem assinatura HS256 certa, `iss` = chave, não expirado (`exp`/`nbf` com 10 s de folga) e claim `sha256` = base64 de `sha256(corpo)`; `null` para corpo alterado, segredo errado, `iss` diferente, expirado, cabeçalho ausente, JSON inválido
- [X] T023 [US2] Completar `tests/integration/midia-acesso.test.js` com um LiveKit falso (servidor `node:http` do teste em porta livre, usado como `urlApi`, que guarda cada POST): (a) quem sai → `POST /twirp/livekit.RoomService/RemoveParticipant` com `{ room: idSala, identity: idPublico }` e `Authorization: Bearer` com token `roomAdmin` daquela sala, em ≤ 1 s; (b) outra aba substitui → `RemoveParticipant` do id antigo; (c) webhook `participant_joined` assinado, com identidade fora da sala → 200 e `RemoveParticipant`; (d) identidade na sala → 200 e nenhuma chamada; (e) assinatura inválida → 401 e nenhuma chamada; (f) corpo > 64 KiB ou JSON inválido → 400; (g) LiveKit falso respondendo 404/500 não derruba a sala (lista e recados continuam)

### Implementation for User Story 2

- [X] T024 [P] [US2] Em `src/salas.js`: nova opção `aoSair = () => {}` chamada em `sair`, na substituição por outra aba (com o id público antigo, antes de gerar o novo) e na expiração da sala; nova consulta `participanteNaSala(idSala, idPublico)` — data-model.md "Registro de salas"
- [X] T025 [P] [US2] Em `src/permissao-midia.js`: `verificarAvisoLivekit` (comparação de assinatura com `crypto.timingSafeEqual`)
- [X] T026 [US2] Em `src/livekit.js`: `removerDaMidia(configuracao, idSala, idPublico)` → `fetch` POST conforme contracts/livekit.md com `criarPermissaoAdministracao`; ignora `404`/`not_found`; outros erros e falhas de rede só `console.error`, nunca lançam
- [X] T027 [US2] Em `src/servidor.js`: passar `aoSair: (idSala, idPublico) => removerDaMidia(...)` ao registro; nova rota `POST /api/livekit/eventos` (lê o corpo até 64 KiB → 400 acima ou JSON inválido; `verificarAvisoLivekit` → 401 se `null`; `participant_joined` com `!participanteNaSala(room.name, participant.identity)` → `removerDaMidia`; responde 200)
- [X] T028 [US2] Rodar `npm test`; com o LiveKit de desenvolvimento configurado com `webhook.urls` para `http://host.docker.internal:3000/api/livekit/eventos`, fazer o quickstart passo 5 e registrar em Notes

**Checkpoint**: só quem está na sala recebe e envia mídia.

---

## Phase 5: User Story 3 - Servidor de mídia fora do ar (Priority: P2)

**Goal**: mensagem clara em ≤ 10 s, sala continua (lista, recados), volta sozinha como estava

**Independent Test**: quickstart passo 6 (`docker stop`/`docker start` do LiveKit com 3 pessoas)

### Tests for User Story 3

- [X] T029 [P] [US3] Testes em `tests/unit/midia-estado.test.js` para `proximoEstadoMidia(estado, evento)`: toda a tabela de transições do data-model.md ("Conexão de mídia"), inclusive `sair` de qualquer estado → `encerrada`, `encerrada` não sai mais, e eventos sem transição definida mantêm o estado; e `podeLigar(estado)` → `true` só em `conectada`
- [X] T030 [P] [US3] Testes em `tests/unit/midia.test.js` (com o `Room` falso e relógio falso injetado): (a) `connect` rejeitado → `aoMudarEstadoMidia("indisponivel")` e novo pedido de permissão (`pedirPermissao()`) a cada 3 s; (b) `Reconnecting` seguido de `Reconnected` em < 3 s → nenhum `indisponivel`; (c) `Reconnecting` por 3 s → `indisponivel`; (d) com microfone e tela ligados, `Disconnected` e depois `conectar` com sucesso → publica de novo microfone e a **mesma** trilha de tela, sem nova captura; (e) câmera desligada durante `indisponivel` não é publicada na volta; (f) ligar microfone/câmera/tela fora de `conectada` é recusado sem capturar; (g) `encerrar()` para tudo e não tenta mais

### Implementation for User Story 3

- [X] T031 [P] [US3] Em `public/js/midia-estado.js`: `proximoEstadoMidia` e `podeLigar` (puras)
- [X] T032 [P] [US3] Em `public/js/textos.js`: `midiaIndisponivel: "Não foi possível conectar voz, câmera e tela. Tentando de novo…"`
- [X] T033 [US3] Em `public/js/midia.js`: estado da conexão com `proximoEstadoMidia`; novos parâmetros `pedirPermissao` e `aoMudarEstadoMidia`; eventos `Reconnecting`/`Reconnected`/`Disconnected` e falha de `connect` alimentam o estado (temporizador de 3 s para `reconectando` → `indisponivel`); em `indisponivel`, a cada 3 s chama `pedirPermissao()` e o próximo `conectar(url, token)` tenta de novo; ao chegar a `conectada` vindo de `conectando`, publica `trilhasParaPublicar(trilhas)` (research §9); as trilhas locais **não** são paradas na queda; `ligar*`/`compartilharTela` recusam (sem capturar) quando `!podeLigar(estado)`; desligar funciona em qualquer estado; `room.disconnect()` em `encerrar`
- [X] T034 [US3] Em `public/js/app.js`: `criarMidia({ pedirPermissao: () => sala.enviar({ tipo: "pedir-midia" }), aoMudarEstadoMidia })`; em `indisponivel` mostrar `TEXTOS.midiaIndisponivel` (aviso de erro da T09, sem sumir sozinho) e, ao sair desse estado, limpar só essa mensagem (`limparMensagemSeFor`); botões de microfone, câmera e compartilhar **desligados** ficam `disabled` com a aparência "indisponível" da T09 fora de `conectada`, os **ligados** continuam clicáveis para desligar — contracts/ui.md; lista, recados, link, qualidade e "Ativar som" sem mudança
- [X] T035 [US3] Rodar `npm test`; fazer o quickstart passo 6 com o LiveKit de desenvolvimento (`docker stop`/`docker start` do container) e registrar os tempos medidos em Notes

**Checkpoint**: queda do servidor de mídia tratada; sala continua; volta como estava.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: implantação com HTTPS e TURN na 443 (FR-010, FR-011), documentação e validação final

- [X] T036 [P] Criar `livekit.yaml` na raiz conforme a tabela de contracts/livekit.md ("Configuração do LiveKit"), com chaves vindas do ambiente; **conferir cada chave na documentação atual do LiveKit** (`rtc.udp_port` porta única, `turn.external_tls`, `webhook.api_key`, `room.max_participants`) e corrigir o que tiver mudado, registrando em research §10
- [X] T037 [P] Criar `Caddyfile` na raiz: HTTPS automático para `{$DOMINIO}`; `/rtc*` → `livekit:7880`; resto → `app:3000` (com `X-Forwarded-Proto`); camada 4 na 443 roteando SNI `turn.{$DOMINIO}` → `livekit:5349`; **conferir a sintaxe atual do módulo de camada 4 / imagem `livekit/caddyl4`** e registrar em research §10
- [X] T038 Criar `docker-compose.yml` na raiz com `caddy` (portas 80 e 443), `livekit` (`livekit/livekit-server` com versão fixada, portas 7881/tcp e 7882/udp, `livekit.yaml` montado) e `app` (imagem `ghcr.io/sergio0203/share-screen-sdd:latest`, `LIVEKIT_URL=wss://${DOMINIO}`, `LIVEKIT_API_URL=http://livekit:7880`, chave e segredo do `.env`); validar com `docker compose config`
- [X] T039 [P] Atualizar `README.md`: o que mudou (mídia passa por um servidor), "Como rodar" com o comando do LiveKit de desenvolvimento, nova seção "Implantação" (DNS do domínio e de `turn.`, portas 80/443/7881/7882, `.env`, `docker compose up -d`, banda ≈ 60 Mbit/s por sala cheia)
- [X] T040 [P] Atualizar comentários que descrevem a malha em `public/js/midia.js`, `public/js/app.js`, `src/salas.js` e `src/servidor.js` (citações a "conexão direta", `sinal`, "quem compartilha só envia a tela para…") para apontar a specs/010-midia-por-servidor/research.md
- [ ] T041 Implantar num servidor com domínio e fazer o quickstart completo: passos 1–7 e "Implantação", inclusive SC-004 (6 pessoas, 10 min) e SC-008 (rede só-HTTPS); registrar resultados e desvios em Notes
- [X] T042 Revisão final: `npm test`, `npm run format:check`; `grep -rn "sinal\|RTCPeerConnection\|compararPares" public src tests` sem restos da malha; checar a constituição (textos em pt-BR, nenhuma mensagem com código do LiveKit)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: sem dependências.
- **Foundational (2)**: depende do Setup (T004 para a configuração). Bloqueia todas as histórias.
- **US1 (3)**: depende da Foundational. É o MVP.
- **US2 (4)**: depende da Foundational; testável sem US1 (testes de integração com LiveKit falso),
  mas a conferência manual (T028) precisa de US1.
- **US3 (5)**: depende de US1 (`midia.js` sobre LiveKit).
- **Polish (6)**: T036–T040 podem começar após a Foundational; T041–T042 depois de todas as histórias.

### Within Each User Story

- Testes primeiro, falhando; depois funções puras; depois `midia.js`/servidor; depois `app.js`;
  por fim a conferência manual.
- `public/js/midia.js` é tocado em T017 e T033; `src/servidor.js` em T003, T010, T019, T027;
  `public/js/app.js` em T018 e T034 — sempre em sequência.

### Parallel Opportunities

- Setup: T002, T004, T005 juntos (T003 depois de T002).
- Foundational: T006 e T009 juntos; T007 depois de T006; T010 depois de T007–T009.
- US1: T011–T014 juntos; T015 e T016 juntos; depois T017 → T018 → T019.
- US2: T021 e T022 juntos; T024 e T025 juntos; depois T026 → T027.
- US3: T029 e T030 juntos; T031 e T032 juntos; depois T033 → T034.
- Polish: T036, T037, T039, T040 juntos.

---

## Parallel Example: User Story 1

```text
Juntos:  T011 midia-estado.test.js | T012 midia.test.js | T013 midia-regras.test.js | T014 websocket.test.js
Juntos:  T015 midia-estado.js      | T016 midia-regras.js
Depois:  T017 midia.js → T018 app.js → T019 servidor.js/salas.js → T020 conferência
```

## Parallel Example: User Story 2

```text
Juntos:  T021 salas.test.js | T022 permissao-midia.test.js
Depois:  T023 midia-acesso.test.js
Juntos:  T024 salas.js | T025 permissao-midia.js
Depois:  T026 livekit.js → T027 servidor.js → T028 conferência
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 + Phase 2 (permissão entregue pelo WebSocket).
2. Phase 3: mídia pelo servidor de mídia em desenvolvimento local.
3. **Parar e validar**: quickstart passos 1, 2 e 4 — uma transmissão por mídia.

### Incremental Delivery

1. MVP (US1) → mídia passa pelo servidor.
2. US2 → acesso só para quem está na sala (necessário antes de implantar publicamente).
3. US3 → queda do servidor de mídia tratada.
4. Polish → implantação com HTTPS e TURN na 443; validação completa (SC-004, SC-008).

**Não implantar publicamente antes de US2**: sem ela, quem já saiu poderia continuar recebendo mídia.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- Resultados das conferências manuais (T020, T028, T035, T041) entram aqui.

### T020 (2026-11-17): LiveKit 1.13.11 `--dev` em Docker, app local, 3 Chrome 157 sem interface

Tela simulada por um canvas 1920×1080 a 30 fps; microfone e câmera falsos do Chrome.

| Medida | Resultado |
|--------|-----------|
| Saídas de Ana (mic + câmera + tela), sala com 2 pessoas | 1 áudio, 2 vídeos |
| Saídas de Ana, sala com 3 pessoas | 1 áudio, 2 vídeos (iguais) — SC-001/SC-002 |
| Bruno recebe | voz, câmera e tela de Ana; tela 1920×1080 no destaque |
| Carla (3ª) recebe | voz e câmera de Ana, câmera de Bruno, tela de Ana |
| Ana e Bruno compartilhando, Carla assistindo | Carla recebe **1** vídeo de tela (T05 FR-019) |
| Carla troca o destaque pela miniatura | imagem da outra tela em < 2 s, ainda 1 vídeo de tela |
| Erros de JavaScript | nenhum |

- Desvios: `midia.js` não importa `livekit-client.js`; a sala é criada por `criarSala` (app.js faz
  `new Room(opcoes)`), para os testes de unidade rodarem sem a biblioteca. O som continua tocando nos
  nossos próprios `<audio>` (sem `room.startAudio()`), então o aviso "Ativar som" segue a regra da
  T03. A tela é limitada por `screenShareEncoding` (é a opção que o livekit-client usa para
  `screen_share`; `videoEncoding` é ignorado nessa fonte) e também por `parametrosDeEnvio` no envio.
- `tests/integration/auxiliares.js` ganhou `conectarCliente` (antes dentro de websocket.test.js),
  usado também por `midia-acesso.test.js`.

### T028 (2026-11-17): LiveKit 1.13.11 com webhook para o app (`livekit.yaml` de desenvolvimento)

| Medida | Resultado |
|--------|-----------|
| Bruno fecha a aba → sai do servidor de mídia (`ListParticipants`) | 109 ms (FR-006: ≤ 3 s) |
| Ana deixa de ver a câmera de Bruno | junto com a saída |
| Permissão de quem já saiu usada em outro navegador (dentro dos 30 s) | conexão cancelada pelo servidor ("room connection has been cancelled"); nenhuma mídia recebida |
| Webhooks recebidos pelo app | todos com 200 (eventos sem ação são aceitos e ignorados) |

- Desvio: a sala só expira vazia (T01), então não há "saída por expiração" a avisar; `aoSair` cobre
  `sair` e a substituição por outra aba.
- `removerDaMidia` não faz nada sem `urlApi` (servidor de testes); `subirServidor` dos testes usa
  essa configuração por padrão, para nenhum teste depender de um LiveKit rodando.

### T035 (2026-11-17): `docker stop`/`docker start` do LiveKit com 3 pessoas

Ana com microfone e tela, Bruno com câmera, Carla assistindo.

| Medida | Resultado |
|--------|-----------|
| Mensagem `midiaIndisponivel` após `docker stop` | 2,8–3,1 s nas 3 janelas (FR-007: ≤ 10 s) |
| Botões na queda | desligados ficam indisponíveis; ligados (microfone e tela de Ana, câmera de Bruno) continuam clicáveis |
| Lista de participantes na queda | normal |
| Bruno desliga a câmera na queda | desliga; continua desligada na volta |
| Mensagem some após `docker start` | 2,5–2,9 s (FR-008: ≤ 10 s) |
| Carla volta a ver a tela de Ana | logo em seguida, 1920×1080, sem Ana escolher a tela de novo (1 captura só) |
| Saídas de Ana na volta | 1 áudio (microfone) + 1 vídeo (tela) |
| Entrar com o servidor de mídia já fora do ar | mensagem em 0,1 s, lista normal; some 1,7 s depois de o servidor voltar |
| Mensagem durante 10 s de queda | visível em 50 de 50 amostras (não pisca entre tentativas) |

- Corrigido durante a conferência: (1) `sala.disconnect()` do LiveKit para as trilhas locais por
  padrão — ao desistir da tentativa do LiveKit, `midia.js` usa `disconnect(false)` (teste novo em
  `midia.test.js`; a sala falsa agora imita esse padrão); (2) a mensagem sumia por um instante a
  cada tentativa (estado `conectando`) — agora só some em `conectada`.
- `signalReconnecting` do LiveKit também conta como "reconectando" (é o primeiro evento numa queda).

### T036–T042 (2026-11-17)

- T036/T037: chaves do LiveKit e sintaxe do Caddy conferidas contra as imagens reais (research §10,
  "Conferido na implementação"). Desvio: domínio do TURN e chaves vão por variáveis de ambiente do
  compose, não escritos no `livekit.yaml`.
- T038: `docker compose config` resolve tudo a partir do `.env` (testado com `.env.exemplo`).
- T040: além dos comentários, `aoFalharPar` → `aoFalharRecepcao` e `paresSemConexao` →
  `pessoasSemMidia` (não há mais "pares").
- T042: 318 testes passando, formatação ok, nenhum resto da malha (`sinal`, `RTCPeerConnection`,
  `compararPares`) em `src/`, `public/` e `tests/` além do teste que confirma que `sinal` foi
  removido.
- **T041 (Parcial / pendente)**: implantar num servidor com domínio público e rodar o quickstart
  completo — SC-004 (6 pessoas reais por 10 min, internet doméstica), SC-007 (upload com 2 vs 6) e
  SC-008 (rede só-HTTPS, candidato `relay`/`tls`). Exige DNS, portas e uma máquina; não foi feito
  nesta sessão.
