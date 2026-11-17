# Contrato WebSocket (versão T04)

Estende [../../003-conversar-por-voz/contracts/websocket.md](../../003-conversar-por-voz/contracts/websocket.md).
Tudo da T03 continua valendo, com as mudanças abaixo.

## Mudanças em mensagens existentes

### `participantes`: novo campo `camera`

```json
{
  "tipo": "participantes",
  "lista": [
    { "id": "pX2…", "nome": "Ana", "anfitriao": true, "microfone": false, "camera": true },
    { "id": "r7Q…", "nome": "Bruno", "anfitriao": false, "microfone": true, "camera": false }
  ]
}
```

Também enviada a todos quando a câmera de alguém muda. Substituição de conexão → `camera: false`.

### `sinal`

Sem mudança no formato. A oferta de cada par passa a conter um canal de áudio **e** um de vídeo
(o servidor não lê `dados`).

## Cliente → servidor (nova, só depois de `entrou`)

### `camera`

```json
{ "tipo": "camera", "ligada": true }
```

- `ligada` booleano obrigatório. Atualiza o próprio participante; se mudou, a lista vai para todos.

## Erros

| `codigo`            | Novo caso                                              |
|---------------------|--------------------------------------------------------|
| `mensagem-invalida` | `camera` antes de `entrar`; `ligada` não booleano       |
