import { compararPares } from "./midia-regras.js";
import { parametrosDeEnvio, qualidadePorId, restricoesDeCaptura } from "./qualidades.js";

// Voz, vídeo e tela: captura do microfone, da câmera e da tela e uma conexão direta com cada outra
// pessoa da sala (malha), com quatro canais fixos (CANAIS). Decisões em
// specs/003-conversar-por-voz/research.md §1–4, §6, §8, §9, specs/004-ativar-webcam/research.md
// §1, §4, §5 e specs/005-compartilhar-tela/research.md §1, §2, §5.

// O STUN só informa a cada navegador o próprio endereço público; o áudio não passa por ele.
const SERVIDORES_ICE = [{ urls: "stun:stun.l.google.com:19302" }];

// Qualidade moderada: dá para ver o rosto, e 5 envios cabem numa internet doméstica (research §4).
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

export function criarMidia({
  enviarSinal,
  aoMudarSomBloqueado = () => {},
  aoFalharPar = () => {},
  aoMicrofoneEncerrado = () => {},
  aoCameraEncerrada = () => {},
  aoChegarVideo = () => {},
  aoTelaEncerrada = () => {},
}) {
  // idPublico → { conexaoRtc, audio, video, tela: { video, audio }, fila, falhou }
  const pares = new Map();
  let trilhaMicrofone = null;
  let trilhaCamera = null;
  // Própria imagem, mostrada só para a própria pessoa (FR-005).
  let previaLocal = null;
  let trilhaTela = null;
  let trilhaSomTela = null;
  let qualidadeTela = null;
  // Última lista e próprio id: decidem para quem a tela é enviada.
  let ultimaLista = [];
  let meuId = null;
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
      trocarTrilhaEmTodos("microfone", null);
      aoMicrofoneEncerrado();
    });
    trocarTrilhaEmTodos("microfone", trilha);
  }

  function desligarMicrofone() {
    if (!trilhaMicrofone) return;
    // Parar a trilha corta o som na hora (FR-005) e libera o microfone no navegador (FR-015).
    trilhaMicrofone.stop();
    trilhaMicrofone = null;
    trocarTrilhaEmTodos("microfone", null);
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
      trocarTrilhaEmTodos("camera", null);
      aoCameraEncerrada();
    });
    trocarTrilhaEmTodos("camera", trilha);
  }

  function desligarCamera() {
    if (!trilhaCamera) return;
    // Parar a trilha garante que nenhuma imagem nova sai e apaga a luz da câmera (FR-014).
    trilhaCamera.stop();
    trilhaCamera = null;
    descartarPrevia();
    trocarTrilhaEmTodos("camera", null);
  }

  function descartarPrevia() {
    if (previaLocal) previaLocal.srcObject = null;
    previaLocal = null;
  }

  function previa() {
    return previaLocal;
  }

  // ---------- Compartilhamento de tela ----------

  async function compartilharTela(qualidade = qualidadePorId()) {
    if (trilhaTela) return { som: trilhaSomTela !== null };
    const fluxo = await navigator.mediaDevices.getDisplayMedia({
      ...OPCOES_TELA,
      video: restricoesDeCaptura(qualidade),
    });
    const [video] = fluxo.getVideoTracks();
    const [som = null] = fluxo.getAudioTracks();
    if (encerrada) {
      for (const trilha of fluxo.getTracks()) trilha.stop();
      return { som: false };
    }
    // Prioriza a fluidez: com pouca banda, o navegador reduz a resolução antes dos quadros/s.
    video.contentHint = "motion";
    trilhaTela = video;
    trilhaSomTela = som;
    qualidadeTela = qualidade;
    // Parou pelo botão do navegador ou o app compartilhado foi fechado (FR-005).
    video.addEventListener("ended", () => {
      if (trilhaTela !== video) return;
      pararCompartilhamento();
      aoTelaEncerrada();
    });
    aplicarEnvioTela();
    return { som: som !== null };
  }

  function pararCompartilhamento() {
    if (!trilhaTela) return;
    trilhaTela.stop();
    trilhaSomTela?.stop();
    trilhaTela = null;
    trilhaSomTela = null;
    qualidadeTela = null;
    aplicarEnvioTela();
  }

  // Troca a qualidade no meio do compartilhamento: muda a captura em uso (sem abrir de novo a
  // escolha de tela nem trocar a trilha que os outros recebem) e os limites do envio (FR-006).
  // Se o navegador recusar, a captura continua como estava e o erro sobe (FR-008).
  async function mudarQualidade(qualidade) {
    if (!trilhaTela) return;
    await trilhaTela.applyConstraints(restricoesDeCaptura(qualidade));
    qualidadeTela = qualidade;
    for (const par of pares.values()) aplicarParametrosDeEnvio(par);
  }

  function qualidadeAtiva() {
    if (!trilhaTela) return null;
    const { width, height } = trilhaTela.getSettings();
    return { qualidade: qualidadeTela, largura: width, altura: height };
  }

  // Limita quadros por segundo e taxa do envio da tela para um par que a está recebendo (T06
  // research §1, §3). Antes de a conexão terminar a negociação não há o que limitar: o erro é
  // ignorado e o envio é reaplicado quando ela conecta.
  function aplicarParametrosDeEnvio(par) {
    if (!qualidadeTela || !par.enviandoTela.telaVideo) return;
    const envio = transceptorDe(par.conexaoRtc, "telaVideo")?.sender;
    if (!envio) return;
    envio.setParameters(parametrosDeEnvio(envio.getParameters(), qualidadeTela)).catch(() => {});
  }

  // A tela só vai para quem a tem em destaque (`assistindo` igual ao meu id): cada pessoa recebe
  // no máximo uma tela, por mais que existam (research §2).
  function enviaTelaPara(idPar) {
    if (!trilhaTela) return false;
    return ultimaLista.find(({ id }) => id === idPar)?.assistindo === meuId;
  }

  function aplicarEnvioTela() {
    for (const par of pares.values()) {
      for (const canal of ["telaVideo", "telaAudio"]) {
        const desejada = trilhaAtual(canal, par.id);
        if (par.enviandoTela[canal] === desejada) continue;
        par.enviandoTela[canal] = desejada;
        trocarTrilha(par, canal, desejada);
        if (canal === "telaVideo") aplicarParametrosDeEnvio(par);
      }
    }
  }

  // ---------- Troca de trilhas ----------

  // Ligar e desligar só troca a trilha enviada: cada conexão já tem os quatro canais nos dois
  // sentidos, então não é preciso renegociar com ninguém.
  function trocarTrilhaEmTodos(canal, trilha) {
    for (const par of pares.values()) trocarTrilha(par, canal, trilha);
  }

  function trocarTrilha(par, canal, trilha) {
    transceptorDe(par.conexaoRtc, canal)
      ?.sender.replaceTrack(trilha)
      .catch(() => marcarFalha(par));
  }

  // O que cada canal deve enviar para um par neste momento.
  function trilhaAtual(canal, idPar) {
    if (canal === "microfone") return trilhaMicrofone;
    if (canal === "camera") return trilhaCamera;
    if (!enviaTelaPara(idPar)) return null;
    return canal === "telaVideo" ? trilhaTela : trilhaSomTela;
  }

  // Trilha inicial de um canal de um par novo; nos canais da tela, guarda o que foi enviado para
  // que aplicarEnvioTela só troque quando mudar.
  function trilhaInicial(par, canal) {
    const trilha = trilhaAtual(canal, par.id);
    if (canal in par.enviandoTela) par.enviandoTela[canal] = trilha;
    return trilha;
  }

  // ---------- Conexões com as outras pessoas ----------

  function atualizarParticipantes(lista, idVoce) {
    if (encerrada || !idVoce) return;
    ultimaLista = lista;
    meuId = idVoce;
    const { criar, fechar } = compararPares(pares.keys(), lista, idVoce);
    for (const id of fechar) fecharPar(id);
    for (const id of criar) iniciarPar(id);
    aplicarEnvioTela();
  }

  function criarPar(id) {
    const conexaoRtc = new RTCPeerConnection({ iceServers: SERVIDORES_ICE });
    const par = {
      id,
      conexaoRtc,
      audio: null,
      video: null,
      tela: { video: null, audio: null },
      enviandoTela: { telaVideo: null, telaAudio: null },
      fila: Promise.resolve(),
      falhou: false,
    };
    pares.set(id, par);

    conexaoRtc.addEventListener("icecandidate", ({ candidate }) => {
      if (candidate) enviarSinal(id, { candidato: candidate.toJSON() });
    });
    conexaoRtc.addEventListener("connectionstatechange", () => {
      if (conexaoRtc.connectionState === "failed") marcarFalha(par);
      if (conexaoRtc.connectionState === "connected") aplicarParametrosDeEnvio(par);
    });
    return par;
  }

  // Só um lado de cada par inicia (devoIniciar): cria os quatro canais, na ordem de CANAIS, e
  // envia a oferta. O outro lado recebe os canais na mesma ordem.
  function iniciarPar(id) {
    const par = criarPar(id);
    for (const { nome, tipo } of CANAIS) {
      par.conexaoRtc.addTransceiver(tipo, { direction: "sendrecv" });
      trocarTrilha(par, nome, trilhaInicial(par, nome));
    }
    prepararRecepcao(par);
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
      // Do lado que responde, os canais só passam a existir com a oferta.
      prepararRecepcao(par);
      if (descricao.type === "offer") {
        // O lado que responde também envia pelos mesmos canais criados pela oferta.
        for (const { nome } of CANAIS) {
          const transceptor = transceptorDe(conexaoRtc, nome);
          if (!transceptor) continue;
          transceptor.direction = "sendrecv";
          await transceptor.sender.replaceTrack(trilhaInicial(par, nome));
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
    for (const audio of [par.audio, par.tela.audio]) {
      if (!audio) continue;
      audio.srcObject = null;
      audio.remove();
    }
    for (const video of [par.video, par.tela.video]) if (video) video.srcObject = null;
  }

  // ---------- Recepção ----------

  // Liga cada canal recebido a um elemento de som ou imagem assim que o canal existe, usando a
  // trilha de recepção do próprio canal (que existe desde a criação, mesmo sem mídia chegando).
  // Não depende do evento `track`: ele só dispara na negociação, e alguns navegadores não o
  // disparam para um canal que ainda não tinha trilha; e começar a compartilhar ou ligar a câmera
  // depois (só troca de trilha do outro lado) não dispara nada aqui. Sem isso, a tela
  // compartilhada ficava sem <video> para sempre.
  function prepararRecepcao(par) {
    const { conexaoRtc } = par;
    const trilhaDe = (canal) => transceptorDe(conexaoRtc, canal)?.receiver.track ?? null;
    let mudou = false;
    const comFluxo = (canal, montar) => {
      const trilha = trilhaDe(canal);
      if (!trilha) return null;
      mudou = true;
      return montar(new MediaStream([trilha]));
    };
    par.audio ??= comFluxo("microfone", (fluxo) => tocar(null, fluxo));
    par.video ??= comFluxo("camera", criarVideoCom);
    par.tela.video ??= comFluxo("telaVideo", criarVideoCom);
    par.tela.audio ??= comFluxo("telaAudio", (fluxo) => tocar(null, fluxo));
    // A lista pode ter chegado antes dos canais: a tela precisa montar quadros e destaque de novo.
    if (mudou) aoChegarVideo(par.id);
  }

  // ---------- Som recebido ----------

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

  // ---------- Vídeo recebido ----------

  // O elemento fica guardado no par; quem monta a tela decide onde (e se) ele aparece.
  function videoDe(id) {
    return pares.get(id)?.video ?? null;
  }

  function telaDe(id) {
    return { video: pares.get(id)?.tela.video ?? null };
  }

  // Chamada a partir de um clique, que é o que o navegador exige para liberar o som.
  function ativarSom() {
    for (const par of pares.values()) {
      for (const audio of [par.audio, par.tela.audio]) audio?.play().catch(() => {});
    }
    aoMudarSomBloqueado(false);
  }

  function encerrar() {
    encerrada = true;
    desligarMicrofone();
    desligarCamera();
    pararCompartilhamento();
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
    telaDe,
    compartilharTela,
    pararCompartilhamento,
    mudarQualidade,
    qualidadeAtiva,
    encerrar,
  };
}

// Canais de cada conexão, sempre nesta ordem. Há dois canais de vídeo (câmera e tela), então o
// canal é achado pela posição: os dois lados criam os transceptores na ordem da oferta.
const CANAIS = [
  { nome: "microfone", tipo: "audio" },
  { nome: "camera", tipo: "video" },
  { nome: "telaVideo", tipo: "video" },
  { nome: "telaAudio", tipo: "audio" },
];

function transceptorDe(conexaoRtc, canal) {
  const posicao = CANAIS.findIndex(({ nome }) => nome === canal);
  return conexaoRtc.getTransceivers()[posicao] ?? null;
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
