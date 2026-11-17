import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import { criarMidia } from "../../public/js/midia.js";
import { qualidadePorId, restricoesDeCaptura } from "../../public/js/qualidades.js";

// Navegador falso, só com o necessário para midia.js. A conexão falsa NUNCA dispara o evento
// `track`: é o caso real em que a lista com `tela` chega e o vídeo da tela nunca é anunciado
// (ex.: compartilhando no Safari e assistindo no Chrome). A recepção não pode depender dele.

class TrilhaFalsa {
  constructor(kind) {
    this.kind = kind;
    this.restricoes = [];
    // Tamanho que a "captura" informa em getSettings().
    this.ajustes = { width: 1920, height: 1080 };
    this.falharRestricoes = false;
  }
  async applyConstraints(restricoes) {
    if (this.falharRestricoes)
      throw Object.assign(new Error("não deu"), { name: "OverconstrainedError" });
    this.restricoes.push(restricoes);
  }
  getSettings() {
    return { ...this.ajustes };
  }
  addEventListener() {}
  stop() {}
}

class EnvioFalso {
  constructor() {
    this.trilha = null;
    this.trilhasRecebidas = [];
    this.parametros = { encodings: [{}] };
    this.parametrosAplicados = [];
  }
  async replaceTrack(trilha) {
    this.trilha = trilha;
    this.trilhasRecebidas.push(trilha);
  }
  getParameters() {
    return this.parametros;
  }
  async setParameters(parametros) {
    this.parametros = parametros;
    this.parametrosAplicados.push(parametros);
  }
}

class TransceptorFalso {
  constructor(kind) {
    this.receiver = { track: new TrilhaFalsa(kind) };
    this.sender = new EnvioFalso();
    this.direction = "sendrecv";
  }
}

class ConexaoFalsa {
  constructor() {
    this.transceptores = [];
    this.localDescription = null;
    this.connectionState = "new";
  }
  addTransceiver(kind) {
    const transceptor = new TransceptorFalso(kind);
    this.transceptores.push(transceptor);
    return transceptor;
  }
  getTransceivers() {
    return [...this.transceptores];
  }
  addEventListener() {}
  // A "oferta" leva os tipos dos canais, para o outro lado criá-los na mesma ordem.
  async setLocalDescription() {
    const type = this.remota?.type === "offer" ? "answer" : "offer";
    const sdp = JSON.stringify(this.transceptores.map((t) => t.receiver.track.kind));
    this.localDescription = { type, sdp, toJSON: () => ({ type, sdp }) };
  }
  async setRemoteDescription(descricao) {
    this.remota = descricao;
    if (descricao.type === "offer" && this.transceptores.length === 0) {
      for (const kind of JSON.parse(descricao.sdp)) this.addTransceiver(kind);
    }
  }
  async addIceCandidate() {}
  close() {}
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

// Captura de tela falsa: registra as opções pedidas e devolve uma trilha de vídeo.
const capturas = [];
function capturarTelaFalsa(opcoes) {
  const trilha = new TrilhaFalsa("video");
  capturas.push({ opcoes, trilha });
  return Promise.resolve(new FluxoFalso([trilha]));
}

function elementoFalso(tag) {
  return { tag, srcObject: null, play: () => Promise.resolve(), remove() {} };
}

const originais = {};
beforeEach(() => {
  capturas.length = 0;
  for (const nome of ["RTCPeerConnection", "MediaStream", "document", "navigator"]) {
    originais[nome] = Object.getOwnPropertyDescriptor(globalThis, nome);
  }
  globalThis.RTCPeerConnection = ConexaoFalsa;
  globalThis.MediaStream = FluxoFalso;
  globalThis.document = { createElement: elementoFalso, body: { append() {} } };
  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getDisplayMedia: capturarTelaFalsa } },
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

const pessoa = (id, tela = null) => ({ id, nome: id, assistindo: null, tela });

function novaMidia() {
  const sinais = [];
  const chegadas = [];
  const midia = criarMidia({
    enviarSinal: (para, dados) => sinais.push({ para, dados }),
    aoChegarVideo: (id) => chegadas.push(id),
  });
  return { midia, sinais, chegadas };
}

// Deixa a fila de sinais de cada par terminar.
const terminarFila = () => esperar(0);

test("quem inicia a conexão já tem o vídeo da tela sem o evento track", async () => {
  const { midia, chegadas } = novaMidia();
  // "a" < "b": "a" inicia a conexão. A lista já diz que "b" está compartilhando.
  midia.atualizarParticipantes([pessoa("a"), pessoa("b", { inicio: 1, som: true })], "a");
  await terminarFila();

  const { video } = midia.telaDe("b");
  assert.ok(video, "o destaque precisa de um <video>, não do aviso vazio");
  assert.equal(video.tag, "video");
  assert.equal(video.srcObject.getTracks()[0].kind, "video");
  assert.ok(chegadas.includes("b"), "a tela é avisada para se redesenhar");
});

test("quem responde passa a ter o vídeo da tela quando a oferta chega, e a tela é avisada", async () => {
  const outro = novaMidia();
  outro.midia.atualizarParticipantes([pessoa("a"), pessoa("b")], "a");
  await terminarFila();
  const oferta = outro.sinais.find(({ dados }) => dados.descricao?.type === "offer");

  // "b" recebe a lista com "a" compartilhando ANTES da oferta: ainda não há canal nem vídeo.
  const { midia, chegadas } = novaMidia();
  midia.atualizarParticipantes([pessoa("a", { inicio: 1, som: false }), pessoa("b")], "b");
  assert.equal(midia.telaDe("a").video, null);

  midia.receberSinal("a", oferta.dados);
  await terminarFila();

  assert.ok(midia.telaDe("a").video, "o vídeo da tela aparece assim que o canal existe");
  assert.deepEqual(chegadas, ["a"], "a tela é avisada para se redesenhar");
});

test("o vídeo da tela vem do canal da tela, não do da câmera", async () => {
  const { midia } = novaMidia();
  midia.atualizarParticipantes([pessoa("a"), pessoa("b")], "a");
  await terminarFila();

  const tela = midia.telaDe("b").video.srcObject.getTracks()[0];
  const camera = midia.videoDe("b").srcObject.getTracks()[0];
  assert.notEqual(tela, camera);
});

test("o mesmo <video> é devolvido a cada redesenho (trocar o destaque não perde a imagem)", async () => {
  const { midia } = novaMidia();
  midia.atualizarParticipantes([pessoa("a"), pessoa("b"), pessoa("c")], "a");
  await terminarFila();

  // Trocar o destaque entre "b" e "c" e voltar: cada um sempre tem o seu vídeo, e é o mesmo.
  const primeiroB = midia.telaDe("b").video;
  assert.ok(midia.telaDe("c").video);
  assert.equal(midia.telaDe("b").video, primeiroB);
});

// ---------- Qualidade do compartilhamento (T06) ----------

// "a" compartilha; "b" está com a tela de "a" em destaque.
const assistindoA = (id) => ({ ...pessoa(id), assistindo: "a" });

// Guarda as conexões criadas, por ordem, para inspecionar o que foi enviado a cada par.
function registrarConexoes() {
  const conexoes = [];
  globalThis.RTCPeerConnection = class extends ConexaoFalsa {
    constructor(...args) {
      super(...args);
      conexoes.push(this);
    }
  };
  return conexoes;
}

async function compartilhandoComBrunoAssistindo(qualidade) {
  const conexoes = registrarConexoes();
  const { midia } = novaMidia();
  midia.atualizarParticipantes([pessoa("a", { inicio: 1, som: false }), assistindoA("b")], "a");
  await midia.compartilharTela(qualidade);
  await terminarFila();
  const envio = conexoes[0].transceptores[2].sender;
  return { midia, envio, trilha: capturas.at(-1).trilha };
}

test("compartilhar captura com as restrições da qualidade escolhida", async () => {
  const { midia } = novaMidia();
  await midia.compartilharTela(qualidadePorId("720p30"));
  assert.deepEqual(capturas[0].opcoes.video, restricoesDeCaptura(qualidadePorId("720p30")));
});

test("sem qualidade explícita, a captura usa a padrão (1080p · 30 fps)", async () => {
  const { midia } = novaMidia();
  await midia.compartilharTela();
  assert.deepEqual(capturas[0].opcoes.video, restricoesDeCaptura(qualidadePorId("1080p30")));
});

test("quem assiste recebe o envio limitado pela qualidade e mantendo a fluidez", async () => {
  const { envio, trilha } = await compartilhandoComBrunoAssistindo(qualidadePorId("720p30"));
  assert.equal(envio.trilha, trilha);
  const ultimo = envio.parametrosAplicados.at(-1);
  assert.equal(ultimo.degradationPreference, "maintain-framerate");
  assert.equal(ultimo.encodings[0].maxFramerate, 30);
  assert.equal(ultimo.encodings[0].maxBitrate, 2_500_000);
});

test("qualidadeAtiva informa a qualidade e o tamanho real; some ao parar", async () => {
  const { midia } = novaMidia();
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

// ---------- Trocar a qualidade durante o compartilhamento (US2) ----------

test("trocar a qualidade aplica na captura em uso, sem nova captura nem troca de trilha", async () => {
  const { midia, envio, trilha } = await compartilhandoComBrunoAssistindo(qualidadePorId("720p30"));
  const trilhasAntes = envio.trilhasRecebidas.length;

  await midia.mudarQualidade(qualidadePorId("1080p60"));

  assert.equal(capturas.length, 1, "não abre de novo a escolha de tela");
  assert.deepEqual(trilha.restricoes.at(-1), restricoesDeCaptura(qualidadePorId("1080p60")));
  assert.equal(envio.trilhasRecebidas.length, trilhasAntes, "quem assiste não perde a imagem");
  assert.equal(envio.parametrosAplicados.at(-1).encodings[0].maxFramerate, 60);
  assert.equal(midia.qualidadeAtiva().qualidade.id, "1080p60");
});

test("se o navegador recusar a qualidade, continua a anterior", async () => {
  const { midia, envio, trilha } = await compartilhandoComBrunoAssistindo(qualidadePorId("720p30"));
  trilha.falharRestricoes = true;
  const aplicadosAntes = envio.parametrosAplicados.length;

  await assert.rejects(midia.mudarQualidade(qualidadePorId("1080p60")));

  assert.equal(midia.qualidadeAtiva().qualidade.id, "720p30");
  assert.equal(envio.parametrosAplicados.length, aplicadosAntes);
});

test("quem passa a assistir depois de uma troca recebe a qualidade atual", async () => {
  const conexoes = registrarConexoes();
  const { midia } = novaMidia();
  const lista = [pessoa("a", { inicio: 1, som: false }), pessoa("b")];
  midia.atualizarParticipantes(lista, "a");
  await midia.compartilharTela(qualidadePorId("720p30"));
  await midia.mudarQualidade(qualidadePorId("1080p60"));

  midia.atualizarParticipantes([lista[0], assistindoA("b")], "a");
  await terminarFila();

  const envio = conexoes[0].transceptores[2].sender;
  assert.equal(envio.parametrosAplicados.at(-1).encodings[0].maxFramerate, 60);
});

test("trocar a qualidade sem compartilhar não faz nada", async () => {
  const { midia } = novaMidia();
  await midia.mudarQualidade(qualidadePorId("1080p60"));
  assert.equal(midia.qualidadeAtiva(), null);
});
