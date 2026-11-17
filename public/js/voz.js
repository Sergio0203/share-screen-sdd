import { compararPares } from "./voz-regras.js";

// Conversa por voz: captura do microfone e uma conexão de áudio direta com cada outra pessoa da
// sala (malha). Decisões em specs/003-conversar-por-voz/research.md §1–4, §6, §8 e §9.

// O STUN só informa a cada navegador o próprio endereço público; o áudio não passa por ele.
const SERVIDORES_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

const OPCOES_MICROFONE = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
};

export function criarVoz({
  enviarSinal,
  aoMudarSomBloqueado = () => {},
  aoFalharPar = () => {},
  aoMicrofoneEncerrado = () => {},
}) {
  // idPublico → { conexaoRtc, audio, fila, falhou }
  const pares = new Map();
  let trilhaMicrofone = null;
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
      trocarTrilhaEmTodos(null);
      aoMicrofoneEncerrado();
    });
    trocarTrilhaEmTodos(trilha);
  }

  function desligarMicrofone() {
    if (!trilhaMicrofone) return;
    // Parar a trilha corta o som na hora (FR-005) e libera o microfone no navegador (FR-015).
    trilhaMicrofone.stop();
    trilhaMicrofone = null;
    trocarTrilhaEmTodos(null);
  }

  // Ligar e desligar só troca a trilha enviada: a conexão já tem um canal de áudio nos dois
  // sentidos, então não é preciso renegociar com ninguém.
  function trocarTrilhaEmTodos(trilha) {
    for (const par of pares.values()) trocarTrilha(par, trilha);
  }

  function trocarTrilha(par, trilha) {
    const [transceptor] = par.conexaoRtc.getTransceivers();
    transceptor?.sender.replaceTrack(trilha).catch(() => marcarFalha(par));
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
    const par = { id, conexaoRtc, audio: null, fila: Promise.resolve(), falhou: false };
    pares.set(id, par);

    conexaoRtc.addEventListener("icecandidate", ({ candidate }) => {
      if (candidate) enviarSinal(id, { candidato: candidate.toJSON() });
    });
    conexaoRtc.addEventListener("track", ({ track, streams }) => {
      tocar(par, streams[0] ?? new MediaStream([track]));
    });
    conexaoRtc.addEventListener("connectionstatechange", () => {
      if (conexaoRtc.connectionState === "failed") marcarFalha(par);
    });
    return par;
  }

  // Só um lado de cada par inicia (devoIniciar): cria o canal de áudio e envia a oferta.
  function iniciarPar(id) {
    const par = criarPar(id);
    par.conexaoRtc.addTransceiver("audio", { direction: "sendrecv" });
    trocarTrilha(par, trilhaMicrofone);
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
        // O lado que responde também envia áudio pelo mesmo canal criado pela oferta.
        const [transceptor] = conexaoRtc.getTransceivers();
        transceptor.direction = "sendrecv";
        await transceptor.sender.replaceTrack(trilhaMicrofone);
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

  // Chamada a partir de um clique, que é o que o navegador exige para liberar o som.
  function ativarSom() {
    for (const par of pares.values()) par.audio?.play().catch(() => {});
    aoMudarSomBloqueado(false);
  }

  function encerrar() {
    encerrada = true;
    desligarMicrofone();
    for (const id of [...pares.keys()]) fecharPar(id);
  }

  return {
    ligarMicrofone,
    desligarMicrofone,
    atualizarParticipantes,
    receberSinal,
    ativarSom,
    encerrar,
  };
}
