# Research: T05 · Compartilhar a tela

Parte da base da T03/T04 ([../004-ativar-webcam/research.md](../004-ativar-webcam/research.md)):
conexões WebRTC diretas em malha, só STUN, sinalização pelo WebSocket da sala, troca de trilha sem
renegociar, estado de mídia na lista `participantes`. **Nenhuma dependência npm nova.**

## 1. Canais de cada conexão

- **Decision**: cada conexão passa a ter **quatro** transceptores, sempre na mesma ordem, criados
  pelo iniciador antes da oferta: `microfone` (áudio), `camera` (vídeo), `telaVideo` (vídeo) e
  `telaAudio` (áudio), todos `sendrecv`. O canal é identificado pela **posição** em
  `getTransceivers()` segundo a constante `CANAIS = ["microfone", "camera", "telaVideo",
  "telaAudio"]`; no evento `track`, pela posição de `evento.transceiver`. Compartilhar e parar é
  `replaceTrack`, sem renegociar.
- **Rationale**: com dois canais de vídeo, o tipo (`kind`) já não distingue câmera de tela. A ordem
  dos transceptores é a ordem das linhas da oferta nos dois lados (o respondedor os cria na ordem da
  oferta), então a posição é estável e conhecida. Mantém "sem renegociação" (T03 §4).
- **Alternatives considered**: identificar por `mid` (só existe depois da negociação; o iniciador
  troca trilhas antes); adicionar transceptores ao começar a compartilhar (exige renegociação);
  conexão separada para a tela (dobra sinalização e estados).
- **Mudança na T04**: `transceptorDe(conexao, tipo)` passa a `transceptorDe(conexao, canal)`.

## 2. Receber só o compartilhamento em destaque (FR-017)

- **Decision**: cada pessoa informa ao servidor qual compartilhamento tem em destaque com a mensagem
  `assistindo { id }` (`id` público de quem compartilha, ou `null`). O servidor guarda em
  `participante.assistindo` e o inclui na lista. Quem compartilha, a cada lista recebida, envia a
  trilha da tela **só** para os pares cujo `assistindo` é o próprio id (`replaceTrack(trilhaTela)`),
  e `replaceTrack(null)` para os demais.
- **Rationale**: o estado fica no mesmo lugar dos outros (lista), chega a quem entra depois e
  sobrevive a recarregar. Assim a internet de quem assiste recebe uma tela só, por mais que
  existam; e quem compartilha só envia para quem está olhando.
- **Alternatives considered**: avisar o compartilhador por `sinal` ponto a ponto (o estado se perde
  quando a conexão é refeita e exige reenvio); enviar tudo e só esconder (contraria a clarificação);
  pausar o envio via `setParameters({ active: false })` (mais código, mesmo efeito de `replaceTrack`).
- **Tempo**: começar = `tela` → lista → `assistindo` → lista → `replaceTrack` + primeiro quadro; duas
  idas e voltas ao servidor (~dezenas de ms) + negociação já feita → bem abaixo de 5 s (FR-003).
  Trocar destaque = `assistindo` → lista → `replaceTrack` → ≤ 2 s (FR-017).

## 3. Estado do compartilhamento e "mais recente"

- **Decision**: mensagem `tela { compartilhando, som }`. O servidor guarda
  `participante.tela = { inicio, som }` ou `null`; `inicio` é um **contador por sala** que cresce a
  cada novo compartilhamento (não o relógio do navegador). A lista leva `tela` de cada pessoa.
- **Rationale**: o contador do servidor dá uma ordem única e confiável para "o mais recente"
  (FR-018), sem depender de relógios diferentes. `som` vem do cliente (se a captura trouxe áudio) e
  alimenta a marca "sem som" (FR-019).
- **Alternatives considered**: horário do cliente (relógios desalinhados); ordem de chegada na lista
  (a lista é por ordem de entrada na sala, não de compartilhamento).

## 4. Escolha do destaque (função pura)

- **Decision**: `escolherDestaque(lista, idVoce, escolha)` → `{ destaque, miniaturas }`:
  compartilhamentos = participantes com `tela` ≠ `null`, **exceto** a própria pessoa (FR-004); se
  `escolha` ainda está compartilhando, ela é o destaque; senão, o de maior `inicio`; miniaturas = os
  demais, do mais recente ao mais antigo. A `escolha` (manual, por clique) fica no `app.js` e é
  esquecida quando aquele compartilhamento termina. Sempre que o destaque calculado muda, o cliente
  envia `assistindo`.
- **Rationale**: as regras de FR-017/FR-018 ficam num só lugar, testável sem navegador.

## 5. Captura da tela

- **Decision**: `navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 } },
  audio: { restrictOwnAudio: true }, selfBrowserSurface: "exclude", systemAudio: "include" })`.
  Trilha de vídeo com `contentHint = "motion"`. Se a captura vier sem trilha de áudio, `som = false`
  (sem erro). A escolha entre tela inteira e janela é a do próprio navegador (FR-002).
- **Rationale**: 30 quadros/s e `motion` priorizam fluidez para jogos (SC-004); o navegador reduz a
  resolução antes da fluidez quando a banda aperta. `restrictOwnAudio` pede para não capturar o som
  da própria aba (as vozes dos amigos), evitando que eles ouçam o próprio eco quando a tela inteira é
  compartilhada com som; onde o navegador não conhece a opção, ela é ignorada. `selfBrowserSurface:
  "exclude"` tira a própria aba da lista de escolha (evita o efeito "espelho infinito").
- **Alternatives considered**: limitar a taxa de bits com `setParameters` (fica para quando houver
  problema medido, como na T04); `contentHint = "detail"` (texto mais nítido, mas reduz a fluidez —
  pior para jogos).
- **Risco**: compartilhar com som a tela inteira num navegador sem `restrictOwnAudio` pode levar as
  vozes dos outros de volta a eles; verificado no roteiro manual (passo 9).

## 6. Erros, cancelamento e navegador sem suporte

- **Decision**:
  - Sem suporte: `typeof navigator.mediaDevices?.getDisplayMedia !== "function"` → botão
    desabilitado e a explicação de US3 visível ao lado dele, desde a entrada na sala (FR-010).
  - `classificarErroCompartilhamento(nome, mensagem)` (puro): `NotAllowedError` cuja mensagem cita o
    sistema (`/system/i`, caso do macOS sem "Gravação de Tela") → `"permissao"`; outro
    `NotAllowedError` ou `AbortError` → `"cancelado"` (nenhuma mensagem — FR-011); `NotFoundError`,
    `NotReadableError` e demais → `"falha"`.
  - Parar pelo navegador: evento `ended` da trilha de vídeo → mesmo caminho do botão (FR-005).
- **Rationale**: os navegadores usam `NotAllowedError` tanto para "cancelou" quanto para "negado";
  só a negação pelo sistema é distinguível, e é o caso que precisa de instrução. Tratar o resto
  como cancelamento evita erro falso ao cancelar.
- **Alternatives considered**: mostrar mensagem em todo `NotAllowedError` (erro ao simplesmente
  cancelar — contraria FR-011).

## 7. Destaque, miniaturas e tela cheia

- **Decision**: novo módulo de interface `public/js/area-tela.js` que monta, a partir de
  `escolherDestaque`: (a) o destaque — `<video>` com `object-fit: contain` (proporção original),
  legenda com o nome (+ " · sem som"), botão "Tela cheia" (só se `document.fullscreenEnabled`); (b)
  as miniaturas — botões com 🖥️ e o nome, que chamam `aoEscolher(id)`. Tela cheia =
  `containerDestaque.requestFullscreen()`; Esc é tratado pelo navegador; ao sumir o destaque com a
  tela cheia ativa, `document.exitFullscreen()` (FR-008). O vídeo/áudio vem de `midia.telaDe(id)`.
  A área fica **acima** das câmeras (FR-006). Quem compartilha vê "Você está compartilhando sua tela".
- **Rationale**: `app.js` já tem ~600 linhas; a área da tela é uma parte independente da sala e cabe
  num módulo próprio (Princípio II). Tela cheia no contêiner (não no `<video>`) mantém a legenda e
  permite o próprio botão "Sair" no futuro.

## 8. Recarregar, sair e falhas

- **Decision**: substituição de conexão zera `tela` e `assistindo`; sair remove a pessoa (e o
  compartilhamento) da lista; `encerrar()` da mídia para a trilha da tela. Par com falha
  (`aoFalharPar`, T03) que está no destaque → destaque mostra "Não foi possível mostrar a tela de
  <nome>…" (FR-014).
- **Rationale**: mesmos caminhos já usados para microfone e câmera.

## 9. Testes

- **Decision**:
  - Unitários: `escolherDestaque` (exclui a própria pessoa, mais recente, escolha mantida, escolha
    que terminou, miniaturas ordenadas, sem compartilhamentos); `classificarErroCompartilhamento`;
    `salas.js` (`definirTela` com contador crescente, `definirAssistindo`, zera na substituição,
    `listar` com `tela`/`assistindo`).
  - Integração: `tela` atualiza a lista de todos com `inicio` crescente entre compartilhamentos;
    `assistindo` vai na lista; validações (`compartilhando`/`som` não booleanos, `id` não texto nem
    `null`, antes de `entrar`) → `mensagem-invalida`; substituição zera.
  - Manual: captura real, janela de app, parar pelo navegador, tela cheia/Esc, dois compartilhando,
    som, celular, permissão do macOS.
