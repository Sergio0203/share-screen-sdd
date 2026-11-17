# Contrato de Interface (versão T04, textos em pt-BR)

Estende [../../003-conversar-por-voz/contracts/ui.md](../../003-conversar-por-voz/contracts/ui.md).
Todos os textos vêm de `public/js/textos.js`.

## Sala: controle da câmera

| Elemento                   | Texto / comportamento                                                  |
|----------------------------|------------------------------------------------------------------------|
| Botão (desligada)          | `Ligar câmera`; no topo da sala, ao lado do botão de microfone         |
| Botão (ligada)             | `Desligar câmera`; visual destacado (`aria-pressed="true"`)            |
| Botão (pedindo permissão)  | `Ligando câmera…` (desabilitado)                                       |

## Sala: área de vídeos

| Elemento                  | Texto / comportamento                                                       |
|---------------------------|-----------------------------------------------------------------------------|
| Área de vídeos            | entre o topo (link e botões) e a lista; oculta quando ninguém tem câmera ligada |
| Quadro                    | vídeo 16:9 + nome sobreposto embaixo; nomes longos cortados com `…`         |
| Próprio quadro            | rótulo `<nome> (você)`; imagem espelhada                                     |
| Quadro com falha (FR-013) | sem vídeo; nome + `Não foi possível mostrar o vídeo de <nome>. Verifique sua conexão.` |
| Disposição                | grade que se ajusta: até 6 quadros visíveis juntos, sem rolagem lateral      |

## Sala: lista de participantes

| Elemento              | Texto / comportamento                                                          |
|-----------------------|--------------------------------------------------------------------------------|
| Indicador de câmera   | ao lado do de microfone: 📷 destacado (ligada) / 📷 esmaecido e riscado (desligada); `aria-label` e `title` `câmera ligada` / `câmera desligada` |

## Mensagens (área `#mensagem`, só para a própria pessoa)

| Situação                            | Texto                                                                                     |
|-------------------------------------|-------------------------------------------------------------------------------------------|
| Permissão negada ou bloqueada       | `Não conseguimos usar sua câmera. Para liberar, clique no ícone de cadeado ao lado do endereço do site, permita a câmera e clique em 'Ligar câmera' de novo.` |
| Nenhuma câmera encontrada           | `Não encontramos nenhuma câmera. Conecte uma câmera e tente de novo.`                      |
| Falha ao ligar                      | `Não foi possível ligar sua câmera. Feche outros programas que possam estar usando a câmera e tente de novo.` |
| Câmera desconectada durante o uso   | `Sua câmera foi desconectada. Verifique a câmera e clique em 'Ligar câmera' de novo.`      |

- Mensagens de câmera somem quando a câmera liga com sucesso.
- Nenhuma dessas mensagens aparece para as outras pessoas (FR-012).
