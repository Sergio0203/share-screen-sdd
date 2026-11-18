# Data Model: T10 · Mídia passando por um servidor

Nada é guardado em disco. O registro de salas (T02–T08) não muda de forma; ganha só um aviso de
saída. Decisões em [research.md](research.md).

## Permissão de mídia (servidor do app → navegador)

Token JWT HS256 assinado com `LIVEKIT_API_SECRET` (research §3).

| Campo | Valor | Regra |
|-------|-------|-------|
| `iss` | `LIVEKIT_API_KEY` | obrigatório |
| `sub` | id público do participante (22 caracteres base64url) | identidade na sala de mídia; muda ao recarregar/outra aba |
| `name` | nome normalizado do participante | só exibição |
| `nbf` / `exp` | agora / agora + **30 s** | só serve para conectar |
| `video.room` | id da sala do app | o token não vale para outra sala |
| `video.roomJoin`, `canPublish`, `canSubscribe` | `true` | |
| `video.canPublishData` | `false` | recados continuam pelo WebSocket do app |
| `video.canPublishSources` | `["microphone","camera","screen_share","screen_share_audio"]` | |

**Emissão**: só para uma conexão que já recebeu `entrou` (ver [contracts/websocket.md](contracts/websocket.md));
uma nova a cada `pedir-midia`. **Revogação**: ao sair → `RemoveParticipant`; ao entrar no LiveKit com
identidade fora do registro → `RemoveParticipant` (research §4).

Token de administração (só app → LiveKit): mesmo formato, `sub` = `"telao-app"`, `video: { room,
roomAdmin: true }`, validade 30 s.

## Registro de salas (alteração)

- Nova opção `aoSair(idSala, idPublico)` chamada quando um participante deixa de estar na sala:
  `sair`, substituição por outra aba (o id público antigo some) e expiração da sala (para cada um
  que ainda estivesse). Usada pelo servidor para chamar `RemoveParticipant`.
- Nova consulta `participanteNaSala(idSala, idPublico) → boolean` (webhook, research §4).
- `conexaoPorId`/`idPorConexao` removidos (só serviam ao `sinal`).

## Conexão de mídia (navegador)

Estado único por página, em `midia.js`.

| Estado | Mensagem | Ligar mic/câmera/tela | Desligar |
|--------|----------|-----------------------|----------|
| `conectando` | — | indisponível | permitido |
| `conectada` | — | permitido | permitido |
| `reconectando` (< 3 s) | — | indisponível | permitido |
| `indisponivel` | `midiaIndisponivel` | indisponível | permitido |
| `encerrada` | — (saiu da sala) | — | — |

Transições (`proximoEstadoMidia(estado, evento)`, pura):

| De | Evento | Para |
|----|--------|------|
| `conectando` | `conectou` | `conectada` |
| `conectando` | `falhou` | `indisponivel` |
| `conectada` | `reconectando` | `reconectando` |
| `reconectando` | `reconectou` | `conectada` |
| `reconectando` | `passaram3s` / `desconectou` | `indisponivel` |
| `conectada` | `desconectou` | `indisponivel` |
| `indisponivel` | `tentar` (a cada 3 s) | `conectando` |
| qualquer | `sair` | `encerrada` |

Ao entrar em `conectada` vindo de `conectando`: publica `trilhasParaPublicar(trilhasLocais)` — as
trilhas capturadas cujo `readyState === "live"` (Q4: volta como estava; o que foi desligado na queda
não volta).

## Trilhas locais (navegador)

| Mídia | Fonte LiveKit | Opções de publicação |
|-------|---------------|----------------------|
| microfone | `microphone` | padrão (Opus, DTX) |
| câmera | `camera` | `simulcast: false`, 640×360, 15 fps |
| tela | `screen_share` | `simulcast: false`, `maxBitrate`/`maxFramerate` da qualidade (T06), `maintain-framerate` |
| som da tela | `screen_share_audio` | padrão |

No máximo uma de cada por pessoa (FR-002).

## Assinaturas (navegador)

`assinaturasDesejadas(publicacoesRemotas, assistindo)` (pura): para cada publicação remota,
`true` se a fonte é `microphone` ou `camera`; se é `screen_share`/`screen_share_audio`, `true`
só quando a identidade de quem publica é `assistindo`. Reaplicada a cada lista `participantes`,
a cada publicação nova e a cada troca de destaque.

## Configuração (variáveis de ambiente do app)

| Variável | Padrão (desenvolvimento) | Uso |
|----------|--------------------------|-----|
| `LIVEKIT_URL` | `ws://localhost:7880` | endereço que o navegador usa (vai na mensagem `midia`) |
| `LIVEKIT_API_URL` | `http://localhost:7880` | app → LiveKit (`RemoveParticipant`) |
| `LIVEKIT_API_KEY` | `devkey` | `iss` e verificação do webhook |
| `LIVEKIT_API_SECRET` | `secret` | assinatura |
