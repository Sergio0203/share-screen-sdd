# Contrato com o servidor de mídia (LiveKit)

O app não fala com o LiveKit pela sala: o navegador fala direto com ele usando `livekit-client`, e o
servidor do app só emite permissões, expulsa e recebe avisos. Decisões em
[../research.md](../research.md) §1–§7.

## Navegador → LiveKit

| Item | Valor |
|------|-------|
| Endereço | `url` da mensagem `midia` |
| Sala | id da sala do app (vem no token) |
| Identidade | id público do participante (vem no token) = `id` da lista `participantes` |
| Opções da sala | `autoSubscribe: false`, `adaptiveStream: false`, `dynacast: true` |
| Tempos | `websocketTimeout` e `peerConnectionTimeout`: 5000 ms |
| Publicações | no máximo uma por fonte: `microphone`, `camera`, `screen_share`, `screen_share_audio`; todas com `simulcast: false` |
| Assinaturas | `microphone` e `camera` de todos; `screen_share` e `screen_share_audio` só de quem está em `assistindo` |

## App → LiveKit (API de administração)

```http
POST {LIVEKIT_API_URL}/twirp/livekit.RoomService/RemoveParticipant
Authorization: Bearer <token de administração da sala>
Content-Type: application/json

{ "room": "<idSala>", "identity": "<idPublico>" }
```

- Chamada quando o registro avisa `aoSair` e quando um webhook traz uma identidade fora da sala.
- Resposta `404`/`not_found` (a pessoa não estava conectada à mídia) é normal e ignorada; outros
  erros só são registrados no log (`console.error`), sem afetar a sala.

## LiveKit → app (webhook)

```http
POST /api/livekit/eventos
Authorization: <JWT HS256 assinado com LIVEKIT_API_SECRET, iss = LIVEKIT_API_KEY, claim sha256 = base64(sha256(corpo))>
Content-Type: application/webhook+json

{ "event": "participant_joined", "room": { "name": "<idSala>" }, "participant": { "identity": "<idPublico>" }, … }
```

| Situação | Resposta do app |
|----------|-----------------|
| Assinatura ou `sha256` inválidos, `iss` diferente, expirado | `401`, nada feito |
| Corpo maior que 64 KiB ou JSON inválido | `400` |
| `participant_joined` com identidade que não está na sala do app | `200` e `RemoveParticipant` |
| Qualquer outro evento ou identidade válida | `200`, nada feito |

## Configuração do LiveKit (`livekit.yaml`, resumo)

| Chave | Valor |
|-------|-------|
| `port` | 7880 (sinalização e API, só na rede interna do compose; o Caddy expõe `/rtc*`) |
| `rtc.tcp_port` / `rtc.udp_port` | 7881 / 7882 |
| `rtc.use_external_ip` | `true` |
| `turn.enabled`, `turn.domain`, `turn.tls_port`, `turn.external_tls` | `true`, `turn.<domínio>`, 5349, `true` |
| `room.max_participants` | 6 |
| `room.empty_timeout` | 60 s |
| `webhook.urls` | `["http://app:3000/api/livekit/eventos"]` |
| `keys`, `turn.domain`, `webhook.api_key` | pelo ambiente: `LIVEKIT_KEYS`, `LIVEKIT_TURN_DOMAIN`, `LIVEKIT_WEBHOOK_API_KEY` (docker-compose.yml + `.env`) |
