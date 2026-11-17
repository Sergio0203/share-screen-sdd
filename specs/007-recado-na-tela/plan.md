# Implementation Plan: T07 · Escrever recados sobre o compartilhamento

**Branch**: `007-recado-na-tela` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-recado-na-tela/spec.md`

## Summary

Com a aba do Telão em foco e o ponteiro sobre a imagem em destaque, `/` abre um campo de texto no
ponto. O texto vai ao vivo para todos que veem aquele compartilhamento e some 8 s depois da última
tecla (Enter só fecha o campo; Esc apaga na hora). Quem compartilha passa a ver a própria tela no
destaque (altera a T05) e também escreve.

Abordagem: uma mensagem nova `recado` no WebSocket da sala. O servidor guarda os recados ativos em
memória, controla os 8 s e envia a lista `recados` inteira a cada mudança. A posição é guardada como
fração da área real da imagem, então o ponto é o mesmo em qualquer tamanho de janela. O texto é
sempre escrito com `textContent`. Contagem de caracteres, conversão de posição e regra do atalho
ficam em módulos puros testáveis. Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T06)

**Primary Dependencies**: nenhuma nova; `ws` (já usado) e APIs nativas `Intl.Segmenter`,
`ResizeObserver`, `pointermove`/`keydown`, Fullscreen API

**Storage**: memória do servidor (recados ativos por sala); nada em disco nem no `localStorage`

**Testing**: `node:test` — unitários dos módulos puros e do registro de salas (tempo falso),
integração via WebSocket; roteiro manual em [quickstart.md](quickstart.md)

**Target Platform**: escrever — navegador de computador com teclado e mouse/trackpad; ver os
recados — qualquer navegador que assiste à sala

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: cada alteração do texto visível para todos em ≤ 1 s (SC-001); recado some
entre 8 e 9 s após a última tecla (SC-008); ponto igual com diferença ≤ 1% (SC-002)

**Constraints**: texto puro sempre (FR-008); 100 caracteres contados por símbolo visível; nada
inválido aparece para ninguém (FR-005); textos de [contracts/ui.md](contracts/ui.md)

**Scale/Scope**: até 6 pessoas, no máximo 1 recado aberto por pessoa, 1 mensagem nova em cada
sentido, 1 campo, 1 camada de recados, 1 dica, 1 mensagem de erro

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Reaproveita o WebSocket e o padrão "lista inteira" de `participantes`; sem canal WebRTC novo, sem banco, sem dependência; `<input>` nativo; temporizador único no servidor | ✅ |
| II. Código legível | Regras em módulos puros nomeados (`recados.js`, `posicao-recado.js`, `atalho-recado.js`); servidor só valida e repassa; `area-tela.js` só desenha | ✅ |
| III. Testes da lógica principal | Ciclo de vida dos recados (criar, 8 s, fechar, apagar, limpezas), validação, contagem, posição e atalho cobertos por testes; integração via WebSocket | ✅ |
| IV. Erros claros em pt-BR | Falha ao enviar com mensagem de [contracts/ui.md](contracts/ui.md); casos inválidos não mostram erro a ninguém | ✅ |
| V. Interface em pt-BR | Dica, contador, rótulo e mensagem em `textos.js` | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código de tarefas anteriores** (necessárias, não violações):

- T05: `escolherDestaque` deixa de excluir a própria tela; `midia.telaDe(idProprio)` devolve uma
  prévia muda da captura; legenda `(você)` na própria tela (decisão da clarificação; altera T05
  FR-004).
- T02/T05: `sala.enviar` passa a devolver se conseguiu enviar; `conectar` repassa a mensagem
  `recados`; o servidor envia `recados` depois de `entrou`.

## Project Structure

### Documentation (this feature)

```text
specs/007-recado-na-tela/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── websocket.md
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── salas.js             # ALTERADO: recados por sala, escrever/fechar/apagar, 8 s, limpezas, aoMudarRecados
└── servidor.js          # ALTERADO: mensagem `recado` (validação), envio de `recados` a todos e após `entrou`
public/
├── estilos.css          # ALTERADO: camada de recados, caixa do recado, campo, contador, dica
└── js/
    ├── recados.js       # NOVO (puro, usado também pelo servidor): normalizar, contar, cortar, validar
    ├── posicao-recado.js # NOVO (puro): areaDaImagem, pontoNaImagem, encaixar caixa na borda
    ├── atalho-recado.js # NOVO (puro): deveAbrirCampo(evento, estado)
    ├── area-tela.js     # ALTERADO: camada de recados, campo com contador, ponteiro, dica, tela cheia
    ├── destaque.js      # ALTERADO: inclui a própria tela
    ├── midia.js         # ALTERADO: prévia muda da própria tela em telaDe(idProprio)
    ├── app.js           # ALTERADO: liga recados recebidos/enviados, erro ao enviar, legenda (você)
    └── textos.js        # ALTERADO: textos de contracts/ui.md (T07)
tests/
├── unit/
│   ├── recados.test.js          # NOVO
│   ├── posicao-recado.test.js   # NOVO
│   ├── atalho-recado.test.js    # NOVO
│   ├── destaque.test.js         # ALTERADO: própria tela no destaque
│   └── salas.test.js            # ALTERADO: ciclo de vida dos recados
└── integration/
    └── websocket.test.js        # ALTERADO: mensagens `recado`/`recados`
```

**Structure Decision**: mesmo projeto. O servidor é a fonte da verdade dos recados (lista e prazo);
o navegador só converte posições, desenha e captura teclas. As regras ficam em três módulos puros
pequenos para que `area-tela.js` e `servidor.js` só os apliquem.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
