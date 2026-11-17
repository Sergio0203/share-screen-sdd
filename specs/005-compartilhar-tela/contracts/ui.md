# Contrato de Interface (versão T05, textos em pt-BR)

Estende [../../004-ativar-webcam/contracts/ui.md](../../004-ativar-webcam/contracts/ui.md).
Todos os textos vêm de `public/js/textos.js`.

## Sala: botão de compartilhar

| Elemento                      | Texto / comportamento                                                  |
|-------------------------------|------------------------------------------------------------------------|
| Botão (sem compartilhar)      | `Compartilhar tela`; no topo da sala, depois do botão de câmera        |
| Botão (escolhendo)            | `Escolhendo o que compartilhar…` (desabilitado)                        |
| Botão (compartilhando)        | `Parar de compartilhar`; visual destacado (`aria-pressed="true"`)       |
| Aviso para quem compartilha   | `Você está compartilhando sua tela` (visível enquanto compartilha)      |
| Navegador sem suporte         | botão desabilitado + texto ao lado: `Seu navegador não permite compartilhar a tela. Para compartilhar, use um computador com Chrome, Edge ou Firefox. Você continua podendo assistir.` |

## Sala: área da tela compartilhada (acima das câmeras)

| Elemento                 | Texto / comportamento                                                          |
|--------------------------|--------------------------------------------------------------------------------|
| Área                     | oculta quando não há compartilhamento de outras pessoas                        |
| Destaque                 | vídeo na largura total da sala, proporção original (sem cortar nem esticar)    |
| Legenda do destaque      | `<nome>`; com som ausente: `<nome> · sem som`                                   |
| Botão de tela cheia      | `Tela cheia`; só aparece se o navegador permitir; Esc sai                      |
| Destaque com falha       | `Não foi possível mostrar a tela de <nome>. Verifique sua conexão.`             |
| Miniaturas               | abaixo do destaque; botão por compartilhamento com `🖥️ <nome>` (e ` · sem som`); `title`/`aria-label` `Ver a tela de <nome>`; clique troca o destaque |

## Mensagens (área `#mensagem`, só para a própria pessoa)

| Situação                                  | Texto                                                                                  |
|-------------------------------------------|----------------------------------------------------------------------------------------|
| Permissão negada (sistema)                | `Não conseguimos compartilhar sua tela. Verifique se o navegador tem permissão para gravar a tela nas configurações do computador e tente de novo.` |
| Falha ao começar                          | `Não foi possível compartilhar sua tela. Tente de novo.`                                |
| Cancelou a escolha                        | nenhuma mensagem                                                                       |

- Mensagens de compartilhamento somem quando o compartilhamento começa com sucesso.
- Nenhuma dessas mensagens aparece para as outras pessoas (FR-012).
