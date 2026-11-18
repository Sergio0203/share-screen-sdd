# Contrato WebSocket (versão T10)

Estende [../../008-recado-segue-cursor/contracts/websocket.md](../../008-recado-segue-cursor/contracts/websocket.md)
e anteriores. Tudo continua valendo, com as mudanças abaixo.

## Removida: `sinal`

A mensagem `sinal` (T03–T05, nos dois sentidos) deixa de existir: a mídia não é mais negociada entre
navegadores. Enviá-la passa a dar `mensagem-invalida`, como qualquer tipo desconhecido.

## Servidor → cliente (nova)

### `midia`

```json
{ "tipo": "midia", "url": "wss://telao.exemplo.com", "token": "eyJhbGciOiJIUzI1NiIs…" }
```

- Enviada logo depois de `entrou` (antes de `participantes`) e em resposta a cada `pedir-midia`.
- `url`: endereço do servidor de mídia (`LIVEKIT_URL`).
- `token`: permissão de mídia, válida por 30 s, só para esta sala e esta pessoa
  ([../data-model.md](../data-model.md#permissão-de-mídia-servidor-do-app--navegador)).
- Uma conexão substituída por outra aba (`aberta-em-outra-aba`) não recebe mais nenhuma.

## Cliente → servidor (nova, só depois de `entrou`)

### `pedir-midia`

```json
{ "tipo": "pedir-midia" }
```

- Pede um token novo (reconectar ao servidor de mídia). Resposta: `midia`.
- Antes de `entrou` → `mensagem-invalida` (fecha a conexão, como as demais).

## Sem mudança

`participantes` (inclusive `tela` e `assistindo`), `microfone`, `camera`, `tela`, `assistindo`,
`recado`, `recados`, `erro`. `assistindo` continua decidindo o destaque; agora quem usa a informação
é o próprio navegador de quem assiste, para assinar só a tela em destaque.
