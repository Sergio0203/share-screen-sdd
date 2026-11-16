# Contrato HTTP

## `POST /api/salas`

Cria uma sala nova (FR-002). Sem corpo, sem autenticação.

**201 Created**

```json
{
  "id": "Zk3q9V0bX1yPq2mN8tLw4A",
  "link": "https://exemplo.com/sala/Zk3q9V0bX1yPq2mN8tLw4A",
  "tokenAnfitriao": "q8Lr0dPz3kHn5WcY2bVt1g"
}
```

- `link` usa a origem da requisição (cabeçalho `Host` e protocolo).
- `tokenAnfitriao` só aparece nesta resposta; nenhuma outra rota o devolve.

**Erros**

| Status | Corpo                                                                  |
|--------|------------------------------------------------------------------------|
| 405    | `{ "erro": "Método não permitido." }` (qualquer método diferente de POST) |
| 500    | `{ "erro": "Não foi possível criar a sala. Tente novamente." }`         |

O front-end nunca exibe o corpo cru; usa as mensagens de [ui.md](ui.md).

## `GET /` e `GET /sala/<id>`

Devolvem o mesmo `index.html` (SPA). O front-end decide a tela pelo caminho. `GET /sala/<id>`
responde 200 mesmo se a sala não existir; a existência é verificada pelo WebSocket.

## `GET /<arquivo estático>`

Serve arquivos de `public/` (JS, CSS). Caminhos fora de `public/` → 404.
