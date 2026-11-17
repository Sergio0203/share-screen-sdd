# Quickstart: validar a T08 · O recado segue o cursor e some sozinho

## Pré-requisitos

- Node.js 22+, `npm install` feito.
- Três navegadores de computador (ou janelas, algumas anônimas), com teclado e mouse.
- Contratos: [contracts/ui.md](contracts/ui.md) e [contracts/websocket.md](contracts/websocket.md);
  modelo em [data-model.md](data-model.md).

## Testes automáticos

```bash
npm test
```

Devem passar, além dos testes das tarefas anteriores (ajustados onde a T08 muda a T07):

- `tests/unit/movimento-recado.test.js` — `devoEnviarPosicao`: antes de 50 ms não envia; ponto igual
  não envia; ponto novo depois de 50 ms envia.
- `tests/unit/atalho-recado.test.js` — `acaoDaTecla`: `/` sem campo sobre a imagem → `abrir`; `/`
  com campo aberto e sem foco → `voltarAoCampo`; letra com campo sem foco → `voltarAoCampo`; tecla em
  outro campo de texto, com Ctrl/⌘ ou que não escreve → `null`; Esc com campo sem foco → `apagar`.
- `tests/unit/salas.test.js` (tempo falso) — `mover` muda `x`/`y` sem reiniciar o prazo; aos 8 s
  `apagando: true`; aos 9 s removido; `escrever` no fade volta a `apagando: false` e reinicia;
  `mover` inválido ignorado; um recado por pessoa; ordem pela última tecla; quem escreve sai → o
  recado dela some.
- `tests/integration/websocket.test.js` — `mover` chega a todos na lista; `fechar` e `mover` com
  tipos errados → `mensagem-invalida`; recado com `apagando` e depois removido.

## Roteiro manual

```bash
npm start   # http://localhost:3000
```

1. **A** cria a sala e compartilha uma janela; **B** e **C** entram pelo link.
2. **Campo preso ao cursor** (US1, SC-001): B aperta `/` sobre a imagem e, antes de digitar, move o
   mouse: o campo vai junto, e A e C não veem nada. B digita `vai por aqui` e continua movendo: o
   campo segue o cursor durante a digitação.
3. **Deslizar para todos** (FR-003, SC-002/003): B arrasta o mouse de um canto ao outro da imagem.
   Em A e C, o recado desliza pelo mesmo caminho, sem saltos, e para sobre o mesmo detalhe em até
   0,5 s depois que B para. Repetir com a janela de A pela metade e a de C em tela cheia.
4. **Cursor fora da imagem** (FR-004): B leva o cursor para as câmeras: o recado fica parado no
   último ponto da imagem; ao voltar, segue de novo.
5. **Fade** (US2, SC-004): B para de digitar. Por 8 s o recado fica inteiro; depois some aos poucos
   em 1 s, nas três telas ao mesmo tempo; o campo de B fecha.
6. **Tecla no fade** (US2-3): B escreve, para, e digita uma letra no meio do fade: o recado volta a
   ficar inteiro para todos e só some 9 s depois dessa tecla.
7. **Enter e clicar fora** (FR-007): B escreve, aperta Enter (nada muda) e clica na imagem; digita
   `x` sem clicar no campo: o `x` entra no recado.
8. **`/` com recado visível** (US3): B escreve `um`, para e aperta `/` e `dois`: todos veem `um/dois`
   num recado só. Depois que ele some, `/` abre um campo novo e vazio.
9. **Vários ao mesmo tempo** (FR-010, SC-006): A, B e C escrevem e movem o cursor juntos; todos veem
   os três recados, cada um seguindo o autor certo; quem digitou por último fica por cima; voz e
   compartilhamento continuam sem cortes.
10. **Esc** (FR-008): B escreve e aperta Esc: o recado some para todos em até 1 s, sem fade.
11. **Quem escreve sai**: B escreve e fecha a aba: o recado some para A e C em até 3 s.
12. **Campo de nome**: com recado visível, B clica no campo de nome e digita: o texto vai para o
    nome, não para o recado.
