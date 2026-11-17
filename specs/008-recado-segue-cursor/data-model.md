# Data Model: T08 · O recado segue o cursor e some sozinho

Altera o [modelo da T07](../007-recado-na-tela/data-model.md). Tudo em memória, no registro de
salas do servidor (`src/salas.js`).

## Recado

| Campo      | Tipo                 | Regra                                                                  |
|------------|----------------------|------------------------------------------------------------------------|
| `id`       | texto                | Como na T07.                                                           |
| `autor`    | texto                | Como na T07. **No máximo um recado por `autor`** (antes: um aberto).   |
| `nome`     | texto                | Como na T07.                                                           |
| `alvo`     | texto                | Como na T07.                                                           |
| `x`, `y`   | número (0–1)         | **Muda**: posição atual do cursor de quem escreve; atualizada por `mover`. |
| `texto`    | texto (0–100 graf.)  | Como na T07.                                                           |
| `apagando` | booleano             | **Novo**: `true` durante o fade de 1 s.                                |
| ~~`aberto`~~ | —                  | **Removido**: todo recado tem o campo de quem escreve aberto.          |
| `vence`    | temporizador interno | **Muda**: próxima etapa do prazo (início do fade ou remoção). Não é enviado. |

**Validação** (sem mudança nas funções de texto da T07):

- `mover`: `x`/`y` finitos entre 0 e 1; senão, ignorado.
- Regra de envio no navegador (`public/js/movimento-recado.js`):
  `devoEnviarPosicao(agora, ultimoEnvio, ponto, ultimoEnviado)` → `true` se `ponto` difere do último
  enviado e passaram pelo menos `INTERVALO_POSICAO_MS = 50` desde `ultimoEnvio`.

**Ordem da lista**: **muda** — ordem da última tecla (cada `escrever` move o recado para o fim);
o último é desenhado por cima (FR-010). `mover` não muda a ordem.

## Ciclo de vida

```text
          escrever (sem recado, alvo válido)
                    │ cria em (x, y); agenda 8 s
                    ▼
     ┌────────── VISÍVEL ◄──────────────┐
     │           │    ▲ mover: só x, y  │ escrever: texto, reinicia 8 s
     │           │    └──┘              │
     │           │ 8 s sem escrever     │
     │           ▼                      │
     │       APAGANDO ──────────────────┘ escrever: volta a VISÍVEL, reinicia 8 s
     │        │  ▲ mover: só x, y
     │        │  └──┘
apagar (Esc)  │ 1 s
     ▼        ▼
         REMOVIDO
```

Também removem o recado (tabela da T07, com uma mudança):

| Evento                                                       | Recados removidos                    |
|--------------------------------------------------------------|--------------------------------------|
| `apagar` de quem escreve                                     | o recado dela                        |
| `escrever` com outro `alvo` tendo um recado                  | o recado dela (e cria o novo)        |
| Quem compartilha para, sai, recarrega ou cai                 | todos com aquele `alvo`              |
| Quem escreve sai, recarrega ou cai                           | **o recado dela** (antes: só se aberto) |
| Sala expira                                                  | todos                                |

Toda mudança (inclusive `mover` e a entrada em `apagando`) chama `aoMudarRecados(idSala)`.

## Estado só no navegador (`area-tela.js`)

| Estado             | Uso                                                                        |
|--------------------|----------------------------------------------------------------------------|
| Último ponteiro    | Como na T07; agora também reposiciona o próprio campo a cada movimento.     |
| Campo aberto       | `{ alvo, x, y, … }`; `x`/`y` seguem o ponteiro sobre a imagem.              |
| Último envio       | Momento e ponto do último `mover` (para `devoEnviarPosicao`) e envio final pendente. |
| Elementos por `id` | Mapa `id → elemento` dos recados desenhados, para manter as transições.     |
