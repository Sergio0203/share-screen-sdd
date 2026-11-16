# Contrato WebSocket

**Endpoint**: `GET /ws` com upgrade para WebSocket. Mensagens em JSON, campo `tipo` obrigatório.
Uma conexão aberta = uma pessoa presente na sala (FR-014).

## Cliente → servidor

### `entrar`

Primeira mensagem da conexão.

```json
{ "tipo": "entrar", "idSala": "Zk3q9V0bX1yPq2mN8tLw4A", "tokenAnfitriao": "q8Lr0dPz3kHn5WcY2bVt1g" }
```

- `tokenAnfitriao` é opcional; enviado quando existir no `localStorage` (`anfitriao:<idSala>`).

## Servidor → cliente

### `entrou`

```json
{ "tipo": "entrou", "idSala": "Zk3q9V0bX1yPq2mN8tLw4A", "anfitriao": true }
```

- `anfitriao` é `true` somente se o token enviado corresponde ao da sala (FR-015).
- A partir daqui a conexão conta como presença; a expiração da sala, se agendada, é cancelada.

### `erro`

```json
{ "tipo": "erro", "codigo": "sala-inexistente" }
```

| `codigo`            | Quando                                                       | Ação do servidor   |
|---------------------|--------------------------------------------------------------|--------------------|
| `sala-inexistente`  | id inválido, nunca criado ou sala expirada                   | fecha a conexão    |
| `mensagem-invalida` | JSON inválido, `tipo` desconhecido ou `entrar` repetido      | fecha a conexão    |

O texto exibido para cada código está em [ui.md](ui.md).

## Saída

Fechar a conexão (fechar a aba, recarregar, perder a rede) = sair da sala. Quando a última conexão
fecha, a sala entra em tolerância de 60 s ([data-model.md](../data-model.md)).
