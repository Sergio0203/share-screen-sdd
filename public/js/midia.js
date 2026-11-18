import {
  FONTES,
  assinaturasDesejadas,
  podeLigar,
  proximoEstadoMidia,
  trilhasParaPublicar,
} from "./midia-estado.js";
import { parametrosDeEnvio, qualidadePorId, restricoesDeCaptura } from "./qualidades.js";

// Voz, vídeo e tela pelo servidor de mídia (LiveKit): cada pessoa envia uma cópia de cada mídia ao
// servidor, que repassa aos outros da sala. A captura é a mesma de antes; a sala do LiveKit é
// criada por `criarSala` (em app.js, `new Room(...)` de livekit-client.js), o que deixa este módulo
// testável sem a biblioteca. Decisões em specs/010-midia-por-servidor/research.md §5–§9 (e, para a
// captura, specs/003-conversar-por-voz, 004-ativar-webcam, 005-compartilhar-tela e
// 006-qualidade-compartilhamento).

// Qualidade moderada: dá para ver o rosto, e 6 câmeras cabem numa internet doméstica (T04 §4).
const OPCOES_CAMERA = {
  video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 24 } },
};

// O som vai junto quando o navegador permitir, sem o som da própria aba (as vozes dos amigos), e a
// própria aba não aparece na escolha (T05 research §5). Os limites do vídeo vêm da qualidade
// escolhida (T06).
const OPCOES_TELA = {
  audio: { restrictOwnAudio: true },
  selfBrowserSurface: "exclude",
  systemAudio: "include",
};

const OPCOES_MICROFONE = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

// Uma qualidade só por mídia (FR-002a): nada de camadas para adaptar por quem assiste. As trilhas
// são capturadas e paradas por este módulo, não pelo LiveKit (research §8).
export const OPCOES_SALA = {
  adaptiveStream: false,
  dynacast: true,
  stopLocalTrackOnUnpublish: false,
};

// Cada navegador escolhe o que recebe (research §6); falhas de conexão aparecem em até ~10 s.
export const OPCOES_CONEXAO = {
  autoSubscribe: false,
  websocketTimeout: 5000,
  peerConnectionTimeout: 5000,
};

// Queda curta (< 3 s) não vira mensagem; fora do ar, nova tentativa a cada 3 s (research §9).
const ESPERA_RECONECTANDO_MS = 3000;
const INTERVALO_TENTATIVAS_MS = 3000;

// Nomes dos eventos da sala do LiveKit (valores de `RoomEvent`).
const EVENTOS = {
  reconectando: "reconnecting",
  sinalReconectando: "signalReconnecting",
  reconectou: "reconnected",
  desconectou: "disconnected",
  trilhaPublicada: "trackPublished",
  trilhaAssinada: "trackSubscribed",
  trilhaDesassinada: "trackUnsubscribed",
  falhaAoAssinar: "trackSubscriptionFailed",
  pessoaSaiu: "participantDisconnected",
};

export function criarMidia({
  criarSala,
  aoMudarSomBloqueado = () => {},
  aoFalharRecepcao = () => {},
  aoMicrofoneEncerrado = () => {},
  aoCameraEncerrada = () => {},
  aoChegarVideo = () => {},
  aoTelaEncerrada = () => {},
  // Pede ao app uma permissão nova (mensagem `pedir-midia`); a resposta chama `conectar` de novo.
  pedirPermissao = () => {},
  aoMudarEstadoMidia = () => {},
  agendar = setTimeout,
  cancelar = clearTimeout,
}) {
  // Trilhas capturadas por esta página; null quando desligadas.
  const trilhas = { microfone: null, camera: null, tela: null, somTela: null };
  // Própria imagem, mostrada só para a própria pessoa (T04 FR-005).
  let previaLocal = null;
  // Prévia muda da própria tela, para quem compartilha vê-la no destaque (T07).
  let previaTela = null;
  let qualidadeTela = null;
  // Elementos de som e imagem recebidos, por identidade (= id público na lista de participantes):
  // { audio, video, tela: { video, audio } }. Reaproveitados para não piscar nem reiniciar.
  const recebidos = new Map();
  let meuId = null;
  // Compartilhamento que esta pessoa tem em destaque: só a tela dele é recebida.
  let assistindo = null;
  let sala = null;
  // Conexão com o servidor de mídia (data-model.md "Conexão de mídia").
  let estado = "conectando";
  let temporizador = null;
  // As trilhas locais não dependem da conexão: numa queda, continuam capturadas e voltam a ser
  // publicadas quando o servidor de mídia volta (clarificação Q4).
  const conectada = () => estado === "conectada";
  const encerrada = () => estado === "encerrada";

  // ---------- Conexão com o servidor de mídia ----------

  async function conectar(url, token) {
    if (estado !== "conectando") return;
    sala ??= prepararSala();
    try {
      await sala.connect(url, token, OPCOES_CONEXAO);
    } catch {
      mudarEstado("falhou");
      return;
    }
    if (encerrada()) {
      sala.disconnect();
      return;
    }
    mudarEstado("conectou");
    for (const { fonte, trilha } of trilhasParaPublicar(trilhas)) publicar(fonte, trilha);
    reaplicarAssinaturas();
  }

  // Aplica um evento à conexão e faz o que o novo estado pede: esperar 3 s numa queda, tentar de
  // novo a cada 3 s fora do ar (research §9).
  function mudarEstado(evento) {
    const anterior = estado;
    estado = proximoEstadoMidia(estado, evento);
    if (estado === anterior) return;
    cancelar(temporizador);
    temporizador = null;
    if (estado === "reconectando") {
      temporizador = agendar(() => mudarEstado("passaram3s"), ESPERA_RECONECTANDO_MS);
    }
    if (estado === "indisponivel") {
      // O LiveKit também tenta sozinho; a partir daqui só a tentativa do app vale, com permissão nova.
      // `false`: sem isso o LiveKit pararia as trilhas capturadas, que precisam voltar depois.
      if (anterior === "reconectando") sala.disconnect(false);
      temporizador = agendar(() => {
        mudarEstado("tentar");
        pedirPermissao();
      }, INTERVALO_TENTATIVAS_MS);
    }
    aoMudarEstadoMidia(estado);
  }

  function prepararSala() {
    const nova = criarSala(OPCOES_SALA);
    nova.on(EVENTOS.reconectando, () => mudarEstado("reconectando"));
    nova.on(EVENTOS.sinalReconectando, () => mudarEstado("reconectando"));
    nova.on(EVENTOS.reconectou, () => mudarEstado("reconectou"));
    nova.on(EVENTOS.desconectou, () => mudarEstado("desconectou"));
    nova.on(EVENTOS.trilhaPublicada, () => reaplicarAssinaturas());
    nova.on(EVENTOS.trilhaAssinada, (trilha, publicacao, pessoa) =>
      receber(pessoa.identity, publicacao.source, trilha.mediaStreamTrack),
    );
    nova.on(EVENTOS.trilhaDesassinada, (_trilha, publicacao, pessoa) =>
      soltar(pessoa.identity, publicacao.source),
    );
    nova.on(EVENTOS.falhaAoAssinar, (_idTrilha, pessoa) => aoFalharRecepcao(pessoa.identity));
    nova.on(EVENTOS.pessoaSaiu, (pessoa) => descartarRecebidos(pessoa.identity));
    return nova;
  }

  // ---------- Envio ----------

  // Publica uma trilha capturada; sem conexão, ela é publicada ao conectar (trilhasParaPublicar).
  async function publicar(fonte, trilha) {
    if (!conectada()) return;
    const opcoes = { source: fonte, simulcast: false };
    if (fonte === FONTES.tela) {
      opcoes.screenShareEncoding = {
        maxBitrate: qualidadeTela.taxaMaxima,
        maxFramerate: qualidadeTela.qps,
      };
      opcoes.degradationPreference = "maintain-framerate";
    }
    try {
      await sala.localParticipant.publishTrack(trilha, opcoes);
    } catch {
      // Conexão caiu no meio: a trilha é publicada de novo ao reconectar.
      return;
    }
    // Desligada enquanto era publicada: não pode continuar saindo.
    if (!Object.values(trilhas).includes(trilha)) {
      despublicar(trilha);
      return;
    }
    if (fonte === FONTES.tela) aplicarParametrosDeEnvio();
  }

  function despublicar(trilha) {
    if (!conectada()) return;
    sala.localParticipant.unpublishTrack(trilha, false).catch(() => {});
  }

  // ---------- Microfone ----------

  async function ligarMicrofone() {
    if (trilhas.microfone || !podeLigar(estado)) return;
    const trilha = await capturar(OPCOES_MICROFONE, "getAudioTracks");
    if (!trilha) return;
    trilhas.microfone = trilha;
    // Microfone desconectado ou permissão retirada durante o uso: a trilha termina sozinha.
    trilha.addEventListener("ended", () => {
      if (trilhas.microfone !== trilha) return;
      trilhas.microfone = null;
      despublicar(trilha);
      aoMicrofoneEncerrado();
    });
    publicar(FONTES.microfone, trilha);
  }

  function desligarMicrofone() {
    const trilha = trilhas.microfone;
    if (!trilha) return;
    // Parar a trilha corta o som na hora (T03 FR-005) e libera o microfone no navegador.
    trilha.stop();
    trilhas.microfone = null;
    despublicar(trilha);
  }

  // ---------- Câmera ----------

  async function ligarCamera() {
    if (trilhas.camera || !podeLigar(estado)) return;
    const trilha = await capturar(OPCOES_CAMERA, "getVideoTracks");
    if (!trilha) return;
    trilhas.camera = trilha;
    previaLocal = criarVideoCom(new MediaStream([trilha]));
    // Câmera desconectada ou permissão retirada durante o uso: a trilha termina sozinha.
    trilha.addEventListener("ended", () => {
      if (trilhas.camera !== trilha) return;
      trilhas.camera = null;
      descartarPrevia();
      despublicar(trilha);
      aoCameraEncerrada();
    });
    publicar(FONTES.camera, trilha);
  }

  function desligarCamera() {
    const trilha = trilhas.camera;
    if (!trilha) return;
    // Parar a trilha garante que nenhuma imagem nova sai e apaga a luz da câmera (T04 FR-014).
    trilha.stop();
    trilhas.camera = null;
    descartarPrevia();
    despublicar(trilha);
  }

  function descartarPrevia() {
    if (previaLocal) previaLocal.srcObject = null;
    previaLocal = null;
  }

  function previa() {
    return previaLocal;
  }

  // Captura uma trilha do microfone ou da câmera; se a página saiu da sala enquanto o navegador
  // pedia permissão, devolve null.
  async function capturar(opcoes, quais) {
    const fluxo = await navigator.mediaDevices.getUserMedia(opcoes);
    const [trilha] = fluxo[quais]();
    if (!encerrada()) return trilha;
    trilha.stop();
    return null;
  }

  // ---------- Compartilhamento de tela ----------

  async function compartilharTela(qualidade = qualidadePorId()) {
    if (trilhas.tela) return { som: trilhas.somTela !== null };
    if (!podeLigar(estado)) return { som: false };
    const fluxo = await navigator.mediaDevices.getDisplayMedia({
      ...OPCOES_TELA,
      video: restricoesDeCaptura(qualidade),
    });
    const [video] = fluxo.getVideoTracks();
    const [som = null] = fluxo.getAudioTracks();
    if (encerrada()) {
      for (const trilha of fluxo.getTracks()) trilha.stop();
      return { som: false };
    }
    // Prioriza a fluidez: com pouca banda, o navegador reduz a resolução antes dos quadros/s.
    video.contentHint = "motion";
    trilhas.tela = video;
    trilhas.somTela = som;
    qualidadeTela = qualidade;
    // Só a imagem: o som da própria tela não deve tocar de volta para quem compartilha.
    previaTela = criarVideoCom(new MediaStream([video]));
    // Parou pelo botão do navegador ou o app compartilhado foi fechado (T05 FR-005).
    video.addEventListener("ended", () => {
      if (trilhas.tela !== video) return;
      pararCompartilhamento();
      aoTelaEncerrada();
    });
    publicar(FONTES.tela, video);
    if (som) publicar(FONTES.somTela, som);
    return { som: som !== null };
  }

  function pararCompartilhamento() {
    const { tela, somTela } = trilhas;
    if (!tela) return;
    for (const trilha of [tela, somTela]) {
      if (!trilha) continue;
      trilha.stop();
      despublicar(trilha);
    }
    trilhas.tela = null;
    trilhas.somTela = null;
    qualidadeTela = null;
    if (previaTela) previaTela.srcObject = null;
    previaTela = null;
  }

  // Troca a qualidade no meio do compartilhamento: muda a captura em uso (sem abrir de novo a
  // escolha de tela nem trocar a trilha que os outros recebem) e os limites do envio (T06 FR-006).
  // Se o navegador recusar, a captura continua como estava e o erro sobe (T06 FR-008).
  async function mudarQualidade(qualidade) {
    if (!trilhas.tela) return;
    await trilhas.tela.applyConstraints(restricoesDeCaptura(qualidade));
    qualidadeTela = qualidade;
    aplicarParametrosDeEnvio();
  }

  function qualidadeAtiva() {
    if (!trilhas.tela) return null;
    const { width, height } = trilhas.tela.getSettings();
    return { qualidade: qualidadeTela, largura: width, altura: height };
  }

  // Limita quadros por segundo e taxa do envio da tela (T06 research §1, §3), no único envio que
  // existe: o que vai ao servidor de mídia.
  function aplicarParametrosDeEnvio() {
    if (!conectada() || !qualidadeTela) return;
    const envio = sala.localParticipant.getTrackPublication(FONTES.tela)?.track?.sender;
    if (!envio) return;
    envio.setParameters(parametrosDeEnvio(envio.getParameters(), qualidadeTela)).catch(() => {});
  }

  // ---------- Recepção ----------

  function atualizarParticipantes(lista, idVoce) {
    if (encerrada() || !idVoce) return;
    meuId = idVoce;
    assistindo = lista.find(({ id }) => id === idVoce)?.assistindo ?? null;
    reaplicarAssinaturas();
  }

  // Assina vozes e câmeras de todos e só a tela em destaque (research §6).
  function reaplicarAssinaturas() {
    if (!conectada()) return;
    const publicacoes = [];
    for (const pessoa of sala.remoteParticipants.values()) {
      for (const publicacao of pessoa.trackPublications.values()) {
        publicacoes.push({ identidade: pessoa.identity, fonte: publicacao.source, publicacao });
      }
    }
    for (const { publicacao, assinar } of assinaturasDesejadas(publicacoes, assistindo)) {
      if (publicacao.isDesired !== assinar) publicacao.setSubscribed(assinar);
    }
  }

  function receber(identidade, fonte, trilha) {
    if (!recebidos.has(identidade)) {
      recebidos.set(identidade, { audio: null, video: null, tela: { video: null, audio: null } });
    }
    const recebido = recebidos.get(identidade);
    const fluxo = new MediaStream([trilha]);
    if (fonte === FONTES.microfone) recebido.audio = tocar(recebido.audio, fluxo);
    if (fonte === FONTES.somTela) recebido.tela.audio = tocar(recebido.tela.audio, fluxo);
    if (fonte === FONTES.camera) recebido.video = mostrar(recebido.video, fluxo);
    if (fonte === FONTES.tela) recebido.tela.video = mostrar(recebido.tela.video, fluxo);
    // A lista pode ter chegado antes da imagem: quadros e destaque precisam ser montados de novo.
    if (fonte === FONTES.camera || fonte === FONTES.tela) aoChegarVideo(identidade);
  }

  // Deixou de receber (ex.: trocou o destaque): o elemento fica, sem imagem nem som antigos.
  function soltar(identidade, fonte) {
    const recebido = recebidos.get(identidade);
    if (!recebido) return;
    const elemento = {
      [FONTES.microfone]: recebido.audio,
      [FONTES.camera]: recebido.video,
      [FONTES.tela]: recebido.tela.video,
      [FONTES.somTela]: recebido.tela.audio,
    }[fonte];
    if (elemento) elemento.srcObject = null;
  }

  function descartarRecebidos(identidade) {
    const recebido = recebidos.get(identidade);
    if (!recebido) return;
    recebidos.delete(identidade);
    for (const audio of [recebido.audio, recebido.tela.audio]) {
      if (!audio) continue;
      audio.srcObject = null;
      audio.remove();
    }
    for (const video of [recebido.video, recebido.tela.video]) if (video) video.srcObject = null;
  }

  // Devolve o elemento <audio> (o existente ou um novo) já tocando o fluxo.
  function tocar(audio, fluxo) {
    if (!audio) {
      audio = document.createElement("audio");
      audio.autoplay = true;
      audio.hidden = true;
      document.body.append(audio);
    }
    audio.srcObject = fluxo;
    audio.play().catch((erro) => {
      // Sem um clique na página, o navegador pode recusar tocar som (ex.: depois de recarregar).
      if (erro.name === "NotAllowedError") aoMudarSomBloqueado(true);
    });
    return audio;
  }

  function mostrar(video, fluxo) {
    video ??= criarElementoVideo();
    video.srcObject = fluxo;
    return video;
  }

  // O elemento fica guardado; quem monta a tela decide onde (e se) ele aparece.
  function videoDe(id) {
    return recebidos.get(id)?.video ?? null;
  }

  function telaDe(id) {
    if (id === meuId && id !== null) return { video: previaTela };
    return { video: recebidos.get(id)?.tela.video ?? null };
  }

  // Chamada a partir de um clique, que é o que o navegador exige para liberar o som.
  function ativarSom() {
    for (const recebido of recebidos.values()) {
      for (const audio of [recebido.audio, recebido.tela.audio]) audio?.play().catch(() => {});
    }
    aoMudarSomBloqueado(false);
  }

  function encerrar() {
    desligarMicrofone();
    desligarCamera();
    pararCompartilhamento();
    mudarEstado("sair");
    sala?.disconnect();
    for (const identidade of [...recebidos.keys()]) descartarRecebidos(identidade);
  }

  return {
    conectar,
    ligarMicrofone,
    desligarMicrofone,
    atualizarParticipantes,
    ativarSom,
    ligarCamera,
    desligarCamera,
    previa,
    videoDe,
    telaDe,
    compartilharTela,
    pararCompartilhamento,
    mudarQualidade,
    qualidadeAtiva,
    encerrar,
  };
}

function criarVideoCom(fluxo) {
  const video = criarElementoVideo();
  video.srcObject = fluxo;
  return video;
}

function criarElementoVideo() {
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  return video;
}
