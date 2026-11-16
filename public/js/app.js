import { TEXTOS } from "./textos.js";
import { copiarAoCriar, copiarLink } from "./copiar.js";
import { NOME_MAXIMO, motivoNomeInvalido, normalizarNome } from "./nome.js";
import { rotularParticipantes, souAnfitriao } from "./participantes.js";

const DURACAO_CONFIRMACAO_MS = 2500;
const CHAVE_NOME = "nomeExibicao";

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

// localStorage pode estar indisponível (ex.: bloqueado pelo navegador): nesse caso o app funciona,
// só não lembra o nome nem a chave ao recarregar.
function lerArmazenado(chave) {
  try {
    return localStorage.getItem(chave) ?? undefined;
  } catch {
    return undefined;
  }
}

function salvarArmazenado(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Ver comentário em lerArmazenado.
  }
}

function chaveDaSala(idSala) {
  return `sala:${idSala}`;
}

function idDaSalaNoCaminho() {
  const encontrado = location.pathname.match(/^\/sala\/([^/]+)$/);
  return encontrado ? encontrado[1] : null;
}

function irPara(caminho) {
  history.pushState(null, "", caminho);
  renderizar();
}

// Mostra os elementos na área da sala (usada por todas as telas de /sala/<id>).
function mostrarNaSala(...elementos) {
  telaInicio.hidden = true;
  telaInicio.replaceChildren();
  telaSala.replaceChildren(...elementos);
  telaSala.hidden = false;
}

// ---------- Campo de nome (página inicial e tela de nome) ----------

function criarCampoNome(aoConfirmar) {
  const campo = criarElemento("input", {
    id: "campo-nome",
    maxLength: NOME_MAXIMO,
    autocomplete: "nickname",
    value: lerArmazenado(CHAVE_NOME) ?? "",
  });
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") aoConfirmar();
  });
  const rotulo = criarElemento("label", { htmlFor: "campo-nome", textContent: TEXTOS.seuNome });
  return { campo, rotulo };
}

// Valida o campo; se o nome for inválido, avisa e devolve null. Se for válido, lembra o nome.
function lerNomeDoCampo(campo) {
  const motivo = motivoNomeInvalido(campo.value);
  if (motivo !== null) {
    mostrarMensagem(motivo === "longo" ? TEXTOS.nomeLongo : TEXTOS.nomeVazio);
    campo.focus();
    return null;
  }
  const nome = normalizarNome(campo.value);
  salvarArmazenado(CHAVE_NOME, nome);
  return nome;
}

// ---------- Roteamento ----------

function renderizar() {
  encerrarConexao();
  limparMensagem();
  const idSala = idDaSalaNoCaminho();
  if (idSala) abrirSala(idSala);
  else mostrarTelaInicio();
}

function abrirSala(idSala) {
  const nome = lerArmazenado(CHAVE_NOME);
  // Já entrou nesta sala neste navegador: volta direto, com o mesmo nome (FR-007).
  if (lerArmazenado(chaveDaSala(idSala)) && nome) mostrarTelaSala(idSala, nome);
  else verificarSala(idSala);
}

// Antes de pedir o nome, confere se a sala existe (contracts/http.md).
async function verificarSala(idSala) {
  let resposta;
  try {
    resposta = await fetch(`/api/salas/${encodeURIComponent(idSala)}`);
  } catch {
    resposta = null;
  }
  if (idDaSalaNoCaminho() !== idSala) return; // a pessoa já navegou para outra tela

  if (resposta?.status === 404) {
    mostrarSalaInexistente();
  } else if (resposta?.ok) {
    const { cheia } = await resposta.json();
    if (cheia) mostrarSalaCheia(idSala);
    else mostrarTelaNome(idSala);
  } else {
    mostrarErroComNovaTentativa(TEXTOS.erroVerificarSala, () => verificarSala(idSala));
  }
}

// ---------- Página inicial ----------

function mostrarTelaInicio() {
  telaSala.hidden = true;
  telaSala.replaceChildren();

  const botao = criarElemento("button", { className: "principal", textContent: TEXTOS.criarSala });
  const { campo, rotulo } = criarCampoNome(() => botao.click());
  botao.addEventListener("click", () => criarSala(botao, campo));

  const linha = criarElemento("div", { className: "linha-nome" }, [campo, botao]);
  telaInicio.replaceChildren(rotulo, linha);
  telaInicio.hidden = false;
}

function criarSala(botao, campo) {
  if (botao.disabled) return;
  // Validação síncrona: a cópia automática precisa começar ainda dentro do gesto do clique.
  const nome = lerNomeDoCampo(campo);
  if (nome === null) return;

  // Desabilitar já no clique impede que cliques repetidos criem várias salas.
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
      salvarArmazenado(chaveDaSala(sala.id), sala.chave);
      history.pushState(null, "", `/sala/${sala.id}`);
      const tela = mostrarTelaSala(sala.id, nome);
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

// ---------- Tela de nome ----------

function mostrarTelaNome(idSala) {
  const botao = criarElemento("button", {
    className: "principal",
    textContent: TEXTOS.entrarNaSala,
  });
  const { campo, rotulo } = criarCampoNome(() => botao.click());
  botao.addEventListener("click", () => {
    const nome = lerNomeDoCampo(campo);
    if (nome === null) return;
    limparMensagem();
    mostrarTelaSala(idSala, nome);
  });

  const titulo = criarElemento("h1", { textContent: TEXTOS.tituloEntrar });
  const linha = criarElemento("div", { className: "linha-nome" }, [campo, botao]);
  mostrarNaSala(titulo, rotulo, linha);
  campo.focus();
}

// ---------- Tela da sala ----------

function mostrarTelaSala(idSala, nome) {
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

  const tituloLista = criarElemento("h2", { textContent: TEXTOS.tituloLista(0) });
  const lista = criarElemento("ul", { id: "lista-participantes" });

  // O link e o botão ficam no topo da sala, sempre visíveis.
  const linhaLink = criarElemento("div", { className: "linha-link" }, [campoLink, botaoCopiar]);
  mostrarNaSala(titulo, linhaLink, avisoAnfitriao, tituloLista, lista);

  conectar(idSala, nome, {
    aoReceberLista(participantes, idVoce) {
      tituloLista.textContent = TEXTOS.tituloLista(participantes.length);
      lista.replaceChildren(
        ...rotularParticipantes(participantes, idVoce).map((item) =>
          criarElemento("li", { textContent: item.texto, className: item.ehVoce ? "voce" : "" }),
        ),
      );
      avisoAnfitriao.hidden = !souAnfitriao(participantes, idVoce);
    },
  });

  return {
    destacarBotaoCopiar: () => botaoCopiar.classList.add("destaque"),
  };
}

// ---------- Telas de erro ----------

function mostrarSalaInexistente() {
  const aviso = criarElemento("p", { textContent: TEXTOS.salaInexistente });
  const botao = criarElemento("button", {
    className: "principal",
    textContent: TEXTOS.criarNovaSala,
  });
  botao.addEventListener("click", () => irPara("/"));
  mostrarNaSala(aviso, botao);
}

function mostrarSalaCheia(idSala) {
  const titulo = criarElemento("h1", { textContent: TEXTOS.salaCheiaTitulo });
  const texto = criarElemento("p", { textContent: TEXTOS.salaCheiaTexto });
  const botao = criarElemento("button", {
    className: "principal",
    textContent: TEXTOS.tentarDeNovo,
  });
  botao.addEventListener("click", () => {
    limparMensagem();
    abrirSala(idSala);
  });
  mostrarNaSala(titulo, texto, botao);
}

function mostrarErroComNovaTentativa(texto, tentarDeNovo) {
  const aviso = criarElemento("p", { textContent: texto });
  const botao = criarElemento("button", {
    className: "principal",
    textContent: TEXTOS.tentarDeNovo,
  });
  botao.addEventListener("click", tentarDeNovo);
  mostrarNaSala(aviso, botao);
}

function mostrarAviso(texto) {
  mostrarNaSala(criarElemento("p", { textContent: texto }));
}

// ---------- Conexão com a sala (contracts/websocket.md) ----------

function conectar(idSala, nome, { aoReceberLista }) {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  const conexao = new WebSocket(`${protocolo}//${location.host}/ws`);
  conexaoAtual = conexao;
  let recusada = false;
  let idVoce = null;

  conexao.addEventListener("open", () => {
    const chave = lerArmazenado(chaveDaSala(idSala));
    conexao.send(JSON.stringify({ tipo: "entrar", idSala, nome, chave }));
  });

  conexao.addEventListener("message", (evento) => {
    const mensagem = JSON.parse(evento.data);
    if (mensagem.tipo === "entrou") {
      idVoce = mensagem.voce;
      salvarArmazenado(chaveDaSala(idSala), mensagem.chave);
    } else if (mensagem.tipo === "participantes") {
      aoReceberLista(mensagem.lista, idVoce);
    } else if (mensagem.tipo === "erro") {
      recusada = true;
      tratarErro(idSala, mensagem.codigo);
    }
  });

  conexao.addEventListener("close", () => {
    // Só avisa se for uma queda inesperada da conexão ainda em uso.
    if (conexaoAtual === conexao && !recusada) mostrarMensagem(TEXTOS.conexaoPerdida);
  });
}

function tratarErro(idSala, codigo) {
  if (codigo === "sala-inexistente") {
    mostrarSalaInexistente();
  } else if (codigo === "sala-cheia") {
    mostrarSalaCheia(idSala);
  } else if (codigo === "nome-invalido") {
    mostrarTelaNome(idSala);
    mostrarMensagem(TEXTOS.nomeVazio);
  } else if (codigo === "aberta-em-outra-aba") {
    mostrarAviso(TEXTOS.abertaEmOutraAba);
  } else {
    mostrarMensagem(TEXTOS.conexaoPerdida);
  }
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
