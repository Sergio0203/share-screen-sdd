# Contrato WebSocket (versão T03)

Estende [../../002-entrar-sala-link/contracts/websocket.md](../../002-entrar-sala-link/contracts/websocket.md).
Tudo da T02 continua valendo, com as mudanças abaixo. Mensagens maiores que **64 KiB** fecham a
conexão.

## Mudanças em mensagens da T02

### `participantes`: novo campo `microfone`

```json
{
  "tipo": "participantes",
  "lista": [
    { "id": "pX2…", "nome": "Ana", "anfitriao": true, "microfone": true },
    { "id": "r7Q…", "nome": "Bruno", "anfitriao": false, "microfone": false }
  ]
}
```

Também enviada a todos quando o microfone de alguém muda.

### Substituição de conexão (mesma chave)

A conexão nova recebe `entrou` com um **`voce` diferente** do anterior, e a lista mostra a pessoa
com o id novo e `microfone: false`.

## Cliente → servidor (novas, só depois de `entrou`)

### `microfone`

```json
{ "tipo": "microfone", "ligado": true }
```

- `ligado` booleano obrigatório. Atualiza o próprio participante; se mudou, a lista vai para todos.

### `sinal`

```json
{ "tipo": "sinal", "para": "r7Q…", "dados": { "descricao": { "type": "offer", "sdp": "…" } } }
```

- `para`: id público de outro participante da **mesma** sala.
- `dados`: objeto opaco (o servidor não lê). Por convenção do cliente: `{ "descricao": … }` ou
  `{ "candidato": … }`.
- `para` inexistente na sala (ex.: a pessoa acabou de sair) → **ignorado**, sem erro.

## Servidor → cliente (nova)

### `sinal`

```json
{ "tipo": "sinal", "de": "pX2…", "dados": { "candidato": { "candidate": "…", "sdpMid": "0" } } }
```

- `de` é sempre preenchido pelo servidor com o id público do remetente.

## Erros

| `codigo`            | Novo caso                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------|
| `mensagem-invalida` | `microfone`/`sinal` antes de `entrar`; `ligado` não booleano; `para` não texto; `dados` não objeto |

Os demais códigos da T02 não mudam.
