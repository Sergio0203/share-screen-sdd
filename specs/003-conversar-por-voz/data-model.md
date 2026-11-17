# Data Model: T03 · Conversar por voz

Estende o modelo da T02 ([../002-entrar-sala-link/data-model.md](../002-entrar-sala-link/data-model.md)).
Estado em memória no servidor; o áudio em si nunca passa pelo servidor.

## Participante (alterado)

| Campo             | Tipo     | Regras                                                                 |
|-------------------|----------|------------------------------------------------------------------------|
| `id`              | string   | **muda também quando a conexão é substituída** (recarregar/outra aba)   |
| `microfoneLigado` | booleano | **novo**; `false` ao entrar e ao ser substituído (FR-001); alterado só pela mensagem `microfone` da própria conexão |
| demais campos     |          | iguais à T02 (`chave`, `nome`, `entradaEm`, `conexao`)                 |

Item da lista pública (`participantes`): `{ id, nome, anfitriao, microfone }`, onde
`microfone = microfoneLigado`.

### Estados do microfone (visão da sala)

```text
                 microfone { ligado: true }
 DESLIGADO ───────────────────────────────────► LIGADO
   ▲  ▲                                            │
   │  └──── microfone { ligado: false } ───────────┤
   │                                               │
   └──── conexão substituída (novo id) ◄───────────┘
         (sair remove o participante)
```

## Regras novas do registro de salas

1. `definirMicrofone(idSala, conexao, ligado)`: localiza o participante pela conexão; se não
   existe (conexão já substituída ou fora da sala), ignora. Se o valor muda, avisa `aoMudar`.
2. `conexaoPorId(idSala, idPublico)`: devolve a conexão do participante com esse id público na
   sala, ou `null`. Usado para repassar `sinal`.
3. `idPorConexao(idSala, conexao)`: id público do participante dono da conexão, ou `null`. Usado
   para preencher `de`.
4. Substituição (T02, regra 3 de `entrar`): além de trocar a conexão e o nome, gera **novo `id`** e
   faz `microfoneLigado = false`.

## Lado do navegador (estado da voz, não persistido)

| Estado             | Onde        | Descrição                                                          |
|--------------------|-------------|--------------------------------------------------------------------|
| `trilhaMicrofone`  | `voz.js`    | trilha de áudio local; existe só com o microfone ligado            |
| `pares`            | `voz.js`    | `Map<idPublico, { conexaoRtc, audio, falhou }>` — uma por outra pessoa |
| `somBloqueado`     | `voz.js`    | `true` se algum `play()` foi recusado; mostra "Ativar som"          |

Nada de voz vai para o `localStorage` (estado do microfone não é lembrado — Assumptions da spec).

### Regras de pares (módulo puro `voz-regras.js`)

- `devoIniciar(meuId, outroId)` → `meuId < outroId`.
- `compararPares(idsComPar, lista, meuId)` → `{ criar, fechar }`:
  - `criar`: ids da lista, diferentes de `meuId`, sem par, em que `devoIniciar` é verdadeiro;
  - `fechar`: ids com par que não estão mais na lista.
- `classificarErroMicrofone(nomeDoErro)` → `"permissao" | "semMicrofone" | "falha"`
  (tabela em [research.md §6](research.md)).
