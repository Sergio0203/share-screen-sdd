import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { criarAreaTela } from "../../public/js/area-tela.js";
import { mostrarQuadros } from "../../public/js/area-videos.js";

// DOM falso, só com o necessário para area-tela.js e area-videos.js. Reproduz o comportamento do
// navegador que causava o bug: um <video> que sai da página é pausado, e ao voltar continua
// pausado até alguém chamar play() — ficava congelado na última imagem.

class ElementoFalso {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.filhos = [];
    this.pai = null;
    this.hidden = false;
    this.paused = false;
    this.vezesTocado = 0;
    const classes = new Set();
    this.classList = {
      add: (...nomes) => nomes.forEach((nome) => classes.add(nome)),
      remove: (...nomes) => nomes.forEach((nome) => classes.delete(nome)),
      contains: (nome) => classes.has(nome),
      toggle: (nome, ligar = !classes.has(nome)) => {
        if (ligar) classes.add(nome);
        else classes.delete(nome);
        return ligar;
      },
    };
    this.style = {};
    this.textoProprio = undefined;
  }
  // Como no navegador: sem texto próprio, o texto é o dos filhos (ex.: ícone + <span>).
  get textContent() {
    return this.textoProprio ?? this.filhos.map((filho) => filho.textContent ?? "").join("");
  }
  set textContent(texto) {
    this.textoProprio = texto;
  }
  get conectado() {
    return this.pai === null ? this === document.body : this.pai.conectado;
  }
  get isConnected() {
    return this.conectado;
  }
  get children() {
    return this.filhos;
  }
  getBoundingClientRect() {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  remove() {
    this.pai?.filhos.splice(this.pai.filhos.indexOf(this), 1);
    this.pai = null;
    // Quem sai da página é pausado, como no navegador.
    pausarVideos(this);
  }
  setAttribute() {}
  addEventListener() {}
  removeEventListener() {}
  play() {
    this.paused = false;
    this.vezesTocado += 1;
    return Promise.resolve();
  }
  append(...filhos) {
    for (const filho of filhos) {
      if (typeof filho !== "object") continue;
      filho.pai?.filhos.splice(filho.pai.filhos.indexOf(filho), 1);
      filho.pai = this;
      this.filhos.push(filho);
    }
  }
  prepend(...filhos) {
    const resto = this.filhos;
    this.filhos = [];
    this.append(...filhos);
    this.filhos.push(...resto);
  }
  replaceChildren(...filhos) {
    const antigos = this.filhos;
    this.filhos = [];
    for (const antigo of antigos) antigo.pai = null;
    this.append(...filhos);
    // Quem saiu da página (e não voltou na mesma chamada) é pausado, como no navegador.
    for (const antigo of antigos) if (!antigo.conectado) pausarVideos(antigo);
  }
}

function pausarVideos(elemento) {
  if (elemento.tagName === "VIDEO") elemento.paused = true;
  for (const filho of elemento.filhos) pausarVideos(filho);
}

let documentoOriginal;
beforeEach(() => {
  // A área da tela redesenha os recados quando muda de tamanho (T07).
  globalThis.ResizeObserver = class {
    observe() {}
  };
  documentoOriginal = Object.getOwnPropertyDescriptor(globalThis, "document");
  globalThis.document = {
    createElement: (tag) => new ElementoFalso(tag),
    createElementNS: (_ns, tag) => new ElementoFalso(tag),
    addEventListener() {},
    fullscreenEnabled: false,
    fullscreenElement: null,
  };
  document.body = new ElementoFalso("body");
});
afterEach(() => {
  if (documentoOriginal) Object.defineProperty(globalThis, "document", documentoOriginal);
  else delete globalThis.document;
  delete globalThis.ResizeObserver;
});

function videoRecebido() {
  return new ElementoFalso("video");
}

// ---------- Tela compartilhada ----------

function novaAreaTela(videos) {
  const area = criarAreaTela({ aoEscolher() {} });
  document.body.append(area.elemento);
  const opcoes = { telaDe: (id) => ({ video: videos[id] ?? null }), idsComFalha: [] };
  const mostrar = (destaque, miniaturas = []) =>
    area.atualizar({ destaque, miniaturas, compartilhando: false }, opcoes);
  return { mostrar, opcoes, area };
}

const compartilhamento = (id) => ({ id, nome: id, som: true, inicio: 1 });

test("parar e compartilhar de novo: o vídeo da tela volta a tocar", () => {
  const video = videoRecebido();
  const { mostrar } = novaAreaTela({ ana: video });

  mostrar(compartilhamento("ana"));
  assert.ok(video.conectado);

  mostrar(null); // Ana parou: o destaque sai da página e o navegador pausa o vídeo.
  assert.equal(video.paused, true);

  mostrar(compartilhamento("ana")); // Ana compartilhou de novo: o mesmo <video> volta.
  assert.ok(video.conectado);
  assert.equal(video.paused, false, "não pode ficar congelado na última imagem");
});

test("trocar o destaque pela miniatura e voltar: o vídeo volta a tocar", () => {
  const ana = videoRecebido();
  const bruno = videoRecebido();
  const { mostrar } = novaAreaTela({ ana, bruno });

  mostrar(compartilhamento("ana"), [compartilhamento("bruno")]);
  mostrar(compartilhamento("bruno"), [compartilhamento("ana")]);
  assert.equal(ana.paused, true);
  assert.equal(bruno.paused, false);

  mostrar(compartilhamento("ana"), [compartilhamento("bruno")]);
  assert.equal(ana.paused, false);
});

test("o vídeo de um destaque com falha não é tocado fora da página", () => {
  const video = videoRecebido();
  const area = criarAreaTela({ aoEscolher() {} });
  document.body.append(area.elemento);
  video.paused = true;

  area.atualizar(
    { destaque: compartilhamento("ana"), miniaturas: [], compartilhando: false },
    { telaDe: () => ({ video }), idsComFalha: ["ana"] },
  );
  assert.equal(video.vezesTocado, 0);
});

// ---------- Câmeras ----------

function novaAreaVideos(videos) {
  const area = new ElementoFalso("section");
  document.body.append(area);
  const midia = { previa: () => null, videoDe: (id) => videos[id] ?? null };
  // `ids`: quem está na sala; `comCamera`: quem está com a câmera ligada (padrão: todos).
  const quadro = (comCamera) => (id) => ({
    id,
    nome: id,
    rotulo: id,
    ehVoce: false,
    cameraLigada: comCamera.includes(id),
    falhou: false,
    inicial: id[0].toUpperCase(),
  });
  return {
    area,
    mostrar: (ids, comCamera = ids) => mostrarQuadros(area, ids.map(quadro(comCamera)), midia),
  };
}

// Vídeos dentro de um elemento, em qualquer profundidade.
function videosEm(elemento) {
  if (elemento.tagName === "VIDEO") return [elemento];
  return elemento.filhos.flatMap(videosEm);
}

test("desligar e ligar a câmera de novo: o vídeo da câmera volta a tocar", () => {
  const video = videoRecebido();
  const { mostrar, area } = novaAreaVideos({ bruno: video });

  mostrar(["bruno"]);
  // T09 FR-017: Bruno desligou a câmera; o quadro continua, com o avatar, e o vídeo sai dele.
  mostrar(["bruno"], []);
  assert.equal(video.paused, true);
  assert.equal(area.filhos.length, 1, "o quadro continua na grade");
  assert.deepEqual(videosEm(area), [], "nenhuma imagem antiga fica no quadro");

  mostrar(["bruno"]); // Bruno ligou de novo: o mesmo <video> volta.
  assert.equal(video.paused, false, "não pode ficar congelado na última imagem");
});

test("quem sai da sala volta com o vídeo tocando", () => {
  const video = videoRecebido();
  const { mostrar } = novaAreaVideos({ bruno: video });

  mostrar(["bruno"]);
  mostrar([]); // Bruno saiu: o quadro sai da página (com animação) e o vídeo é pausado.
  mostrar(["bruno"]);
  assert.equal(video.paused, false, "não pode ficar congelado na última imagem");
});

test("redesenhar sem tirar o quadro da página não chama play à toa", () => {
  const video = videoRecebido();
  const { mostrar } = novaAreaVideos({ bruno: video });

  mostrar(["bruno"]);
  mostrar(["bruno"]);
  assert.equal(video.vezesTocado, 0);
});

test("atualizar a lista não recria os quadros de quem continua na sala", () => {
  const { mostrar, area } = novaAreaVideos({});

  mostrar(["ana", "bruno"], []);
  const [quadroAna, quadroBruno] = area.filhos;
  mostrar(["ana", "bruno"], []);
  assert.deepEqual(area.filhos, [quadroAna, quadroBruno]);
});

// ---------- Qualidade ativa (T06) ----------

function textosNaArea(area) {
  return area.elemento.filhos.map((filho) => filho.textContent);
}

test("quem compartilha vê a qualidade ativa junto do aviso", () => {
  const area = criarAreaTela({ aoEscolher() {} });
  document.body.append(area.elemento);
  const opcoes = { telaDe: () => ({ video: null }), idsComFalha: [] };

  area.atualizar(
    { destaque: null, miniaturas: [], compartilhando: true, qualidade: "Qualidade: 720p · 30 fps" },
    opcoes,
  );
  const textos = textosNaArea(area);
  assert.ok(textos.includes("Qualidade: 720p · 30 fps"));
  assert.ok(
    textos.indexOf("Qualidade: 720p · 30 fps") > textos.findIndex((t) => /compartilhando/.test(t)),
    "logo depois do aviso",
  );

  area.atualizar({ destaque: null, miniaturas: [], compartilhando: true }, opcoes);
  assert.ok(!textosNaArea(area).some((t) => /^Qualidade:/.test(t ?? "")));

  area.atualizar(
    {
      destaque: null,
      miniaturas: [],
      compartilhando: false,
      qualidade: "Qualidade: 720p · 30 fps",
    },
    opcoes,
  );
  assert.equal(area.elemento.filhos.length, 0);
});
