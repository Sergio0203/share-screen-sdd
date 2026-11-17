# Contrato de Interface (versão T07, textos em pt-BR)

Estende [../../006-qualidade-compartilhamento/contracts/ui.md](../../006-qualidade-compartilhamento/contracts/ui.md).
Todos os textos vêm de `public/js/textos.js`. Protocolo em [websocket.md](websocket.md).

## Destaque: quem compartilha vê a própria tela (altera a T05)

| Situação                                 | Comportamento                                                      |
|------------------------------------------|--------------------------------------------------------------------|
| Começou a compartilhar, sem escolha feita | A própria tela vai para o destaque (é a mais recente), sem som     |
| Há outros compartilhamentos              | A própria tela entra nas miniaturas/destaque pelas regras da T05   |
| Legenda e miniatura da própria tela      | `<nome> (você)` — ex.: `Ana (você)`                               |
| Aviso                                    | `Você está compartilhando sua tela` continua como na T05           |

## Destaque: dica do atalho

| Elemento | Texto / comportamento                                                                 |
|----------|---------------------------------------------------------------------------------------|
| Dica     | `Aperte / para escrever um recado` — abaixo da imagem em destaque, junto da legenda; só em aparelhos com mouse/trackpad (`(pointer: fine)`) |

## Campo de recado

| Elemento / tecla      | Texto / comportamento                                                          |
|-----------------------|--------------------------------------------------------------------------------|
| Abrir                 | `/` com a aba em foco, o ponteiro sobre a imagem e fora de outro campo de texto; Ctrl/Alt/⌘ + `/` não abre |
| Posição               | Canto superior esquerdo do campo no ponto do ponteiro, empurrado para dentro da imagem se passar da borda |
| Campo                 | `<input type="text">` de uma linha, já com foco; `aria-label` `Recado`         |
| Contador              | `Faltam N caracteres`; com 1: `Falta 1 caractere`; com 0: `Faltam 0 caracteres` |
| Limite                | 100 caracteres (cada símbolo visível conta 1). Com 100, teclas que escrevem não têm efeito (o caractere nem aparece); apagar e mover o cursor continuam funcionando. Colar ou soltar texto insere só o que cabe. Com texto selecionado, digitar substitui a seleção se o resultado couber |
| Enter                 | Fecha o campo; o recado fica até completar 8 s                                 |
| Clicar fora / trocar de aba | Igual ao Enter                                                           |
| Esc (ou sair da tela cheia com o campo aberto) | Fecha o campo e apaga o recado para todos             |
| `/` dentro do campo   | É só um caractere                                                              |

## Recado na imagem

| Elemento | Texto / comportamento                                                                  |
|----------|----------------------------------------------------------------------------------------|
| Conteúdo | Nome em negrito por estilo (não por marcação) + texto, ex.: **Bruno** olha aqui — ambos por `textContent` |
| Posição  | Ponto `x`, `y` da área da imagem; caixa empurrada para dentro da imagem se passar da borda |
| Sobreposição | O mais recente por cima                                                           |
| Tela cheia | Os recados aparecem também (a camada está dentro do contêiner em tela cheia)         |
| Leitores de tela | Sem `aria-live`: o texto muda a cada tecla e seria anunciado sem parar        |

## Mensagens (área `#mensagem`, só para a própria pessoa)

| Situação                     | Texto                                                                   |
|------------------------------|-------------------------------------------------------------------------|
| Não foi possível enviar      | `Não foi possível enviar o recado. Verifique sua conexão e tente de novo.` |
