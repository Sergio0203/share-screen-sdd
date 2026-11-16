# Contrato HTTP (versão T02)

Substitui [../../001-criar-sala/contracts/http.md](../../001-criar-sala/contracts/http.md). Mudanças
marcadas com **(T02)**.

## `POST /api/salas`

Cria uma sala. Sem corpo. O nome do criador é enviado depois, no `entrar` do WebSocket.

**201 Created**

```json
{
  "id": "Zk3q9V0bX1yPq2mN8tLw4A",
  "link": "https://exemplo.com/sala/Zk3q9V0bX1yPq2mN8tLw4A",
  "chave": "q8Lr0dPz3kHn5WcY2bVt1g"
}
```

- **(T02)** `chave` substitui `tokenAnfitriao`: é a chave de participante do criador, que nasce
  como `chaveAnfitriao` da sala.

Erros: 405 `{ "erro": "Método não permitido." }`; 500
`{ "erro": "Não foi possível criar a sala. Tente novamente." }`.

## `GET /api/salas/<id>` **(T02)**

Consulta se a sala existe e se tem vaga, antes de mostrar a tela de nome.

| Status | Corpo                                    | Quando                               |
|--------|------------------------------------------|--------------------------------------|
| 200    | `{ "cheia": false }`                     | sala existe e tem menos de 6 pessoas |
| 200    | `{ "cheia": true }`                      | sala existe e tem 6 pessoas          |
| 404    | `{ "erro": "Sala não encontrada." }`     | id inválido, inexistente ou expirada |

Não revela nomes nem número de participantes. Outros métodos → 405.

## `GET /`, `GET /sala/<id>`, arquivos estáticos

Sem mudanças em relação à T01.
