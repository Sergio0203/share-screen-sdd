# Contrato WebSocket (versão T05)

Estende [../../004-ativar-webcam/contracts/websocket.md](../../004-ativar-webcam/contracts/websocket.md).
Tudo da T04 continua valendo, com as mudanças abaixo.

## Mudanças em mensagens existentes

### `participantes`: novos campos `tela` e `assistindo`

```json
{
  "tipo": "participantes",
  "lista": [
    { "id": "pX2…", "nome": "Ana", "anfitriao": true, "microfone": true, "camera": false,
      "tela": { "inicio": 3, "som": true }, "assistindo": null },
    { "id": "r7Q…", "nome": "Bruno", "anfitriao": false, "microfone": true, "camera": true,
      "tela": null, "assistindo": "pX2…" }
  ]
}
```

- `tela`: `null` ou `{ inicio, som }`; `inicio` cresce a cada compartilhamento iniciado na sala.
- `assistindo`: id público do compartilhamento que a pessoa tem em destaque, ou `null`.
- Substituição de conexão → `tela: null`, `assistindo: null`.

### `sinal`

Sem mudança no formato. A oferta de cada par passa a conter quatro canais, nesta ordem: áudio
(microfone), vídeo (câmera), vídeo (tela), áudio (tela).

## Cliente → servidor (novas, só depois de `entrou`)

### `tela`

```json
{ "tipo": "tela", "compartilhando": true, "som": false }
{ "tipo": "tela", "compartilhando": false }
```

- `compartilhando` booleano obrigatório; `som` booleano obrigatório quando `compartilhando` é
  `true` (ignorado quando `false`).

### `assistindo`

```json
{ "tipo": "assistindo", "id": "pX2…" }
{ "tipo": "assistindo", "id": null }
```

- `id`: texto ou `null`. Não precisa existir na sala (pode ter acabado de sair).

## Erros

| `codigo`            | Novo caso                                                                    |
|---------------------|------------------------------------------------------------------------------|
| `mensagem-invalida` | `tela`/`assistindo` antes de `entrar`; `compartilhando` não booleano; `som` não booleano com `compartilhando: true`; `id` que não é texto nem `null` |
