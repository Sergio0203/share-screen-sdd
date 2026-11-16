import { TEXTOS } from "./textos.js";
import { copiarAoCriar, copiarLink } from "./copiar.js";

const DURACAO_CONFIRMACAO_MS = 2500;

const telaInicio = document.getElementById("tela-inicio");
const telaSala = document.getElementById("tela-sala");
const areaMensagem = document.getElementById("mensagem");

let temporizadorMensagem = null;
let conexaoAtual = null;

// ---------- Mensagens ----------

function mostrarMensagem(texto, { temporaria = false } = {}) {
  // Cancelar o temporizador anterior evita que uma confirmação repetida suma antes da hora.
  clearTimeout(temporizadorMensagem);
  areaMensagem.textContent = texto;
  if (temporaria) {
    temporizadorMensagem = setTimeout(
      () => (areaMensagem.textContent = ""),
      DURACAO_CONFIRMACAO_MS,
    );
  }
}

function limparMensagem() {
  clearTimeout(temporizadorMensagem);
  areaMensagem.textContent = "";
}

// ---------- Utilidades ----------

function criarElemento(tag, propriedades = {}, filhos = []) {
  const elemento = document.createElement(tag);
  Object.assign(elemento, propriedades);
  elemento.append(...filhos);
  return elemento;
}

function chaveDoToken(idSala) {
  return `anfitriao:${idSala}`;
}

function lerToken(idSala) {
  try {
    return localStorage.getItem(chaveDoToken(idSala)) ?? undefined;
  } catch {
    return undefined;
  }
}

function salvarToken(idSala, token) {
  try {
    localStorage.setItem(chaveDoToken(idSala), token);
  } catch {
    // Sem armazenamento, a pessoa só deixa de ser reconhecida como anfitriã ao recarregar.
  }
}

function idDaSalaNoCaminho() {
  const encontrado = location.pathname.match(/^\/sala\/([^/]+)$/);
  return encontrado ? encontrado[1] : null;
}

function irPara(caminho) {
  history.pushState(null, "", caminho);
  renderizar();
}

// ---------- Roteamento ----------

function renderizar() {
  encerrarConexao();
  limparMensagem();
  const idSala = idDaSalaNoCaminho();
  if (idSala) mostrarTelaSala(idSala);
  else mostrarTelaInicio();
}

// ---------- Tela inicial ----------

function mostrarTelaInicio() {
  telaSala.hidden = true;
  telaSala.replaceChildren();

  const botao = criarElemento("button", { className: "principal", textContent: TEXTOS.criarSala });
  botao.addEventListener("click", () => criarSala(botao));

  telaInicio.replaceChildren(botao);
  telaInicio.hidden = false;
}

function criarSala(botao) {
  // Desabilitar já no clique impede que cliques repetidos criem várias salas (FR-011).
  botao.disabled = true;
  botao.textContent = TEXTOS.criandoSala;
  limparMensagem();

  const promessaSala = fetch("/api/salas", { method: "POST" }).then((resposta) => {
    if (resposta.status !== 201) throw new Error(`Status inesperado: ${resposta.status}`);
    return resposta.json();
  });
  const promessaLink = promessaSala.then((sala) => sala.link);
  promessaLink.catch(() => {}); // a falha é tratada abaixo, em promessaSala

  // Precisa ser chamada ainda dentro do gesto do clique (ver copiar.js).
  const promessaCopia = copiarAoCriar(promessaLink);

  promessaSala.then(
    (sala) => {
      salvarToken(sala.id, sala.tokenAnfitriao);
      history.pushState(null, "", `/sala/${sala.id}`);
      const tela = mostrarTelaSala(sala.id);
      promessaCopia.then((copiou) => {
        if (copiou) mostrarMensagem(TEXTOS.linkCopiado, { temporaria: true });
        else tela.destacarBotaoCopiar();
      });
    },
    () => {
      botao.disabled = false;
      botao.textContent = TEXTOS.criarSala;
      mostrarMensagem(TEXTOS.erroCriar);
    },
  );
}

// ---------- Tela da sala ----------

function mostrarTelaSala(idSala) {
  telaInicio.hidden = true;
  telaInicio.replaceChildren();

  const link = `${location.origin}/sala/${idSala}`;

  const titulo = criarElemento("h1", { textContent: TEXTOS.tituloSala });
  const avisoAnfitriao = criarElemento("p", {
    className: "anfitriao",
    textContent: TEXTOS.voceEAnfitriao,
    hidden: true,
  });
  const campoLink = criarElemento("input", { value: link, readOnly: true });
  campoLink.setAttribute("aria-label", TEXTOS.rotuloLink);
  campoLink.addEventListener("focus", () => campoLink.select());

  const botaoCopiar = criarElemento("button", { textContent: TEXTOS.copiarLink });
  botaoCopiar.addEventListener("click", async () => {
    if (await copiarLink(link)) {
      mostrarMensagem(TEXTOS.linkCopiado, { temporaria: true });
    } else {
      mostrarMensagem(TEXTOS.erroCopiar);
      campoLink.select();
    }
  });

  // O link e o botão ficam no topo da sala, sempre visíveis (FR-009).
  const linhaLink = criarElemento("div", { className: "linha-link" }, [campoLink, botaoCopiar]);
  telaSala.replaceChildren(titulo, linhaLink, avisoAnfitriao);
  telaSala.hidden = false;

  conectar(idSala, avisoAnfitriao);

  return {
    destacarBotaoCopiar: () => botaoCopiar.classList.add("destaque"),
  };
}

function mostrarSalaInexistente() {
  const aviso = criarElemento("p", { textContent: TEXTOS.salaInexistente });
  const botao = criarElemento("button", {
    className: "principal",
    textContent: TEXTOS.criarNovaSala,
  });
  botao.addEventListener("click", () => irPara("/"));
  telaSala.replaceChildren(aviso, botao);
}

// ---------- Conexão com a sala (contracts/websocket.md) ----------

function conectar(idSala, avisoAnfitriao) {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  const conexao = new WebSocket(`${protocolo}//${location.host}/ws`);
  conexaoAtual = conexao;
  let recusada = false;

  conexao.addEventListener("open", () => {
    conexao.send(JSON.stringify({ tipo: "entrar", idSala, tokenAnfitriao: lerToken(idSala) }));
  });

  conexao.addEventListener("message", (evento) => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.tipo === "entrou") {
      avisoAnfitriao.hidden = !mensagem.anfitriao;
    } else if (mensagem.tipo === "erro") {
      recusada = true;
      if (mensagem.codigo === "sala-inexistente") mostrarSalaInexistente();
      else mostrarMensagem(TEXTOS.conexaoPerdida);
    }
  });

  conexao.addEventListener("close", () => {
    // Só avisa se for uma queda inesperada da conexão ainda em uso.
    if (conexaoAtual === conexao && !recusada) mostrarMensagem(TEXTOS.conexaoPerdida);
  });
}

function encerrarConexao() {
  const conexao = conexaoAtual;
  conexaoAtual = null;
  conexao?.close();
}

// Ao recarregar ou fechar a aba, o fechamento da conexão é esperado: não mostrar erro.
window.addEventListener("pagehide", () => {
  conexaoAtual = null;
});
window.addEventListener("popstate", renderizar);

renderizar();
