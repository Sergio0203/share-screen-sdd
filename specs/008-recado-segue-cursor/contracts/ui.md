# Contrato de Interface (versão T08)

Altera [../../007-recado-na-tela/contracts/ui.md](../../007-recado-na-tela/contracts/ui.md). Nenhum
texto novo; tudo o que não está abaixo continua como na T07.

## Campo de recado

| Elemento / tecla      | Texto / comportamento                                                          |
|-----------------------|--------------------------------------------------------------------------------|
| Posição               | **Muda**: canto superior esquerdo do campo no ponto do ponteiro, acompanhando cada movimento sobre a imagem (sem atraso, sem transição); empurrado para dentro da imagem perto da borda. Ponteiro fora da imagem: fica no último ponto |
| Enter                 | **Muda**: não faz nada                                                         |
| Clicar fora / trocar de aba | **Muda**: o campo continua aberto. A próxima tecla que escreve (sem Ctrl/Alt/⌘), fora de outro campo de texto, volta para o campo e entra no recado |
| `/` com recado visível | É só um caractere do recado (campo sempre aberto enquanto o recado aparece)   |
| Esc                   | Como na T07 (fecha e apaga para todos), inclusive com o campo sem foco         |
| Fecha sozinho         | **Muda**: quando o recado termina o fade (9 s depois da última tecla) ou o compartilhamento acaba |
| Fade                  | O campo também fica transparente durante o fade; uma tecla o devolve à opacidade total |

## Recado na imagem

| Elemento | Texto / comportamento                                                                  |
|----------|----------------------------------------------------------------------------------------|
| Posição  | **Muda**: segue `x`, `y` recebidos, deslizando até cada nova posição em 100 ms (linear)  |
| Fade     | **Novo**: com `apagando`, opacidade de 1 → 0 em 1 s (linear); sem `apagando`, volta a 1 na hora |
| Sobreposição | **Muda**: o recado com a tecla mais recente por cima (o que recebeu o último `escrever`) |
