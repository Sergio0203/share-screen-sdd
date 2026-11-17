import { compararPares } from "./midia-regras.js";

// Voz e vídeo: captura do microfone e da câmera e uma conexão direta com cada outra pessoa da sala
// (malha), com um canal de áudio e um de vídeo. Decisões em specs/003-conversar-por-voz/research.md
// §1–4, §6, §8, §9 e specs/004-ativar-webcam/research.md §1, §4, §5.

// O STUN só informa a cada navegador o próprio endereço público; o áudio não passa por ele.
const SERVIDORES_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

// Qualidade moderada: dá para ver o rosto, e 5 envios cabem numa internet doméstica (research §4).
const OPCOES_CAMERA = {
  video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 24 } },
};

const OPCOES_MICROFONE = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

export function criarMidia({
  enviarSinal,
  aoMudarSomBloqueado = () => {},
  aoFalharPar = () => {},
  aoMicrofoneEncerrado = () => {},
  aoCameraEncerrada = () => {},
  aoChegarVideo = () => {},
}) {
  // idPublico → { conexaoRtc, audio, video, fila, falhou }
  const pares = new Map();
  let trilhaMicrofone = null;
  let trilhaCamera = null;
  // Própria imagem, mostrada só para a própria pessoa (FR-005).
  let previaLocal = null;
  let encerrada = false;

  // ---------- Microfone ----------

  async function ligarMicrofone() {
    if (trilhaMicrofone) return;
    const fluxo = await navigator.mediaDevices.getUserMedia(OPCOES_MICROFONE);
    const [trilha] = fluxo.getAudioTracks();
    if (encerrada) {
      trilha.stop();
      return;
    }
    trilhaMicrofone = trilha;
    // Microfone desconectado ou permissão retirada durante o uso: a trilha termina sozinha.
    trilha.addEventListener("ended", () => {
      if (trilhaMicrofone !== trilha) return;
      trilhaMicrofone = null;
      trocarTrilhaEmTodos("audio", null);
      aoMicrofoneEncerrado();
    });
    trocarTrilhaEmTodos("audio", trilha);
  }

  function desligarMicrofone() {
    if (!trilhaMicrofone) return;
    // Parar a trilha corta o som na hora (FR-005) e libera o microfone no navegador (FR-015).
    trilhaMicrofone.stop();
    trilhaMicrofone = null;
    trocarTrilhaEmTodos("audio", null);
  }

  // ---------- Câmera ----------

  async function ligarCamera() {
    if (trilhaCamera) return;
    const fluxo = await navigator.mediaDevices.getUserMedia(OPCOES_CAMERA);
    const [trilha] = fluxo.getVideoTracks();
    if (encerrada) {
      trilha.stop();
      return;
    }
    trilhaCamera = trilha;
    previaLocal = criarElementoVideo();
    previaLocal.srcObject = new MediaStream([trilha]);
    // Câmera desconectada ou permissão retirada durante o uso: a trilha termina sozinha.
    trilha.addEventListener("ended", () => {
      if (trilhaCamera !== trilha) return;
      trilhaCamera = null;
      descartarPrevia();
      trocarTrilhaEmTodos("video", null);
      aoCameraEncerrada();
    });
    trocarTrilhaEmTodos("video", trilha);
  }

  function desligarCamera() {
    if (!trilhaCamera) return;
    // Parar a trilha garante que nenhuma imagem nova sai e apaga a luz da câmera (FR-014).
    trilhaCamera.stop();
    trilhaCamera = null;
    descartarPrevia();
    trocarTrilhaEmTodos("video", null);
  }

  function descartarPrevia() {
    if (previaLocal) previaLocal.srcObject = null;
    previaLocal = null;
  }

  function previa() {
    return previaLocal;
  }

  // ---------- Troca de trilhas ----------

  // Ligar e desligar só troca a trilha enviada: cada conexão já tem um canal de áudio e um de
  // vídeo nos dois sentidos, então não é preciso renegociar com ninguém.
  function trocarTrilhaEmTodos(tipo, trilha) {
    for (const par of pares.values()) trocarTrilha(par, tipo, trilha);
  }

  function trocarTrilha(par, tipo, trilha) {
    transceptorDe(par.conexaoRtc, tipo)
      ?.sender.replaceTrack(trilha)
      .catch(() => marcarFalha(par));
  }

  function trilhaAtual(tipo) {
    return tipo === "audio" ? trilhaMicrofone : trilhaCamera;
  }

  // ---------- Conexões com as outras pessoas ----------

  function atualizarParticipantes(lista, idVoce) {
    if (encerrada || !idVoce) return;
    const { criar, fechar } = compararPares(pares.keys(), lista, idVoce);
    for (const id of fechar) fecharPar(id);
    for (const id of criar) iniciarPar(id);
  }

  function criarPar(id) {
    const conexaoRtc = new RTCPeerConnection({ iceServers: SERVIDORES_ICE });
    const par = {
      id,
      conexaoRtc,
      audio: null,
      video: null,
      fila: Promise.resolve(),
      falhou: false,
    };
    pares.set(id, par);

    conexaoRtc.addEventListener("icecandidate", ({ candidate }) => {
      if (candidate) enviarSinal(id, { candidato: candidate.toJSON() });
    });
    conexaoRtc.addEventListener("track", ({ track }) => {
      // Áudio e vídeo em elementos separados: o vídeo sem som nunca é bloqueado pelo navegador.
      if (track.kind === "audio") tocar(par, new MediaStream([track]));
      else if (track.kind === "video") mostrarVideo(par, new MediaStream([track]));
    });
    conexaoRtc.addEventListener("connectionstatechange", () => {
      if (conexaoRtc.connectionState === "failed") marcarFalha(par);
    });
    return par;
  }

  // Só um lado de cada par inicia (devoIniciar): cria os canais de áudio e vídeo e envia a oferta.
  function iniciarPar(id) {
    const par = criarPar(id);
    for (const tipo of TIPOS) {
      par.conexaoRtc.addTransceiver(tipo, { direction: "sendrecv" });
      trocarTrilha(par, tipo, trilhaAtual(tipo));
    }
    enfileirar(par, async () => {
      await par.conexaoRtc.setLocalDescription();
      enviarSinal(id, { descricao: par.conexaoRtc.localDescription.toJSON() });
    });
  }

  function receberSinal(de, dados) {
    if (encerrada) return;
    let par = pares.get(de);
    if (!par) {
      // Só uma oferta abre um par novo; candidatos de um par já fechado são descartados.
      if (dados?.descricao?.type !== "offer") return;
      par = criarPar(de);
    }
    enfileirar(par, () => processarSinal(par, dados));
  }

  async function processarSinal(par, { descricao, candidato }) {
    const { conexaoRtc } = par;
    if (descricao) {
      await conexaoRtc.setRemoteDescription(descricao);
      if (descricao.type === "offer") {
        // O lado que responde também envia pelos mesmos canais criados pela oferta.
        for (const tipo of TIPOS) {
          const transceptor = transceptorDe(conexaoRtc, tipo);
          if (!transceptor) continue;
          transceptor.direction = "sendrecv";
          await transceptor.sender.replaceTrack(trilhaAtual(tipo));
        }
        await conexaoRtc.setLocalDescription();
        enviarSinal(par.id, { descricao: conexaoRtc.localDescription.toJSON() });
      }
    } else if (candidato) {
      await conexaoRtc.addIceCandidate(candidato);
    }
  }

  // As mensagens de cada par são tratadas uma de cada vez, na ordem de chegada: um candidato
  // nunca pode ser aplicado antes da descrição remota.
  function enfileirar(par, tarefa) {
    par.fila = par.fila.then(tarefa).catch(() => marcarFalha(par));
  }

  function marcarFalha(par) {
    if (par.falhou || pares.get(par.id) !== par) return;
    par.falhou = true;
    aoFalharPar(par.id);
  }

  function fecharPar(id) {
    const par = pares.get(id);
    if (!par) return;
    pares.delete(id);
    par.conexaoRtc.close();
    if (par.audio) {
      par.audio.srcObject = null;
      par.audio.remove();
    }
    if (par.video) par.video.srcObject = null;
  }

  // ---------- Som recebido ----------

  function tocar(par, fluxo) {
    if (!par.audio) {
      par.audio = document.createElement("audio");
      par.audio.autoplay = true;
      par.audio.hidden = true;
      document.body.append(par.audio);
    }
    par.audio.srcObject = fluxo;
    par.audio.play().catch((erro) => {
      // Sem um clique na página, o navegador pode recusar tocar som (ex.: depois de recarregar).
      if (erro.name === "NotAllowedError") aoMudarSomBloqueado(true);
    });
  }

  // ---------- Vídeo recebido ----------

  // O elemento fica guardado no par; quem monta a tela decide onde (e se) ele aparece.
  function mostrarVideo(par, fluxo) {
    if (!par.video) par.video = criarElementoVideo();
    par.video.srcObject = fluxo;
    // A lista pode ter chegado antes do vídeo: a tela precisa montar o quadro de novo.
    aoChegarVideo(par.id);
  }

  function videoDe(id) {
    return pares.get(id)?.video ?? null;
  }

  // Chamada a partir de um clique, que é o que o navegador exige para liberar o som.
  function ativarSom() {
    for (const par of pares.values()) par.audio?.play().catch(() => {});
    aoMudarSomBloqueado(false);
  }

  function encerrar() {
    encerrada = true;
    desligarMicrofone();
    desligarCamera();
    for (const id of [...pares.keys()]) fecharPar(id);
  }

  return {
    ligarMicrofone,
    desligarMicrofone,
    atualizarParticipantes,
    receberSinal,
    ativarSom,
    ligarCamera,
    desligarCamera,
    previa,
    videoDe,
    encerrar,
  };
}

const TIPOS = ["audio", "video"];

// O canal é achado pelo tipo, não pela posição, para nunca trocar áudio por vídeo.
function transceptorDe(conexaoRtc, tipo) {
  return conexaoRtc.getTransceivers().find((t) => t.receiver.track.kind === tipo) ?? null;
}

function criarElementoVideo() {
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  return video;
}
