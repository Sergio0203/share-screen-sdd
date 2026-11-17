# Quickstart: validar a T07 · Recados sobre o compartilhamento

## Pré-requisitos

- Node.js 22+, `npm install` feito.
- Dois navegadores de computador (ou duas janelas, uma delas anônima), com teclado e mouse.
- Contratos: [contracts/ui.md](contracts/ui.md) e [contracts/websocket.md](contracts/websocket.md).

## Testes automáticos

```bash
npm test
```

Devem passar, além dos testes das tarefas anteriores:

- `tests/unit/recados.test.js` — contagem por grafemas, corte em 100, quebras de linha, validação,
  inserção bloqueada com 100, colar parcial (só o que cabe), substituir seleção.
- `tests/unit/posicao-recado.test.js` — `pontoNaImagem`/`areaDaImagem` com faixas laterais e
  superiores, cliques fora da imagem, ida e volta do ponto em tamanhos diferentes (SC-002).
- `tests/unit/atalho-recado.test.js` — `deveAbrirCampo`: `/` em campo de texto, com Ctrl/⌘, sem
  destaque, ponteiro fora da imagem.
- `tests/unit/salas.test.js` — criar/atualizar/fechar/apagar, 8 s com tempo falso, reinício da
  contagem, um aberto por pessoa, troca de alvo, limpeza ao parar de compartilhar e ao sair,
  entradas inválidas ignoradas.
- `tests/integration/websocket.test.js` — `recados` chega a todos, a quem entra depois e some após
  8 s; formato errado → `mensagem-invalida`; texto de 101 caracteres não aparece.
- `tests/unit/destaque.test.js` — a própria tela entra no destaque.

## Roteiro manual

```bash
npm start   # http://localhost:3000
```

1. **A** cria a sala e compartilha uma janela; **B** entra pelo link.
2. **Própria tela**: A vê a própria tela em destaque, sem eco do som, com a legenda `A (você)`.
3. **Escrever ao vivo**: B põe o mouse sobre um detalhe da imagem, aperta `/` e digita `aqui`. O
   campo abre no ponto, mostra `Faltam 96 caracteres`, e A vê `B aqui` surgindo no mesmo detalhe em
   até 1 s a cada tecla.
4. **Some sozinho**: B para de digitar. Em 8–9 s o recado some nas duas telas e o campo de B fecha.
5. **Reinício**: B escreve, espera 5 s, digita mais uma letra; o recado dura mais 8 s.
6. **Enter e clicar fora**: Enter fecha o campo e o recado ainda fica até completar 8 s; o mesmo
   ao trocar de aba logo depois de digitar.
7. **Esc**: B escreve e aperta Esc; o recado some para A em até 1 s.
8. **Quem compartilha escreve**: A volta para a aba, aperta `/` sobre a própria imagem e escreve;
   B vê o recado no ponto certo. Com A focado em outra janela, `/` não faz nada no Telão.
9. **Tamanhos diferentes**: B em tela cheia e A com a janela pela metade; o recado aponta para o
   mesmo detalhe nas duas. Redimensionar a janela com o recado na tela: ele acompanha a imagem.
10. **Limite e texto puro**: digitar até 100 caracteres → `Faltam 0 caracteres`; segurar uma tecla
    → nenhum caractere a mais aparece, nem por um instante; apagar 1 e digitar 1 funciona. Colar 150
    caracteres num campo vazio → entram 100. Com 95, colar 10 → entram 5. Digitar 100 emojis → o
    101º não entra. Digitar `<b>oi</b>` e `<img src=x onerror=alert(1)>` → aparecem literalmente.
11. **Outros campos**: com o foco num campo de texto da página, `/` é escrito nele e nenhum campo
    de recado abre.
12. **Fora da imagem**: `/` com o mouse nas faixas pretas, nas câmeras ou na lista não abre nada.
13. **Fim do compartilhamento**: com recados na tela e o campo de B aberto, A para de compartilhar;
    os recados somem e o campo de B fecha, sem mensagem de erro.
14. **Quem entra depois**: com um recado na tela, C entra e vê o recado até ele completar os 8 s.
15. **Falha**: com o campo aberto, derrubar a rede de B; em até 3 s o recado some para A. B digita
    mais uma letra e vê `Não foi possível enviar o recado. Verifique sua conexão e tente de novo.`
