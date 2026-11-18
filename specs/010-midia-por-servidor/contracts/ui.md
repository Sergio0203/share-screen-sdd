# Contrato de Interface (versão T10)

Estende [../../009-melhorias-visuais/contracts/ui.md](../../009-melhorias-visuais/contracts/ui.md).
**Nada muda na aparência nem nos textos**, exceto o abaixo.

## Texto novo

| Chave (`TEXTOS`) | Texto |
|------------------|-------|
| `midiaIndisponivel` | `Não foi possível conectar voz, câmera e tela. Tentando de novo…` |

## Servidor de mídia indisponível (FR-007, FR-008)

| Elemento | Comportamento |
|----------|---------------|
| Mensagem | aviso flutuante de erro (T09), fica visível enquanto o estado for `indisponivel`; some sozinho quando a mídia volta |
| Microfone / Câmera / Compartilhar **desligados** | `disabled`, ícone a 40% (aparência "indisponível" da T09); dica e `aria-label` inalterados |
| Microfone / Câmera / Compartilhar **ligados** | continuam clicáveis, só para desligar |
| Qualidade | continua funcionando (só muda a captura local) |
| Ativar som, lista, link, recados, tela cheia | sem mudança |
| Ao voltar | botões voltam ao normal; o que estava ligado volta a ser transmitido sem clique |

Entre entrar na sala e a primeira conexão com o servidor de mídia (`conectando`), os botões de ligar
também ficam indisponíveis, sem mensagem (normalmente < 1 s).
