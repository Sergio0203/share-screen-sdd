# Research: T03 · Conversar por voz

Parte da base da T01/T02 ([../002-entrar-sala-link/research.md](../002-entrar-sala-link/research.md)):
Node.js 22, `node:http` + `ws`, salas em memória, front-end em JS puro (módulos ES), `node:test`.
**Nenhuma dependência npm nova.**

## 1. Como a voz vai de uma pessoa para as outras

- **Decision**: WebRTC nativo do navegador (`RTCPeerConnection`), em **malha**: cada par de pessoas
  na sala tem uma conexão direta só de áudio. Com no máximo 6 pessoas, cada navegador mantém até 5
  conexões.
- **Rationale**: é a única forma de transmitir voz em tempo real pelo navegador sem instalar nada
  (Restrições do Projeto) e sem servidor de mídia. A clarificação da spec decidiu que a voz vai
  direto entre as pessoas (FR-014); malha é a topologia mais simples para isso. Áudio de 5 pares
  (~30–50 kbit/s cada, Opus) cabe com folga numa internet doméstica (SC-006).
- **Alternatives considered**: servidor de mídia (SFU) — contraria a clarificação e o Princípio I;
  biblioteca de WebRTC (ex.: simple-peer, PeerJS) — a API nativa basta para áudio e evita
  dependência; transmitir áudio pelo WebSocket — atraso e carga no servidor inaceitáveis (FR-004).

## 2. Descoberta de endereço (NAT) sem servidor intermediário

- **Decision**: usar apenas um servidor **STUN público** (`stun:stun.l.google.com:19302`), numa
  constante em `public/js/voz.js`. Sem TURN.
- **Rationale**: sem STUN, a conexão direta só funcionaria na mesma rede local. O STUN só informa a
  cada navegador o próprio endereço público; o áudio não passa por ele, o que respeita a
  clarificação. É gratuito e não exige nada no nosso servidor. Quando a conexão direta falha (redes
  restritivas), a pessoa vê a mensagem de FR-014 — limitação aceita na spec.
- **Alternatives considered**: TURN (rejeitado na clarificação); STUN próprio (mais uma peça para
  manter, sem ganho para o público); nenhum STUN (só funcionaria em rede local).

## 3. Sinalização (troca de ofertas/respostas/candidatos)

- **Decision**: reaproveitar o WebSocket da sala. Nova mensagem `sinal` com `para` (id público do
  destinatário) e `dados` (conteúdo opaco: descrição SDP ou candidato ICE). O servidor só repassa
  para o participante da **mesma sala**, acrescentando `de` (id público do remetente); nunca
  interpreta `dados`. Limite de 64 KiB por mensagem no WebSocket.
- **Rationale**: já existe uma conexão autenticada pela sala; nenhuma peça nova (Princípio I). O
  servidor preenche `de` para que ninguém finja ser outra pessoa.
- **Alternatives considered**: HTTP com polling (mais lento e mais código); serviço externo de
  sinalização (dependência desnecessária).

## 4. Quem inicia cada conexão e como evitar renegociação

- **Decision**:
  - Em cada par, quem tem o **id público menor** (comparação de texto) cria a oferta; o outro só
    responde. Ao receber a lista de participantes, cada navegador cria conexões para os ids novos
    em que é o iniciador e fecha as conexões de ids que sumiram. Uma oferta de id desconhecido cria
    a conexão do lado que responde.
  - O iniciador cria a conexão já com um transceptor de áudio `sendrecv` (`addTransceiver("audio")`).
    Ligar/desligar o microfone é só `replaceTrack(trilha)` / `replaceTrack(null)` no transceptor de
    cada conexão — **sem renegociar**.
  - As mensagens de sinal de cada par são processadas em fila (uma de cada vez), para que um
    candidato nunca seja aplicado antes da descrição remota.
- **Rationale**: regra determinística elimina colisão de ofertas sem o padrão "perfect negotiation"
  completo; sem renegociação, só existe uma troca oferta/resposta por par durante toda a vida da
  conexão. Mantém a lógica pequena e testável (a regra de quem inicia e a diferença de listas ficam
  num módulo puro).
- **Alternatives considered**: "perfect negotiation" (polite/impolite) — necessário só com
  renegociação, que evitamos; quem entra sempre inicia — exige rastrear quem é novo e falha em
  entradas simultâneas.

## 5. Recarregar a página e conexões de voz antigas

- **Decision**: quando uma conexão substitui outra com a mesma chave (recarregar, outra aba — T02),
  o participante recebe um **id público novo** e o microfone volta a desligado. Os outros veem o id
  antigo sumir e o novo aparecer, fecham a conexão de voz antiga e criam uma nova.
- **Rationale**: a página recarregada não tem mais as conexões WebRTC antigas; trocar o id faz os
  demais recriarem a conexão sem nenhuma mensagem extra. Também garante FR-001 (entrar sempre com o
  microfone desligado). Visualmente a lista não muda (mesmo nome, mesma posição).
- **Alternatives considered**: manter o id e detectar a conexão morta pelo estado ICE (lento, até
  ~30 s, e mais código); mensagem explícita "reiniciar voz" (mais protocolo).
- **Mudança na T02**: os testes que verificam que a substituição mantém o mesmo `id`
  (`tests/unit/salas.test.js`, `tests/integration/websocket.test.js`) passam a verificar que o id
  muda e a pessoa continua na mesma posição, com o mesmo nome e o mesmo papel.

## 6. Captura do microfone e erros

- **Decision**: `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true,
  autoGainControl: true } })` só no clique em "Ligar microfone" (FR-002). Ao desligar, a trilha é
  removida das conexões (`replaceTrack(null)`) **e parada** (`track.stop()`), liberando o
  microfone. Ao ligar de novo, nova captura (sem pergunta se a permissão já foi dada). Enquanto a
  captura está pendente, o botão fica desabilitado ("Ligando microfone…").
  Classificação dos erros (módulo puro):

  | Erro do navegador                              | Mensagem (contracts/ui.md) |
  |------------------------------------------------|----------------------------|
  | `NotAllowedError`, `SecurityError`             | permissão negada (US3)     |
  | `NotFoundError`, `OverconstrainedError`        | sem microfone              |
  | qualquer outro (`NotReadableError`, `AbortError`…) | falha ao ligar         |
  | trilha termina sozinha (`ended`)               | microfone desconectado     |

- **Rationale**: parar a trilha garante FR-005 de forma local e imediata, apaga o indicador de
  microfone do navegador e dá privacidade. Supressão de eco padrão do navegador (Assumptions).
- **Alternatives considered**: manter a trilha e só `enabled = false` (mais rápido para religar, mas
  o navegador continua mostrando o microfone em uso); pedir permissão ao entrar (contraria FR-002).

## 7. Estado do microfone visível para todos

- **Decision**: mensagem `microfone` `{ ligado }` do cliente para o servidor; o servidor guarda em
  `participante.microfoneLigado` e reenvia a lista `participantes` (agora com `microfone`) para
  todos. O cliente só envia `ligado: true` depois que a captura deu certo, e envia `false` em
  qualquer falha ou desconexão do microfone.
- **Rationale**: reaproveita a lista completa enviada a cada mudança (T02), que já chega em ≤ 3 s
  (FR-009) e já entrega o estado correto a quem entra (US2 cenário 3).
- **Alternatives considered**: inferir o estado pelo áudio recebido via WebRTC (não funciona para
  quem não tem conexão direta e não é visível para quem falhou); mensagem separada só de microfone
  (duas fontes de verdade para a lista).

## 8. Tocar a voz dos outros (bloqueio de reprodução automática)

- **Decision**: um elemento `<audio autoplay>` oculto por pessoa remota. Se `play()` for rejeitado
  (`NotAllowedError`), mostrar o botão "Ativar som"; ao clicar, chamar `play()` em todos e esconder
  o botão (FR-013).
- **Rationale**: o caso típico é recarregar e voltar direto para a sala (T02 FR-007) sem nenhum
  clique; o botão resolve com uma interação, que é o que o navegador exige.
- **Alternatives considered**: Web Audio API para mixar (mais código, mesma restrição de interação).

## 9. Falha de conexão de voz com alguém (FR-014)

- **Decision**: quando `connectionState` de um par vira `failed`, marcar o par como sem voz. Se essa
  pessoa está (ou ficar) com o microfone ligado, mostrar "Não foi possível ouvir <nome>. Verifique
  sua conexão." na área de mensagens. A mensagem some quando o microfone dela desliga ou ela sai.
  Não há nova tentativa automática nesta versão (recarregar refaz as conexões).
- **Rationale**: atende "falhas não silenciosas" (Princípio IV) com o mínimo de lógica; reconexão
  automática (ICE restart) fica para quando o problema aparecer na prática (Princípio I).
- **Alternatives considered**: ICE restart automático; mensagem para os dois lados mesmo sem
  microfone ligado (alarme sem consequência para quem ouve).

## 10. Contexto seguro (HTTPS)

- **Decision**: nada novo no código; registrar que o microfone só funciona em contexto seguro
  (`https://` ou `http://localhost`). Testes manuais locais usam `localhost` com perfis diferentes
  do navegador; testes entre computadores diferentes exigem a aplicação servida por HTTPS.
- **Rationale**: é uma restrição do navegador, igual à cópia automática do link da T01.

## 11. Testes

- **Decision**:
  - Unitários: `voz-regras.js` (quem inicia, diferença entre conexões e lista, classificação de
    erros), `participantes.js` (indicador de microfone), `salas.js` (estado do microfone, troca de
    id na substituição, busca por id público).
  - Integração (servidor real): `microfone` atualiza a lista de todos; `sinal` chega só ao
    destinatário certo com `de` preenchido; `sinal` para id de outra sala ou inexistente é
    ignorado; `sinal`/`microfone` antes de `entrar` ou malformados → `mensagem-invalida`;
    substituição zera o microfone.
  - Manual: captura, áudio entre navegadores, permissão negada, "Ativar som" ([quickstart.md](quickstart.md)).
- **Rationale**: a lógica principal (sinalização, estado do microfone, regras de conexão) fica
  coberta automaticamente (Princípio III); WebRTC e `getUserMedia` reais dependem do navegador e
  de hardware, então ficam no roteiro manual.
- **Alternatives considered**: testes de navegador automatizados (Playwright com mídia falsa) —
  dependência pesada para um projeto deste tamanho (Princípio I).
