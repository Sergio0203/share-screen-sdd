# Contrato de Interface (versão T03, textos em pt-BR)

Estende [../../002-entrar-sala-link/contracts/ui.md](../../002-entrar-sala-link/contracts/ui.md).
Todos os textos vêm de `public/js/textos.js`. As demais telas não mudam.

## Sala: controle do microfone

| Elemento                    | Texto / comportamento                                                     |
|-----------------------------|---------------------------------------------------------------------------|
| Botão (desligado)           | `Ligar microfone`; sempre visível no topo da sala, junto ao link         |
| Botão (ligado)              | `Desligar microfone`; visual destacado (`aria-pressed="true"`)            |
| Botão (pedindo permissão)   | `Ligando microfone…` (desabilitado)                                       |
| Botão de som bloqueado      | `Ativar som`; aparece só quando o navegador bloqueia o áudio; some ao clicar |

## Sala: lista de participantes

| Elemento                 | Texto / comportamento                                                       |
|--------------------------|-----------------------------------------------------------------------------|
| Indicador de microfone   | ícone ao lado de cada nome: 🎤 ligado / 🔇 desligado; `aria-label` e `title` `microfone ligado` / `microfone desligado` |

## Mensagens (área `#mensagem`, só para a própria pessoa)

| Situação                              | Texto                                                                                   |
|---------------------------------------|-----------------------------------------------------------------------------------------|
| Permissão negada ou bloqueada         | `Não conseguimos usar seu microfone. Para liberar, clique no ícone de cadeado ao lado do endereço do site, permita o microfone e clique em 'Ligar microfone' de novo.` |
| Nenhum microfone encontrado           | `Não encontramos nenhum microfone. Conecte um microfone e tente de novo.`               |
| Falha ao ligar                        | `Não foi possível ligar seu microfone. Feche outros programas que possam estar usando o microfone e tente de novo.` |
| Microfone desconectado durante o uso  | `Seu microfone foi desconectado. Verifique o microfone e clique em 'Ligar microfone' de novo.` |
| Não consegue ouvir alguém (FR-014)    | `Não foi possível ouvir <nome>. Verifique sua conexão.`                                  |

- Mensagens de microfone somem quando o microfone liga com sucesso.
- Nenhuma dessas mensagens aparece para as outras pessoas (FR-012).
