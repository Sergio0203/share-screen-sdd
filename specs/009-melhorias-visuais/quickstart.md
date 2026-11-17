# Quickstart: validar a T09

## Pré-requisitos

- Node.js 22+, `npm install` feito.
- Dois navegadores (ou uma janela normal e uma anônima) com câmera e microfone; para SC-005, até 6
  janelas.

## Testes automatizados

```sh
npm test            # todos devem passar (SC-009); quadros.test.js já com a regra nova (SC-010)
npm run format:check
```

## Subir o site

```sh
npm start           # http://localhost:3000
```

## Roteiro visual

Referências: [contracts/ui.md](contracts/ui.md), [research.md](research.md).

1. **Identidade (US1, SC-001)**: abra `/`. Fundo quase preto com brilho vinho no topo, cabeçalho com
   logo e "Telão", frase "Compartilhe sua tela com os amigos, com voz e câmera.", botão "Criar sala"
   vermelho. Recarregue com cache vazio: nenhum "flash" branco. A aba mostra "Telão" e o logo.
2. **Telas de erro**: abra `/sala/inexistente` ("Esta sala não existe…"); encha uma sala com 6
   pessoas e tente a 7ª ("Sala cheia"); abra a mesma sala em duas abas ("aberta em outra aba");
   pare o servidor com a sala aberta ("Você perdeu a conexão…"). Todas na mesma paleta, com
   cabeçalho. Nenhum azul ou cinza claro em lugar nenhum.
3. **Contraste (SC-002)**: com a ferramenta de contraste do navegador (DevTools → inspecionar texto
   → "Contrast"), confira texto principal, texto suave, botão principal (texto branco sobre o
   degradê), dica dos controles, legenda dos quadros e nome no recado: ≥ 4,5:1; ícones ≥ 3:1.
4. **Ícones (US2, SC-003)**: na sala, passe o mouse e depois use Tab em cada controle da barra:
   dica com o nome atual aparece nos dois casos. Ligue/desligue microfone, câmera e compartilhamento:
   ícone e dica mudam. Com leitor de tela (VoiceOver: ⌘F5), cada controle é anunciado uma vez, com
   o nome em pt-BR. Na lista, ícones de microfone/câmera iguais aos da barra, coroa no anfitrião,
   monitor em quem compartilha.
5. **Carregamento (FR-009)**: clique "Ligar câmera" e deixe o pedido de permissão aberto: ícone
   girando, dica "Ligando câmera…". Clique "Criar sala" com a rede lenta (DevTools → Slow 3G):
   ícone girando antes de "Criando sala…".
6. **Avatar (FR-017, SC-010)**: com 3 pessoas, só uma com câmera ligada. Todas têm quadro: vídeo
   para quem ligou, avatar com a inicial para as outras. Desligue a câmera: em até 3 s, nas outras
   janelas, o vídeo vira avatar com cross-fade, sem imagem congelada. Uma pessoa com nome "🎮 Léo"
   mostra 🎮. Alguém sai: o quadro some com animação.
7. **Animações (US3, SC-004)**: percorra criar → nome → sala → ligar mídia → compartilhar → tela
   cheia → recado → sair. Cada mudança anima de forma curta (≤ 0,4 s); trocar o microfone de alguém
   **não** faz os outros quadros e itens da lista animarem de novo. Mensagens aparecem no topo sem
   empurrar a página (FR-012).
8. **Movimento reduzido (SC-006)**: ative "Reduzir movimento" (macOS: Ajustes → Acessibilidade →
   Tela). Repita o passo 7: nada desliza nem muda de escala; o recado ainda some com fade de 1 s.
9. **Fluidez (SC-005)**: com 6 janelas, câmeras ligadas, um compartilhando e voz ativa, grave 10 s
   no DevTools → Performance enquanto liga/desliga câmeras e passa o mouse na barra. Sem quadros
   longos (> 50 ms) causados por estilo/layout; vídeo e voz sem cortes.
10. **Layout (US4, SC-007)**: DevTools → modo responsivo, de 360 px a 1920 px. Nada sobreposto,
    sem rolagem horizontal, barra de controles sempre visível e sem cobrir conteúdo no fim da
    página. Tela cheia: só imagem e recados.
11. **Recados (FR-015)**: repita o roteiro da T08 ([../008-recado-segue-cursor/quickstart.md](../008-recado-segue-cursor/quickstart.md))
    sobre uma imagem clara e uma escura: comportamento igual, balão legível nas duas.
