# Research: T04 · Ativar a webcam

Parte da base da T03 ([../003-conversar-por-voz/research.md](../003-conversar-por-voz/research.md)):
conexão WebRTC direta em malha, só STUN, sinalização pelo WebSocket da sala, estado de mídia na
lista `participantes`. **Nenhuma dependência npm nova.**

## 1. Como o vídeo chega aos outros

- **Decision**: reaproveitar as mesmas conexões da T03. Cada conexão passa a ter **dois**
  transceptores, um de áudio e um de vídeo, ambos `sendrecv`, criados pelo iniciador antes da
  oferta. Ligar/desligar a câmera é `replaceTrack(trilhaCamera)` / `replaceTrack(null)` no
  transceptor de vídeo — **sem renegociar**, igual ao microfone. Os transceptores passam a ser
  localizados **pelo tipo** (`receiver.track.kind`), não pela posição.
- **Rationale**: nenhuma conexão nova, nenhuma oferta extra ao ligar a câmera (Princípio I); a
  troca de trilha é imediata. Com no máximo 6 pessoas, cada navegador envia até 5 vídeos e recebe
  até 5, o que cabe numa internet doméstica com a qualidade da §4.
- **Alternatives considered**: conexão separada só para vídeo (dobra a sinalização); adicionar o
  transceptor de vídeo só ao ligar a câmera (exige renegociação e o padrão "perfect negotiation",
  que a T03 evitou de propósito); servidor de mídia (rejeitado na T03).

## 2. Quando o quadro aparece e some (FR-006, FR-008)

- **Decision**: o quadro de uma pessoa existe **se e só se** a lista `participantes` diz
  `camera: true` para ela. O cliente envia `camera { ligada }` ao servidor, que guarda o estado e
  reenvia a lista para todos (igual ao microfone na T03). Ao desligar, o cliente **primeiro** para
  a trilha e a tira das conexões, **depois** avisa o servidor.
- **Rationale**: só tirar a trilha (`replaceTrack(null)`) faz o vídeo remoto congelar no último
  quadro, sem sumir; a lista é a fonte de verdade que já chega a todos em ≤ 3 s (FR-006) e já
  entrega o estado correto a quem entra (FR-007). Parar a trilha antes garante que nenhuma imagem
  nova sai mesmo durante o intervalo.
- **Alternatives considered**: detectar o fim do vídeo pelos eventos `mute`/`unmute` da trilha
  remota (demoram e variam entre navegadores); mensagem só entre os pares via sinal (o servidor não
  saberia o estado para quem entra depois).

## 3. Indicador de câmera na lista (FR-016)

- **Decision**: o mesmo campo `camera` da lista alimenta o indicador ao lado do de microfone: 📷
  com destaque quando ligada; 📷 esmaecido e riscado quando desligada; `aria-label`/`title`
  "câmera ligada" / "câmera desligada".
- **Rationale**: uma só fonte de verdade para o quadro e para o indicador; mesmo padrão visual e de
  acessibilidade do microfone.

## 4. Captura e qualidade (voz com prioridade)

- **Decision**: `getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 360 },
  frameRate: { ideal: 15, max: 24 } } })`, sem áudio (o microfone continua separado — FR-009).
  Nenhum limite manual de taxa de bits.
- **Rationale**: 640×360 a ~15 quadros/s fica tipicamente entre 300 e 600 kbit/s por destino, o
  suficiente para ver o rosto; 5 envios cabem em ~3 Mbit/s de upload. O controle de congestionamento
  do navegador reduz o vídeo antes do áudio (Opus é pequeno e adaptativo), atendendo "voz tem
  prioridade" sem código extra (Princípio I).
- **Alternatives considered**: `setParameters` com `maxBitrate` e `priority` por envio (mais
  código, depende de a negociação já ter terminado; fica para quando houver problema medido);
  resolução maior (estoura o upload com 5 envios).

## 5. Mostrar o vídeo

- **Decision**: para cada par, a trilha de vídeo recebida vai para um `<video autoplay muted
  playsinline>` guardado no par; o áudio continua no `<audio>` da T03. A própria imagem usa outro
  `<video muted>` com a trilha local, espelhado por CSS (`transform: scaleX(-1)`). O `app.js`
  monta os quadros (vídeo + nome) a partir de uma função pura `quadrosDeVideo(lista, idVoce,
  idsComFalha)`.
- **Rationale**: vídeo sem som nunca é bloqueado pela regra de reprodução automática, então não
  precisa de "Ativar som" para vídeo; separar áudio e vídeo evita som duplicado. A função pura deixa
  testável quem tem quadro, em que ordem e com que rótulo.
- **Alternatives considered**: um único `<video>` com áudio e vídeo (a reprodução com som seria
  bloqueada junto com a imagem).

## 6. Arquivos: de "voz" para "mídia"

- **Decision**: renomear `public/js/voz.js` → `public/js/midia.js` (`criarVoz` → `criarMidia`) e
  `public/js/voz-regras.js` → `public/js/midia-regras.js`; `classificarErroMicrofone` →
  `classificarErroCaptura`, com o tipo `"semMicrofone"` passando a `"semDispositivo"` (vale para
  microfone e câmera). Testes renomeados junto.
- **Rationale**: o módulo passa a cuidar de microfone e câmera; manter o nome "voz" enganaria quem
  lê (Princípio II). A classificação de erros é a mesma para os dois dispositivos.
- **Alternatives considered**: módulo separado para câmera (duplicaria pares, fila de sinais e
  transceptores, que são compartilhados).

## 7. Erros da câmera

- **Decision**: mesma tabela da T03 §6 via `classificarErroCaptura`, com textos próprios da câmera
  ([contracts/ui.md](contracts/ui.md)). Trilha de vídeo que termina sozinha (`ended`) → câmera
  desligada, `camera { ligada: false }` e mensagem de desconexão. Falha de conexão com um par
  (`failed`, já detectada na T03) → o quadro dessa pessoa mostra nome + "Não foi possível mostrar
  o vídeo de <nome>…" enquanto ela estiver com a câmera ligada (FR-013).
- **Rationale**: reaproveita o que já existe; nenhuma falha silenciosa (Princípio IV).

## 8. Recarregar e sair

- **Decision**: na substituição de conexão (T02/T03), o servidor também zera `cameraLigada`. Ao
  encerrar a mídia (sair, erro de sala, `pagehide`), a trilha de vídeo é parada (luz da câmera
  apaga — FR-014). A saída da pessoa a remove da lista, então o quadro dela some para todos.
- **Rationale**: mesmo caminho do microfone; FR-001 e FR-006 cobertos pela lista.

## 9. Testes

- **Decision**:
  - Unitários: `quadrosDeVideo` (só câmera ligada, ordem da lista, "(você)", falha), indicador de
    câmera em `participantes.js`, `classificarErroCaptura`, `salas.js` (`definirCamera`, zera na
    substituição, `listar` com `camera`).
  - Integração: `camera { ligada }` atualiza a lista de todos; quem entra depois vê o estado;
    `ligada` não booleana ou antes de `entrar` → `mensagem-invalida`; substituição zera a câmera;
    câmera e microfone independentes na lista.
  - Manual: captura real, vídeo entre navegadores, espelhamento, permissão negada, 6 câmeras.
- **Rationale**: igual à T03 — lógica principal automatizada (Princípio III); WebRTC/câmera reais
  no roteiro manual.
