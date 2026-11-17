# Data Model: T06 · Escolher a qualidade do compartilhamento

Nada muda no servidor nem no protocolo (a lista `participantes` da T05 não ganha campos). Tudo
abaixo vive no navegador de quem compartilha.

## Qualidade (constante, `public/js/qualidades.js`)

| Campo         | Tipo   | Regras                                          |
|---------------|--------|-------------------------------------------------|
| `id`          | string | `"720p30"`, `"1080p30"` ou `"1080p60"`          |
| `nome`        | string | `"720p · 30 fps"`, `"1080p · 30 fps"`, `"1080p · 60 fps"` |
| `largura`     | número | 1280, 1920, 1920 (máximo)                       |
| `altura`      | número | 720, 1080, 1080 (máximo)                        |
| `qps`         | número | 30, 30, 60 (quadros por segundo, máximo)        |
| `taxaMaxima`  | número | 2 500 000, 4 000 000, 6 000 000 (bits/s)        |

`QUALIDADES` = as três, nessa ordem. `QUALIDADE_PADRAO` = `"1080p30"`.

### Funções puras

- `qualidadePorId(id)` → a qualidade com esse id, ou a padrão se `id` for desconhecido/ausente.
- `restricoesDeCaptura(q)` → `{ width: { max: q.largura }, height: { max: q.altura },
  frameRate: { ideal: q.qps, max: q.qps } }`.
- `parametrosDeEnvio(parametrosAtuais, q)` → cópia de `parametrosAtuais` com
  `degradationPreference: "maintain-framerate"` e, em `encodings[0]`, `maxFramerate: q.qps`,
  `maxBitrate: q.taxaMaxima`, `scaleResolutionDownBy: 1` (sem `encodings` → devolve sem mudar).
- `descreverQualidadeAtiva(q, { largura, altura })` → texto de
  [contracts/ui.md](contracts/ui.md): limitada quando `largura < q.largura && altura < q.altura`.

## Preferência (navegador)

| Onde                                    | Valor     | Regras                                      |
|-----------------------------------------|-----------|---------------------------------------------|
| `localStorage["qualidadeCompartilhamento"]` | id da qualidade | gravado a cada escolha aplicada; lido ao abrir a sala; desconhecido → padrão |

## Estado do compartilhamento (`midia.js`)

| Estado            | Descrição                                                              |
|-------------------|------------------------------------------------------------------------|
| `qualidadeTela`   | qualidade ativa; definida em `compartilharTela(q)` e `mudarQualidade(q)` |
| parâmetros de envio | aplicados ao canal `telaVideo` de cada par que recebe a tela          |

```text
         compartilharTela(q)                 mudarQualidade(q2) ok
 PARADO ─────────────────────► ATIVA(q) ───────────────────────────► ATIVA(q2)
   ▲                             │   │   mudarQualidade(q2) falhou
   │   pararCompartilhamento     │   └──────────────► ATIVA(q)  (+ mensagem FR-008)
   └─────────────────────────────┘
```
