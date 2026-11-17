# Implementation Plan: T08 · O recado segue o cursor e some sozinho

**Branch**: `008-recado-segue-cursor` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/008-recado-segue-cursor/spec.md`

## Summary

O recado da T07 passa a seguir o cursor de quem escreve: o campo acompanha o ponteiro na própria
tela e, para os outros, o recado desliza até cada nova posição. O campo fica ativo durante toda a
vida do recado (Enter e clicar fora não fecham; `/` vira caractere); o recado some com um fade de
1 s depois de 8 s sem teclas, e uma tecla durante o fade o traz de volta.

Abordagem: reaproveitar a mensagem `recado` com uma ação nova, `mover`, enviada no máximo a cada
50 ms enquanto o ponteiro se move sobre a imagem. O servidor atualiza `x`/`y` e reenvia a lista
`recados` (padrão da T07). O prazo passa a ter duas fases no servidor: 8 s visível → 1 s
`apagando` → removido. Nos navegadores, os elementos dos recados passam a ser reaproveitados por
`id`, e uma transição CSS curta faz o movimento e o fade contínuos. Os módulos puros ganham as
regras novas (limite de envio de posição e decisão da tecla). Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T07)

**Primary Dependencies**: nenhuma nova; `ws` (já usado), `pointermove`, transições CSS
(`transform`, `opacity`)

**Storage**: memória do servidor (recados ativos por sala), como na T07

**Testing**: `node:test` — unitários dos módulos puros e do registro de salas (tempo falso),
integração via WebSocket; roteiro manual em [quickstart.md](quickstart.md)

**Target Platform**: escrever — navegador de computador com teclado e mouse/trackpad; ver —
qualquer navegador que assiste à sala

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: recado alcança o cursor de quem escreve em ≤ 0,5 s (SC-002), sem saltos
(SC-003); fade de 8 → 9 s, sumindo até 9,5 s (SC-004); 5 pessoas movendo ao mesmo tempo sem cortes
na voz e no compartilhamento (SC-006)

**Constraints**: no máximo 20 posições por segundo por pessoa (research §1); posição continua
relativa à imagem (T07 research §3); texto puro e limite de 100 inalterados

**Scale/Scope**: até 6 pessoas, no máximo 1 recado por pessoa; 1 ação nova (`mover`), 1 ação
removida (`fechar`), 1 campo novo na lista (`apagando`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Mesma mensagem `recado` e mesma lista `recados`; sem canal novo, sem dependência; movimento e fade por transição CSS (sem laço de animação); um temporizador por recado (troca de fase reaproveita o mesmo campo `vence`) | ✅ |
| II. Código legível | Regras novas em funções puras nomeadas (`devoEnviarPosicao`, `acaoDaTecla`); `salas.js` ganha `moverRecado` e a fase `apagando`; `area-tela.js` só aplica | ✅ |
| III. Testes da lógica principal | Ciclo de vida (8 s → fade → remoção, tecla no fade, mover, sem `fechar`), validação de `mover`, limite de envio e decisão da tecla cobertos por testes; integração via WebSocket | ✅ |
| IV. Erros claros em pt-BR | Nenhum erro novo; falha ao enviar continua com a mensagem da T07 | ✅ |
| V. Interface em pt-BR | Nenhum texto novo; a dica e o contador da T07 continuam | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código de tarefas anteriores** (necessárias, não violações):

- T07 servidor: ação `fechar` e campo `aberto` deixam de existir (o recado está sempre "aberto"
  enquanto vive); quem escreve sair remove o recado dela (antes, só se ainda estava aberto).
- T07 navegador: Enter não fecha mais o campo; `blur` não fecha mais o campo; o campo fecha quando o
  próprio recado some da lista ou com Esc; a camada de recados deixa de ser redesenhada do zero a
  cada mudança.

## Project Structure

### Documentation (this feature)

```text
specs/008-recado-segue-cursor/
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
├── salas.js             # ALTERADO: moverRecado, fases visível/apagando, sem fecharRecado/aberto
└── servidor.js          # ALTERADO: ação `mover` (formato), `fechar` vira mensagem-invalida
public/
├── estilos.css          # ALTERADO: transição de transform (movimento) e opacity (fade)
└── js/
    ├── movimento-recado.js # NOVO (puro): devoEnviarPosicao(agora, ultimoEnvio, ponto, enviado)
    ├── atalho-recado.js # ALTERADO: acaoDaTecla → "abrir" | "voltarAoCampo" | "apagar" | null
    ├── area-tela.js     # ALTERADO: campo segue o ponteiro, envia `mover`, elementos por id, fade
    └── app.js           # ALTERADO: aoMoverRecado; remove aoFecharRecado
tests/
├── unit/
│   ├── movimento-recado.test.js # NOVO
│   ├── atalho-recado.test.js    # ALTERADO
│   └── salas.test.js            # ALTERADO: mover, fade, tecla no fade, sem fechar
└── integration/
    └── websocket.test.js        # ALTERADO: `mover`, `apagando`, remoção após 9 s
```

**Structure Decision**: mesmo projeto e mesma divisão da T07. O servidor continua sendo a fonte da
verdade do recado (texto, posição e fase); o navegador só decide quando enviar a posição, move o
próprio campo localmente e anima o que recebe.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
