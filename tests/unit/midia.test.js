import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import { OPCOES_CONEXAO, OPCOES_SALA, criarMidia } from "../../public/js/midia.js";
import { qualidadePorId, restricoesDeCaptura } from "../../public/js/qualidades.js";

// Navegador e servidor de mídia falsos, só com o necessário para midia.js (T10). A sala falsa
// imita a `Room` do livekit-client: conecta, publica e despublica trilhas, guarda as pessoas
// remotas e suas publicações, e deixa o teste disparar os eventos.

class TrilhaFalsa {
  constructor(kind) {
    this.kind = kind;
    this.readyState = "live";
    this.restricoes = [];
    // Tamanho que a "captura" informa em getSettings().
    this.ajustes = { width: 1920, height: 1080 };
    this.falharRestricoes = false;
    this.ouvintes = {};
  }
  async applyConstraints(restricoes) {
    if (this.falharRestricoes)
      throw Object.assign(new Error("não deu"), { name: "OverconstrainedError" });
    this.restricoes.push(restricoes);
  }
  getSettings() {
    return { ...this.ajustes };
  }
  addEventListener(evento, ouvinte) {
    (this.ouvintes[evento] ??= []).push(ouvinte);
  }
  // O navegador encerrou a trilha (botão "parar" do navegador, câmera desconectada…).
  terminar() {
    this.readyState = "ended";
    for (const ouvinte of this.ouvintes.ended ?? []) ouvinte();
  }
  stop() {
    this.readyState = "ended";
  }
}

class EnvioFalso {
  constructor() {
    this.parametros = { encodings: [{}] };
    this.parametrosAplicados = [];
  }
  getParameters() {
    return this.parametros;
  }
  async setParameters(parametros) {
    this.parametros = parametros;
    this.parametrosAplicados.push(parametros);
  }
}

class PublicacaoRemotaFalsa {
  constructor(source) {
    this.source = source;
    this.isDesired = false;
    this.pedidos = [];
  }
  setSubscribed(assinar) {
    this.isDesired = assinar;
    this.pedidos.push(assinar);
  }
}

// Servidor de mídia falso fora do ar: toda conexão nova falha.
let foraDoAr = false;

class SalaFalsa {
  constructor(opcoes) {
    this.opcoes = opcoes;
    this.conexoes = [];
    this.ouvintes = {};
    this.remoteParticipants = new Map();
    this.publicadas = [];
    this.despublicadas = [];
    this.desconectada = false;
    const sala = this;
    this.localParticipant = {
      async publishTrack(trilha, opcoes) {
        const publicacao = { trilha, opcoes, track: { sender: new EnvioFalso() } };
        sala.publicadas.push(publicacao);
        return publicacao;
      },
      async unpublishTrack(trilha, parar) {
        sala.despublicadas.push({ trilha, parar });
        sala.publicadas = sala.publicadas.filter((p) => p.trilha !== trilha);
      },
      getTrackPublication(fonte) {
        return sala.publicadas.find((p) => p.opcoes.source === fonte);
      },
    };
  }
  async connect(url, token, opcoes) {
    this.conexoes.push({ url, token, opcoes });
    if (foraDoAr) throw new Error("sem servidor de mídia");
  }
  // Como o LiveKit: por padrão, desconectar também para as trilhas publicadas.
  disconnect(pararTrilhas = true) {
    this.desconectada = true;
    if (pararTrilhas) for (const { trilha } of this.publicadas) trilha.stop();
  }
  on(evento, ouvinte) {
    (this.ouvintes[evento] ??= []).push(ouvinte);
    return this;
  }
  emitir(evento, ...argumentos) {
    for (const ouvinte of this.ouvintes[evento] ?? []) ouvinte(...argumentos);
  }
  // Uma pessoa remota publica uma mídia: a sala avisa e a publicação fica disponível.
  publicarRemota(identidade, fonte) {
    if (!this.remoteParticipants.has(identidade)) {
      this.remoteParticipants.set(identidade, {
        identity: identidade,
        trackPublications: new Map(),
      });
    }
    const pessoa = this.remoteParticipants.get(identidade);
    const publicacao = new PublicacaoRemotaFalsa(fonte);
    pessoa.trackPublications.set(`${identidade}-${fonte}`, publicacao);
    this.emitir("trackPublished", publicacao, pessoa);
    return publicacao;
  }
  // O servidor entrega uma trilha assinada.
  entregar(
    identidade,
    fonte,
    kind = fonte.includes("audio") || fonte === "microphone" ? "audio" : "video",
  ) {
    const pessoa = this.remoteParticipants.get(identidade);
    const publicacao = pessoa.trackPublications.get(`${identidade}-${fonte}`);
    const trilha = { mediaStreamTrack: new TrilhaFalsa(kind) };
    this.emitir("trackSubscribed", trilha, publicacao, pessoa);
    return trilha.mediaStreamTrack;
  }
}

class FluxoFalso {
  constructor(trilhas) {
    this.trilhas = trilhas;
  }
  getTracks() {
    return this.trilhas;
  }
  getVideoTracks() {
    return this.trilhas.filter((t) => t.kind === "video");
  }
  getAudioTracks() {
    return this.trilhas.filter((t) => t.kind === "audio");
  }
}

// Capturas falsas: registram as opções pedidas e devolvem trilhas novas.
const capturas = [];
let telaComSom = false;
function capturarTelaFalsa(opcoes) {
  const trilhas = [new TrilhaFalsa("video")];
  if (telaComSom) trilhas.push(new TrilhaFalsa("audio"));
  capturas.push({ opcoes, trilha: trilhas[0], som: trilhas[1] ?? null });
  return Promise.resolve(new FluxoFalso(trilhas));
}
function capturarDispositivoFalso(opcoes) {
  const trilha = new TrilhaFalsa(opcoes.audio ? "audio" : "video");
  capturas.push({ opcoes, trilha });
  return Promise.resolve(new FluxoFalso([trilha]));
}

function elementoFalso(tag) {
  return { tag, srcObject: null, play: () => Promise.resolve(), remove() {} };
}

const originais = {};
beforeEach(() => {
  capturas.length = 0;
  telaComSom = false;
  foraDoAr = false;
  for (const nome of ["MediaStream", "document", "navigator"]) {
    originais[nome] = Object.getOwnPropertyDescriptor(globalThis, nome);
  }
  globalThis.MediaStream = FluxoFalso;
  globalThis.document = { createElement: elementoFalso, body: { append() {} } };
  Object.defineProperty(globalThis, "navigator", {
    value: {
      mediaDevices: {
        getDisplayMedia: capturarTelaFalsa,
        getUserMedia: capturarDispositivoFalso,
      },
    },
    configurable: true,
    writable: true,
  });
});
afterEach(() => {
  for (const [nome, descritor] of Object.entries(originais)) {
    if (descritor) Object.defineProperty(globalThis, nome, descritor);
    else delete globalThis[nome];
  }
});

const pessoa = (id, { tela = null, assistindo = null } = {}) => ({
  id,
  nome: id,
  assistindo,
  tela,
});

function novaMidia() {
  const chegadas = [];
  const falhas = [];
  const salas = [];
  const midia = criarMidia({
    criarSala: (opcoes) => {
      const sala = new SalaFalsa(opcoes);
      salas.push(sala);
      return sala;
    },
    aoChegarVideo: (id) => chegadas.push(id),
    aoFalharRecepcao: (id) => falhas.push(id),
  });
  return { midia, chegadas, falhas, sala: () => salas[0], salas };
}

// Mídia já conectada ao servidor falso.
async function conectada() {
  const contexto = novaMidia();
  await contexto.midia.conectar("ws://midia.teste", "token-1");
  return contexto;
}

// Deixa as publicações (assíncronas) terminarem.
const terminar = () => esperar(0);

const fontesPublicadas = (sala) => sala.publicadas.map((p) => p.opcoes.source);

// ---------- Conexão ----------

test("conectar usa o endereço e a permissão recebidos, com as opções da sala", async () => {
  const { sala } = await conectada();
  assert.deepEqual(sala().opcoes, OPCOES_SALA);
  assert.deepEqual(sala().conexoes, [
    { url: "ws://midia.teste", token: "token-1", opcoes: OPCOES_CONEXAO },
  ]);
  assert.equal(OPCOES_SALA.adaptiveStream, false);
  assert.equal(OPCOES_SALA.dynacast, true);
  assert.equal(OPCOES_CONEXAO.autoSubscribe, false);
});

// ---------- Uma transmissão por mídia (FR-001, FR-002) ----------

test("ligar microfone e câmera publica uma trilha de cada, sem camadas", async () => {
  const { midia, sala } = await conectada();
  await midia.ligarMicrofone();
  await midia.ligarCamera();
  await terminar();
  assert.deepEqual(
    sala().publicadas.map((p) => [p.opcoes.source, p.opcoes.simulcast, p.trilha]),
    [
      ["microphone", false, capturas[0].trilha],
      ["camera", false, capturas[1].trilha],
    ],
  );
});

test("ligar duas vezes não publica de novo", async () => {
  const { midia, sala } = await conectada();
  await midia.ligarMicrofone();
  await midia.ligarMicrofone();
  await terminar();
  assert.deepEqual(fontesPublicadas(sala()), ["microphone"]);
});

test("desligar para a trilha e a despublica, sem deixar o LiveKit pará-la", async () => {
  const { midia, sala } = await conectada();
  await midia.ligarCamera();
  await terminar();
  midia.desligarCamera();
  await terminar();
  assert.equal(capturas[0].trilha.readyState, "ended");
  assert.deepEqual(sala().despublicadas, [{ trilha: capturas[0].trilha, parar: false }]);
  assert.deepEqual(fontesPublicadas(sala()), []);
  assert.equal(midia.previa(), null);
});

test("câmera desconectada (trilha termina sozinha) é despublicada e avisada", async () => {
  const encerradas = [];
  const salas = [];
  const midia = criarMidia({
    criarSala: (opcoes) => salas[salas.push(new SalaFalsa(opcoes)) - 1],
    aoCameraEncerrada: () => encerradas.push("camera"),
  });
  await midia.conectar("ws://midia.teste", "t");
  await midia.ligarCamera();
  await terminar();
  capturas[0].trilha.terminar();
  await terminar();
  assert.deepEqual(fontesPublicadas(salas[0]), []);
  assert.deepEqual(encerradas, ["camera"]);
});

test("compartilhar publica a tela e o som dela, limitados pela qualidade", async () => {
  telaComSom = true;
  const { midia, sala } = await conectada();
  const resultado = await midia.compartilharTela(qualidadePorId("720p30"));
  await terminar();
  assert.deepEqual(resultado, { som: true });
  const [tela, som] = sala().publicadas;
  assert.equal(tela.trilha, capturas[0].trilha);
  assert.equal(tela.trilha.contentHint, "motion");
  assert.deepEqual(tela.opcoes, {
    source: "screen_share",
    simulcast: false,
    screenShareEncoding: { maxBitrate: 2_500_000, maxFramerate: 30 },
    degradationPreference: "maintain-framerate",
  });
  assert.deepEqual(som.opcoes, { source: "screen_share_audio", simulcast: false });
  // O envio único também recebe os limites (T06), mantendo a fluidez.
  const aplicado = tela.track.sender.parametrosAplicados.at(-1);
  assert.equal(aplicado.degradationPreference, "maintain-framerate");
  assert.equal(aplicado.encodings[0].maxFramerate, 30);
  assert.equal(aplicado.encodings[0].maxBitrate, 2_500_000);
});

test("tela sem som publica só a imagem", async () => {
  const { midia, sala } = await conectada();
  assert.deepEqual(await midia.compartilharTela(), { som: false });
  await terminar();
  assert.deepEqual(fontesPublicadas(sala()), ["screen_share"]);
});

test("parar de compartilhar para e despublica a tela e o som", async () => {
  telaComSom = true;
  const { midia, sala } = await conectada();
  await midia.compartilharTela();
  await terminar();
  midia.pararCompartilhamento();
  await terminar();
  assert.deepEqual(fontesPublicadas(sala()), []);
  assert.equal(capturas[0].trilha.readyState, "ended");
  assert.equal(capturas[0].som.readyState, "ended");
});

// ---------- Recepção: vozes e câmeras de todos, só a tela em destaque (T05 FR-019) ----------

test("vozes e câmeras de todos são assinadas; a tela só de quem está em destaque", async () => {
  const { midia, sala } = await conectada();
  const vozB = sala().publicarRemota("b", "microphone");
  const cameraB = sala().publicarRemota("b", "camera");
  const telaB = sala().publicarRemota("b", "screen_share");
  const somB = sala().publicarRemota("b", "screen_share_audio");
  const telaC = sala().publicarRemota("c", "screen_share");
  assert.deepEqual(
    [vozB, cameraB, telaB, somB, telaC].map((p) => p.isDesired),
    [true, true, false, false, false],
  );

  // A pessoa põe a tela de "b" em destaque.
  midia.atualizarParticipantes([pessoa("a", { assistindo: "b" }), pessoa("b"), pessoa("c")], "a");
  assert.deepEqual([telaB.isDesired, somB.isDesired, telaC.isDesired], [true, true, false]);

  // Troca o destaque para "c": a tela de "b" deixa de chegar.
  midia.atualizarParticipantes([pessoa("a", { assistindo: "c" }), pessoa("b"), pessoa("c")], "a");
  assert.deepEqual([telaB.isDesired, somB.isDesired, telaC.isDesired], [false, false, true]);
});

test("a câmera recebida vira um <video> reaproveitado e a tela é avisada", async () => {
  const { midia, sala, chegadas } = await conectada();
  sala().publicarRemota("b", "camera");
  assert.equal(midia.videoDe("b"), null);
  const trilha = sala().entregar("b", "camera");
  const video = midia.videoDe("b");
  assert.equal(video.tag, "video");
  assert.equal(video.muted, true);
  assert.deepEqual(video.srcObject.getTracks(), [trilha]);
  assert.deepEqual(chegadas, ["b"]);

  // Câmera desligada e ligada de novo: o mesmo elemento recebe a trilha nova.
  sala().emitir("trackUnsubscribed", {}, { source: "camera" }, { identity: "b" });
  assert.equal(video.srcObject, null);
  const nova = sala().entregar("b", "camera");
  assert.equal(midia.videoDe("b"), video);
  assert.deepEqual(video.srcObject.getTracks(), [nova]);
});

test("o vídeo da tela vem da tela, não da câmera, e é o mesmo a cada redesenho", async () => {
  const { midia, sala } = await conectada();
  sala().publicarRemota("b", "camera");
  sala().publicarRemota("b", "screen_share");
  const camera = sala().entregar("b", "camera");
  const tela = sala().entregar("b", "screen_share");
  const { video } = midia.telaDe("b");
  assert.deepEqual(video.srcObject.getTracks(), [tela]);
  assert.deepEqual(midia.videoDe("b").srcObject.getTracks(), [camera]);
  assert.equal(midia.telaDe("b").video, video);
});

test("a voz recebida toca num <audio>; som bloqueado pelo navegador é avisado", async () => {
  const bloqueios = [];
  const elementos = [];
  globalThis.document = {
    createElement: (tag) => {
      const elemento = {
        tag,
        srcObject: null,
        play: () => Promise.reject(Object.assign(new Error("x"), { name: "NotAllowedError" })),
        remove() {},
      };
      elementos.push(elemento);
      return elemento;
    },
    body: { append() {} },
  };
  const salas = [];
  const midia = criarMidia({
    criarSala: (opcoes) => salas[salas.push(new SalaFalsa(opcoes)) - 1],
    aoMudarSomBloqueado: (bloqueado) => bloqueios.push(bloqueado),
  });
  await midia.conectar("ws://midia.teste", "t");
  salas[0].publicarRemota("b", "microphone");
  const voz = salas[0].entregar("b", "microphone");
  await terminar();
  assert.equal(elementos[0].tag, "audio");
  assert.deepEqual(elementos[0].srcObject.getTracks(), [voz]);
  assert.deepEqual(bloqueios, [true]);
});

test("falha ao assinar a mídia de alguém é avisada com a identidade", async () => {
  const { sala, falhas } = await conectada();
  sala().emitir("trackSubscriptionFailed", "TR_x", { identity: "b" });
  assert.deepEqual(falhas, ["b"]);
});

test("quem sai da sala deixa de ter vídeo", async () => {
  const { midia, sala } = await conectada();
  sala().publicarRemota("b", "camera");
  sala().entregar("b", "camera");
  sala().emitir("participantDisconnected", { identity: "b" });
  assert.equal(midia.videoDe("b"), null);
});

// ---------- Qualidade do compartilhamento (T06) ----------

test("compartilhar captura com as restrições da qualidade escolhida", async () => {
  const { midia } = await conectada();
  await midia.compartilharTela(qualidadePorId("720p30"));
  assert.deepEqual(capturas[0].opcoes.video, restricoesDeCaptura(qualidadePorId("720p30")));
});

test("sem qualidade explícita, a captura usa a padrão (1080p · 30 fps)", async () => {
  const { midia } = await conectada();
  await midia.compartilharTela();
  assert.deepEqual(capturas[0].opcoes.video, restricoesDeCaptura(qualidadePorId("1080p30")));
});

test("qualidadeAtiva informa a qualidade e o tamanho real; some ao parar", async () => {
  const { midia } = await conectada();
  await midia.compartilharTela(qualidadePorId("1080p60"));
  capturas[0].trilha.ajustes = { width: 1366, height: 768 };
  assert.deepEqual(midia.qualidadeAtiva(), {
    qualidade: qualidadePorId("1080p60"),
    largura: 1366,
    altura: 768,
  });
  midia.pararCompartilhamento();
  assert.equal(midia.qualidadeAtiva(), null);
});

test("trocar a qualidade aplica na captura e no envio, sem nova captura nem nova publicação", async () => {
  const { midia, sala } = await conectada();
  await midia.compartilharTela(qualidadePorId("720p30"));
  await terminar();
  const [tela] = sala().publicadas;

  await midia.mudarQualidade(qualidadePorId("1080p60"));

  assert.equal(capturas.length, 1, "não abre de novo a escolha de tela");
  assert.equal(sala().publicadas.length, 1, "quem assiste não perde a imagem");
  assert.deepEqual(tela.trilha.restricoes.at(-1), restricoesDeCaptura(qualidadePorId("1080p60")));
  assert.equal(tela.track.sender.parametrosAplicados.at(-1).encodings[0].maxFramerate, 60);
  assert.equal(midia.qualidadeAtiva().qualidade.id, "1080p60");
});

test("se o navegador recusar a qualidade, continua a anterior", async () => {
  const { midia, sala } = await conectada();
  await midia.compartilharTela(qualidadePorId("720p30"));
  await terminar();
  const [tela] = sala().publicadas;
  tela.trilha.falharRestricoes = true;
  const aplicadosAntes = tela.track.sender.parametrosAplicados.length;

  await assert.rejects(midia.mudarQualidade(qualidadePorId("1080p60")));

  assert.equal(midia.qualidadeAtiva().qualidade.id, "720p30");
  assert.equal(tela.track.sender.parametrosAplicados.length, aplicadosAntes);
});

test("trocar a qualidade sem compartilhar não faz nada", async () => {
  const { midia } = await conectada();
  await midia.mudarQualidade(qualidadePorId("1080p60"));
  assert.equal(midia.qualidadeAtiva(), null);
});

// ---------- A própria tela (T07) ----------

test("quem compartilha tem uma prévia muda da própria tela, que some ao parar", async () => {
  const { midia } = await conectada();
  midia.atualizarParticipantes([pessoa("a"), pessoa("b")], "a");
  assert.equal(midia.telaDe("a").video, null);

  await midia.compartilharTela();
  const { video } = midia.telaDe("a");
  assert.ok(video, "a própria tela precisa de um <video> no destaque");
  assert.equal(video.muted, true, "o próprio som não volta para quem compartilha");
  assert.deepEqual(video.srcObject.getTracks(), [capturas[0].trilha]);

  midia.pararCompartilhamento();
  assert.equal(midia.telaDe("a").video, null);
  assert.equal(video.srcObject, null);
});

test("a prévia da própria tela não muda a tela recebida de outra pessoa", async () => {
  const { midia, sala } = await conectada();
  midia.atualizarParticipantes([pessoa("a", { assistindo: "b" }), pessoa("b")], "a");
  sala().publicarRemota("b", "screen_share");
  sala().entregar("b", "screen_share");
  const deB = midia.telaDe("b").video;
  await midia.compartilharTela();
  assert.equal(midia.telaDe("b").video, deB);
  assert.notEqual(midia.telaDe("a").video, deB);
});

// ---------- Encerrar ----------

test("encerrar para as trilhas, desconecta e não conecta mais", async () => {
  const { midia, sala } = await conectada();
  await midia.ligarMicrofone();
  await terminar();
  midia.encerrar();
  assert.equal(capturas[0].trilha.readyState, "ended");
  assert.equal(sala().desconectada, true);
  await midia.conectar("ws://midia.teste", "outro");
  assert.equal(sala().conexoes.length, 1);
});

// ---------- Servidor de mídia fora do ar (US3) ----------

// Relógio falso: o teste avança o tempo e os temporizadores vencidos disparam.
function criarRelogio() {
  let agora = 0;
  let proximoId = 1;
  const pendentes = new Map();
  return {
    agendar(callback, ms) {
      const id = proximoId++;
      pendentes.set(id, { callback, quando: agora + ms });
      return id;
    },
    cancelar(id) {
      pendentes.delete(id);
    },
    avancar(ms) {
      agora += ms;
      for (const [id, { callback, quando }] of [...pendentes]) {
        if (quando > agora) continue;
        pendentes.delete(id);
        callback();
      }
    },
  };
}

function midiaComQuedas() {
  const relogio = criarRelogio();
  const estados = [];
  const pedidos = [];
  const salas = [];
  const midia = criarMidia({
    criarSala: (opcoes) => salas[salas.push(new SalaFalsa(opcoes)) - 1],
    pedirPermissao: () => pedidos.push("pedir-midia"),
    aoMudarEstadoMidia: (estado) => estados.push(estado),
    agendar: relogio.agendar,
    cancelar: relogio.cancelar,
  });
  return { midia, relogio, estados, pedidos, sala: () => salas[0] };
}

test("antes de conectar, a mídia está conectando e não deixa ligar nada", async () => {
  const { midia, estados } = midiaComQuedas();
  await midia.ligarMicrofone();
  await midia.ligarCamera();
  await midia.compartilharTela();
  assert.equal(capturas.length, 0, "nada é capturado");
  await midia.conectar("ws://midia.teste", "t");
  assert.deepEqual(estados, ["conectada"]);
});

test("servidor de mídia não responde ao conectar: indisponível e novo pedido a cada 3 s", async () => {
  const { midia, relogio, estados, pedidos } = midiaComQuedas();
  foraDoAr = true;
  await midia.conectar("ws://midia.teste", "t1");
  assert.deepEqual(estados, ["indisponivel"]);
  assert.deepEqual(pedidos, []);

  relogio.avancar(2999);
  assert.deepEqual(pedidos, []);
  relogio.avancar(1);
  assert.deepEqual(pedidos, ["pedir-midia"]);
  assert.deepEqual(estados, ["indisponivel", "conectando"]);

  // Ainda fora do ar: volta a indisponível e pede de novo 3 s depois.
  await midia.conectar("ws://midia.teste", "t2");
  assert.equal(estados.at(-1), "indisponivel");
  relogio.avancar(3000);
  assert.deepEqual(pedidos, ["pedir-midia", "pedir-midia"]);

  // Voltou.
  foraDoAr = false;
  await midia.conectar("ws://midia.teste", "t3");
  assert.equal(estados.at(-1), "conectada");
  relogio.avancar(10_000);
  assert.equal(pedidos.length, 2, "conectada, não pede mais");
});

test("queda curta (reconecta em menos de 3 s) não deixa a mídia indisponível", async () => {
  const { midia, relogio, estados, sala } = midiaComQuedas();
  await midia.conectar("ws://midia.teste", "t");
  sala().emitir("reconnecting");
  relogio.avancar(2000);
  sala().emitir("reconnected");
  relogio.avancar(5000);
  assert.deepEqual(estados, ["conectada", "reconectando", "conectada"]);
});

test("reconectando por 3 s: indisponível, para a tentativa do LiveKit e passa a tentar sozinho", async () => {
  const { midia, relogio, estados, pedidos, sala } = midiaComQuedas();
  await midia.conectar("ws://midia.teste", "t");
  await midia.ligarMicrofone();
  await terminar();
  sala().emitir("signalReconnecting");
  relogio.avancar(3000);
  assert.deepEqual(estados, ["conectada", "reconectando", "indisponivel"]);
  assert.equal(sala().desconectada, true);
  assert.equal(capturas[0].trilha.readyState, "live", "o microfone continua capturado");
  relogio.avancar(3000);
  assert.deepEqual(pedidos, ["pedir-midia"]);
});

test("desconectado pelo servidor: indisponível na hora", async () => {
  const { midia, estados, sala } = midiaComQuedas();
  await midia.conectar("ws://midia.teste", "t");
  sala().emitir("disconnected");
  assert.deepEqual(estados, ["conectada", "indisponivel"]);
});

test("na volta, o que estava ligado é publicado de novo — a mesma tela, sem nova captura", async () => {
  telaComSom = true;
  const { midia, relogio, sala } = midiaComQuedas();
  await midia.conectar("ws://midia.teste", "t");
  await midia.ligarMicrofone();
  await midia.ligarCamera();
  await midia.compartilharTela();
  await terminar();
  const [microfone, camera, tela] = capturas.map((c) => c.trilha);

  sala().emitir("disconnected");
  sala().publicadas = [];
  // Na queda, a câmera é desligada; microfone e tela continuam capturados.
  midia.desligarCamera();
  relogio.avancar(3000);
  await midia.conectar("ws://midia.teste", "t2");
  await terminar();

  assert.equal(capturas.length, 3, "nenhuma captura nova");
  assert.equal(microfone.readyState, "live");
  assert.equal(tela.readyState, "live");
  assert.equal(camera.readyState, "ended");
  assert.deepEqual(
    sala().publicadas.map((p) => [p.opcoes.source, p.trilha]),
    [
      ["microphone", microfone],
      ["screen_share", tela],
      ["screen_share_audio", capturas[2].som],
    ],
  );
});

test("fora do ar, ligar é recusado sem capturar; desligar continua funcionando", async () => {
  const { midia, sala } = midiaComQuedas();
  await midia.conectar("ws://midia.teste", "t");
  await midia.ligarMicrofone();
  sala().emitir("disconnected");
  await midia.ligarCamera();
  await midia.compartilharTela();
  assert.equal(capturas.length, 1, "só o microfone de antes da queda");
  midia.desligarMicrofone();
  assert.equal(capturas[0].trilha.readyState, "ended");
});

test("encerrar para tudo e não tenta mais", async () => {
  const { midia, relogio, estados, pedidos, sala } = midiaComQuedas();
  await midia.conectar("ws://midia.teste", "t");
  sala().emitir("disconnected");
  midia.encerrar();
  relogio.avancar(30_000);
  assert.deepEqual(pedidos, []);
  assert.equal(estados.at(-1), "encerrada");
});
