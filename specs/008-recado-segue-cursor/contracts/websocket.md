# Contrato WebSocket (versão T08)

Altera [../../007-recado-na-tela/contracts/websocket.md](../../007-recado-na-tela/contracts/websocket.md).
Tudo da T07 continua valendo, exceto o que está abaixo. Modelo em [../data-model.md](../data-model.md).

## Cliente → servidor: `recado`

```json
{ "tipo": "recado", "acao": "escrever", "alvo": "pX2…", "x": 0.42, "y": 0.18, "texto": "olha aqui" }
{ "tipo": "recado", "acao": "mover", "x": 0.47, "y": 0.21 }
{ "tipo": "recado", "acao": "apagar" }
```

- `escrever`: como na T07. Cria o recado de quem envia em `x`/`y` (se não houver) ou atualiza o
  texto. Reinicia os 8 s e, se o recado estava `apagando`, volta a `apagando: false`.
- `mover` **(nova)**: muda `x`/`y` do recado de quem envia. Não reinicia os 8 s nem tira do fade.
  O navegador envia no máximo uma a cada 50 ms, só com o ponteiro sobre a imagem e só depois do
  primeiro `escrever`.
- `apagar`: como na T07 (remove na hora).
- `fechar` **(removida)**: passa a ser ação desconhecida.

**Formato** (fora disso → `erro` `mensagem-invalida`): `acao` é `"escrever"`, `"mover"` ou
`"apagar"`; em `mover`, `x` e `y` são números.

**Ignorados sem erro**: os casos da T07, mais `mover` sem recado ou com `x`/`y` fora de 0–1 (ou não
finitos).

## Servidor → cliente: `recados`

```json
{
  "tipo": "recados",
  "lista": [
    { "id": "aB3…", "autor": "r7Q…", "nome": "Bruno", "alvo": "pX2…",
      "x": 0.47, "y": 0.21, "texto": "olha aqui", "apagando": false }
  ]
}
```

- Enviada a todos a cada mudança, agora incluindo `mover`, a entrada no fade (8 s) e a remoção (9 s).
- Ordem **muda**: pela última tecla (cada `escrever` leva o recado para o fim); o último é desenhado
  por cima.
- `apagando` **(novo)** substitui `aberto` **(removido)**.
- Quem escreve fecha o próprio campo quando não há mais recado com `autor` igual ao seu id.

## Erros

| `codigo`            | Novo caso                                                        |
|---------------------|------------------------------------------------------------------|
| `mensagem-invalida` | `mover` com `x`/`y` que não são números; `acao: "fechar"`         |
