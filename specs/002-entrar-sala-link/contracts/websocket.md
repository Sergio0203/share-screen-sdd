# Contrato WebSocket (versão T02)

Substitui [../../001-criar-sala/contracts/websocket.md](../../001-criar-sala/contracts/websocket.md).
**Endpoint**: `/ws`. Mensagens JSON com campo `tipo`. Regras de entrada em
[../data-model.md](../data-model.md).

## Cliente → servidor

### `entrar`

```json
{ "tipo": "entrar", "idSala": "Zk3q9V0bX1yPq2mN8tLw4A", "nome": "Ana", "chave": "q8Lr0dPz3kHn5WcY2bVt1g" }
```

- `nome` obrigatório; normalizado pelo servidor (sem espaços nas pontas, 1–30 caracteres).
- `chave` opcional: a guardada em `localStorage["sala:<idSala>"]` (ou recebida no `POST`).

## Servidor → cliente

### `entrou` (só para quem entrou)

```json
{ "tipo": "entrou", "idSala": "Zk3q9V0bX1yPq2mN8tLw4A", "chave": "q8Lr0dPz3kHn5WcY2bVt1g", "voce": "pX2…" }
```

- `chave`: o cliente guarda em `localStorage["sala:<idSala>"]`.
- `voce`: id público do próprio participante, para marcar "(você)" na lista.

### `participantes` (para todos da sala, a cada mudança)

```json
{
  "tipo": "participantes",
  "lista": [
    { "id": "pX2…", "nome": "Ana", "anfitriao": true },
    { "id": "r7Q…", "nome": "Bruno", "anfitriao": false }
  ]
}
```

- Ordem de entrada. Enviada logo após `entrou`, e a todos quando alguém entra, sai ou o anfitrião
  muda. Nunca contém chaves.

### `erro`

| `codigo`              | Quando                                                    | Depois          |
|-----------------------|-----------------------------------------------------------|-----------------|
| `sala-inexistente`    | id inválido, inexistente ou expirada                      | fecha a conexão |
| `sala-cheia`          | 6 participantes e a chave enviada não é de nenhum deles   | fecha a conexão |
| `nome-invalido`       | nome vazio ou com mais de 30 caracteres após normalizar   | fecha a conexão |
| `aberta-em-outra-aba` | outra conexão entrou com a mesma chave                    | fecha a conexão |
| `mensagem-invalida`   | JSON inválido, `tipo` desconhecido ou `entrar` repetido   | fecha a conexão |

## Presença

- Fechar a conexão = sair da sala.
- O servidor envia *ping* do protocolo a cada 1 s e encerra conexões sem resposta ao *ping*
  anterior (saída detectada em ≤ ~2 s; FR-006).
