import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import { criarMidia } from "../../public/js/midia.js";

// Navegador falso, só com o necessário para midia.js. A conexão falsa NUNCA dispara o evento
// `track`: é o caso real em que a lista com `tela` chega e o vídeo da tela nunca é anunciado
// (ex.: compartilhando no Safari e assistindo no Chrome). A recepção não pode depender dele.

class TrilhaFalsa {
  constructor(kind) {
    this.kind = kind;
  }
}

class TransceptorFalso {
  constructor(kind) {
    this.receiver = { track: new TrilhaFalsa(kind) };
    this.sender = { replaceTrack: async () => {} };
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
}

function elementoFalso(tag) {
  return { tag, srcObject: null, play: () => Promise.resolve(), remove() {} };
}

const originais = {};
beforeEach(() => {
  for (const nome of ["RTCPeerConnection", "MediaStream", "document"]) {
    originais[nome] = Object.getOwnPropertyDescriptor(globalThis, nome);
  }
  globalThis.RTCPeerConnection = ConexaoFalsa;
  globalThis.MediaStream = FluxoFalso;
  globalThis.document = { createElement: elementoFalso, body: { append() {} } };
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
