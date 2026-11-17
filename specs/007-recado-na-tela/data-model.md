# Data Model: T07 · Escrever recados sobre o compartilhamento

Tudo em memória, no registro de salas do servidor (`src/salas.js`). Nada é gravado em disco.

## Recado

| Campo     | Tipo                 | Regra                                                                  |
|-----------|----------------------|------------------------------------------------------------------------|
| `id`      | texto                | Gerado pelo servidor na criação (`gerarSegredo`). Único na sala.        |
| `autor`   | texto                | Id público de quem escreve. Usado para achar o recado aberto da pessoa. |
| `nome`    | texto                | Nome de quem escreve, copiado do participante pelo servidor.            |
| `alvo`    | texto                | Id público de quem está compartilhando a tela onde o recado está.       |
| `x`, `y`  | número (0–1)         | Ponto relativo à área da imagem (research §3). Fixo depois de criado.   |
| `texto`   | texto (0–100 graf.)  | Sem quebras de linha; pode ficar vazio enquanto o campo está aberto.    |
| `aberto`  | booleano             | `true` enquanto o campo de quem escreve está aberto.                    |
| `vence`   | temporizador interno | Some 8 s depois do último `escrever` ou do `fechar`. Não é enviado.     |

**Validação** (função pura em `public/js/recados.js`, usada pelos dois lados):

- `normalizarTextoRecado(texto)`: troca `\r\n`, `\r` e `\n` por espaço.
- `contarCaracteres(texto)`: conta grafemas (`Intl.Segmenter`); `RECADO_MAXIMO = 100`.
- `textoDepoisDaInsercao(atual, inicio, fim, inserido)`: como o campo ficaria se `inserido`
  substituísse a seleção `inicio`–`fim` (usada no `beforeinput` para bloquear o que passa de 100).
- `caberNoLimite(atual, inicio, fim, inserido)`: a parte de `inserido` que cabe (ao colar).
- `cortarTextoRecado(texto)`: normaliza e corta em 100 grafemas (salvaguarda no `input`).
- `textoRecadoValido(texto)`: texto (string) com no máximo 100 grafemas depois de normalizado.
- O que é **mostrado** é `texto.trim()`; recado com texto vazio depois do `trim` não é desenhado.

**Restrições da sala**:

- No máximo **um** recado com `aberto: true` por `autor`.
- O `alvo` precisa estar compartilhando (`tela !== null`) quando o recado é criado ou atualizado.
- Ordem da lista = ordem de criação (o mais recente é desenhado por cima).

## Ciclo de vida

```text
                escrever (sem recado aberto, alvo válido)
                         │  cria; agenda 8 s
                         ▼
             ┌──────── ABERTO ◄────────┐
             │           │             │ escrever: atualiza texto, reinicia 8 s
   apagar ───┤           │ fechar      │
   (Esc)     │           ▼             │
             │        FECHADO ─────────┘ (não volta: novo `escrever` cria outro recado)
             │           │  fechar reinicia 8 s
             ▼           ▼
          REMOVIDO ◄── 8 s vencidos
```

Também removem o recado:

| Evento                                                     | Recados removidos                         |
|------------------------------------------------------------|-------------------------------------------|
| `apagar` de quem escreve                                    | o recado aberto dela                      |
| `escrever` com outro `alvo` tendo um recado aberto          | o recado aberto dela (e cria o novo)      |
| Quem compartilha para (`definirTela` false)                 | todos com aquele `alvo`                   |
| Quem compartilha sai, recarrega ou cai (`sair`/substituição) | todos com aquele `alvo`                   |
| Quem escreve sai, recarrega ou cai                          | só o recado **aberto** dela               |
| Sala expira                                                 | todos (some com a sala)                   |

Toda remoção cancela o temporizador do recado. Toda mudança chama `aoMudarRecados(idSala)`, que
envia a lista `recados` a todos da sala.

## Mudanças em entidades existentes

- **Sala**: ganha `recados: Map<id, Recado>`.
- **Participante**: sem campos novos; o nome do recado vem dele.
- **Escolha de destaque (T05)**: o próprio compartilhamento passa a entrar na lista de destaque e
  miniaturas de quem compartilha (`escolherDestaque` deixa de filtrar `idVoce`). `assistindo` pode
  ser o próprio id.

## Estado só no navegador

| Estado              | Onde        | Uso                                                                  |
|---------------------|-------------|----------------------------------------------------------------------|
| Último ponteiro     | `area-tela` | `clientX/clientY` do último `pointermove` sobre o destaque.           |
| Campo aberto        | `area-tela` | `{ alvo, x, y }` do campo aberto, ou `null`.                         |
| Lista de recados    | `app.js`    | Última `recados` recebida; desenha os de `alvo === destaque.id`.      |
