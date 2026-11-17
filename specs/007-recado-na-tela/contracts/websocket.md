# Contrato WebSocket (versão T07)

Estende [../../005-compartilhar-tela/contracts/websocket.md](../../005-compartilhar-tela/contracts/websocket.md).
Tudo da T05 continua valendo, com os acréscimos abaixo. Modelo em [../data-model.md](../data-model.md).

## Cliente → servidor (nova, só depois de `entrou`)

### `recado`

```json
{ "tipo": "recado", "acao": "escrever", "alvo": "pX2…", "x": 0.42, "y": 0.18, "texto": "olha aqui" }
{ "tipo": "recado", "acao": "fechar" }
{ "tipo": "recado", "acao": "apagar" }
```

- `escrever`: cria o recado aberto de quem envia (se não houver) ou atualiza o texto dele.
  Reinicia os 8 s. `x`/`y` só são usados na criação. Enviado a cada alteração do campo, com o texto
  inteiro.
  - Se já há um recado aberto com **outro** `alvo`, ele é removido e um novo é criado.
- `fechar`: o recado aberto passa a `aberto: false` e os 8 s recomeçam. Sem recado aberto: ignorado.
- `apagar`: remove o recado aberto na hora. Sem recado aberto: ignorado.

**Formato** (fora disso → `erro` `mensagem-invalida`, que fecha a conexão, como nas demais):
`acao` é `"escrever"`, `"fechar"` ou `"apagar"`; em `escrever`, `alvo` e `texto` são textos e `x`,
`y` são números.

**Ignorados sem erro** (research §9): `escrever` com `alvo` que não está compartilhando, `x`/`y`
fora de 0–1 (ou não finitos), ou `texto` com mais de 100 caracteres depois de normalizado. Nada
aparece para ninguém.

## Servidor → cliente (nova)

### `recados`

Enviada a **todos** da sala sempre que a lista muda, e a quem entra logo depois de `entrou`.

```json
{
  "tipo": "recados",
  "lista": [
    { "id": "aB3…", "autor": "r7Q…", "nome": "Bruno", "alvo": "pX2…",
      "x": 0.42, "y": 0.18, "texto": "olha aqui", "aberto": true }
  ]
}
```

- Ordem = ordem de criação; o último é desenhado por cima.
- `nome` vem do servidor (não de quem escreve). `texto` já normalizado, sem `trim`.
- Cada navegador desenha só os recados cujo `alvo` é o seu compartilhamento em destaque, com
  `texto.trim()` não vazio.
- Quem escreve fecha o próprio campo quando não há mais recado com `autor` igual ao seu id e
  `aberto: true` (venceram os 8 s ou o compartilhamento acabou).

## Erros

| `codigo`            | Novo caso                                                        |
|---------------------|------------------------------------------------------------------|
| `mensagem-invalida` | `recado` antes de `entrar`; `acao` desconhecida; tipos errados em `escrever` |
