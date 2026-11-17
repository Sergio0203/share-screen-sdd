# Contrato de Interface (versão T06, textos em pt-BR)

Estende [../../005-compartilhar-tela/contracts/ui.md](../../005-compartilhar-tela/contracts/ui.md).
Todos os textos vêm de `public/js/textos.js`. O protocolo WebSocket não muda (ver
[../../005-compartilhar-tela/contracts/websocket.md](../../005-compartilhar-tela/contracts/websocket.md)).

## Sala: escolha de qualidade

| Elemento                 | Texto / comportamento                                                       |
|--------------------------|-----------------------------------------------------------------------------|
| Seletor                  | `<select>` logo depois do botão `Compartilhar tela`; `aria-label` e `title` `Qualidade do compartilhamento` |
| Opções                   | `720p · 30 fps`, `1080p · 30 fps`, `1080p · 60 fps`                          |
| Valor inicial            | última qualidade usada neste navegador; sem histórico, `1080p · 30 fps`      |
| Navegador sem suporte    | seletor oculto (o botão já fica indisponível com a explicação da T05)        |
| Durante a troca          | seletor desabilitado até a troca terminar                                    |

## Sala: qualidade ativa (só para quem compartilha)

| Situação                     | Texto (junto de `Você está compartilhando sua tela`)                     |
|------------------------------|---------------------------------------------------------------------------|
| Normal                       | `Qualidade: <nome>` — ex.: `Qualidade: 1080p · 60 fps`                    |
| Tela menor que a qualidade   | `Qualidade: <largura>×<altura> · <qps> fps (limitada pelo tamanho da tela)` — ex.: `Qualidade: 1366×768 · 30 fps (limitada pelo tamanho da tela)` |

## Mensagens (área `#mensagem`, só para a própria pessoa)

| Situação                            | Texto                                                                     |
|-------------------------------------|---------------------------------------------------------------------------|
| Não foi possível aplicar a qualidade | `Não foi possível usar essa qualidade. O compartilhamento continua na qualidade anterior.` |
