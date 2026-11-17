# Research: T06 · Escolher a qualidade do compartilhamento

Parte da base da T05 ([../005-compartilhar-tela/research.md](../005-compartilhar-tela/research.md)):
captura com `getDisplayMedia`, canal `telaVideo` por posição, envio só para quem assiste,
`contentHint = "motion"`. **Nenhuma dependência nova e nenhuma mudança no servidor ou no
protocolo** — a qualidade é só de quem compartilha.

## 1. Onde a qualidade é aplicada

- **Decision**: em dois pontos, sempre juntos:
  1. **Captura** — restrições da trilha: `width: { max: L }`, `height: { max: A }`,
     `frameRate: { ideal: Q, max: Q }`. Na primeira captura, dentro de `getDisplayMedia`; durante
     o compartilhamento, com `trilhaTela.applyConstraints(...)`.
  2. **Envio** — parâmetros do canal `telaVideo` de cada par que assiste:
     `sender.setParameters()` com `encodings[0].maxFramerate = Q`, `maxBitrate` da qualidade e
     `scaleResolutionDownBy = 1`, e `degradationPreference = "maintain-framerate"`.
- **Rationale**: as restrições da captura definem a resolução e o limite de quadros que saem da
  tela (só reduzem, nunca aumentam — FR-005), e `applyConstraints` muda a trilha **em uso**, sem
  nova escolha de tela nem troca de trilha (FR-006). Só a captura não basta: o codificador do
  navegador usa um teto padrão de taxa de bits que, em 1080p a 60 fps, pode levá-lo a derrubar
  resolução/quadros mesmo com internet boa (o valor exato varia entre navegadores e é conferido no
  roteiro manual); por isso o envio recebe uma taxa máxima
  proporcional à qualidade. `maintain-framerate` implementa a clarificação (manter fluidez,
  reduzir resolução) em todas as opções.
- **Alternatives considered**: parar e recapturar com novas restrições (abre a escolha de tela de
  novo — contraria FR-006); só `scaleResolutionDownBy`/`maxFramerate` no envio, capturando sempre
  no máximo (gasta CPU capturando 60 fps à toa e não garante o limite do lado da captura); trocar
  de trilha por um `<canvas>` redimensionado (complexo e pesado).

## 2. Valores de cada qualidade

| Id        | Nome exibido      | Resolução máx. | Quadros/s | Taxa máxima |
|-----------|-------------------|----------------|-----------|-------------|
| `720p30`  | `720p · 30 fps`   | 1280×720       | 30        | 2,5 Mbit/s  |
| `1080p30` | `1080p · 30 fps`  | 1920×1080      | 30        | 4 Mbit/s    |
| `1080p60` | `1080p · 60 fps`  | 1920×1080      | 60        | 6 Mbit/s    |

- **Decision**: tabela fixa num módulo puro (`qualidades.js`); padrão `1080p30` (FR-003).
- **Rationale**: taxas usuais de transmissão de tela/jogo nessas resoluções; suficientes para
  texto legível (SC-004 da T05) sem exigir upload excessivo por pessoa que assiste.
- **Alternatives considered**: deixar a taxa sem limite (o navegador continuaria no teto padrão);
  taxas mais altas (multiplicadas por até 5 pessoas assistindo, estouram o upload doméstico).

## 3. Quando aplicar os parâmetros de envio

- **Decision**: aplicar `setParameters` no canal `telaVideo` de um par sempre que a trilha da tela
  passa a ser enviada para ele (em `aplicarEnvioTela`) e, para todos os pares que estão recebendo,
  quando a qualidade muda. Se a conexão ainda não terminou a negociação (`encodings` vazio),
  ignorar o erro e reaplicar quando `connectionState` virar `connected`.
- **Rationale**: os parâmetros pertencem a cada envio; aplicar só onde há envio evita trabalho
  inútil e cobre quem começa a assistir depois de uma troca de qualidade.

## 4. Falha ao aplicar

- **Decision**: `mudarQualidade(q)` chama `applyConstraints`; se ele rejeitar
  (`OverconstrainedError` ou outro), a trilha continua com as restrições anteriores (garantido pela
  especificação de `applyConstraints`), a função rejeita, e a interface mostra a mensagem de FR-008
  e volta a seleção para a qualidade ativa. Erros de `setParameters` não são mostrados (a captura
  já está na qualidade certa; o envio é refeito ao conectar).
- **Rationale**: só a captura é uma falha que a pessoa precisa saber; o resto se corrige sozinho.

## 5. Mostrar a qualidade ativa

- **Decision**: depois de começar ou trocar, ler `trilhaTela.getSettings()` (`width`, `height`) e
  montar o texto com a função pura `descreverQualidadeAtiva(qualidade, { largura, altura })`:
  - normal → `Qualidade: 1080p · 60 fps`;
  - limitada pela tela (largura **e** altura reais abaixo do máximo da qualidade, ou seja, a tela é
    menor nos dois sentidos) → `Qualidade: 1366×768 · 30 fps (limitada pelo tamanho da tela)`.
  O texto aparece junto do aviso "Você está compartilhando sua tela" (área da tela, T05).
- **Rationale**: como a redução mantém a proporção, numa tela maior que a qualidade pelo menos um
  lado bate no máximo (ex.: ultrawide 3440×1440 → 1920×804); só quando **nenhum** bate a tela é
  menor que a qualidade. As reduções momentâneas por internet não aparecem (decisão da spec).
- **Alternatives considered**: ler `getStats()` periodicamente para mostrar o que sai de fato
  (mostraria quedas momentâneas, que a spec decidiu não mostrar; mais código).

## 6. Escolha e preferência na interface

- **Decision**: `<select>` com as três qualidades logo depois do botão de compartilhar, sempre
  visível quando o navegador permite compartilhar (oculto junto com o botão indisponível — FR-010).
  Mudar antes de compartilhar só guarda a preferência; mudar durante chama `mudarQualidade`. A
  preferência fica no `localStorage` em `qualidadeCompartilhamento`; valor desconhecido → padrão.
- **Rationale**: duas interações no máximo (SC-004); um controle nativo é acessível e simples.
- **Alternatives considered**: menu próprio (mais código); escolher na hora de compartilhar via
  diálogo (mais um passo antes de cada compartilhamento).

## 7. Testes

- **Decision**:
  - Unitários de `qualidades.js`: tabela (ids, nomes, valores), padrão, busca com valor
    desconhecido, restrições de captura, parâmetros de envio, descrição normal e limitada.
  - Unitários de `midia.js` (navegador falso da T05 ampliado com `navigator.mediaDevices`,
    `applyConstraints`, `getSettings`, `getParameters`/`setParameters`): a captura usa as
    restrições da qualidade; `mudarQualidade` aplica restrições na trilha **sem** nova captura e
    atualiza os parâmetros de envio de quem assiste; falha de `applyConstraints` rejeita e mantém a
    qualidade anterior; quem passa a assistir recebe os parâmetros da qualidade atual.
  - Manual: estatísticas do navegador (`chrome://webrtc-internals` ou `about:webrtc`) para
    resolução e quadros por segundo; banda limitada nas ferramentas do navegador para SC-007.
