import { TEXTOS } from "./textos.js";
import { copiarAoCriar, copiarLink } from "./copiar.js";
import { NOME_MAXIMO, motivoNomeInvalido, normalizarNome } from "./nome.js";
import { rotularParticipantes, souAnfitriao } from "./participantes.js";
import { quadrosDeVideo } from "./quadros.js";
import { mostrarQuadros } from "./area-videos.js";
import { escolherDestaque } from "./destaque.js";
import { criarAreaTela } from "./area-tela.js";
import { criarMidia } from "./midia.js";
import { QUALIDADES, descreverQualidadeAtiva, qualidadePorId } from "./qualidades.js";
import { classificarErroCaptura, classificarErroCompartilhamento } from "./midia-regras.js";

const DURACAO_CONFIRMACAO_MS = 2500;
const CHAVE_NOME = "nomeExibicao";
const CHAVE_QUALIDADE = "qualidadeCompartilhamento";

const telaInicio = document.getElementById("tela-inicio");
const telaSala = document.getElementById("tela-sala");
const areaMensagem = document.getElementById("mensagem");

let temporizadorMensagem = null;
let conexaoAtual = null;
let midiaAtual = null;

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

// Apaga a mensagem só se ela ainda for a mesma (outra mais recente não deve sumir).
function limparMensagemSeFor(texto) {
  if (texto && areaMensagem.textContent === texto) limparMensagem();
}

// Mensagens por tipo de erro (classificarErroCaptura) e textos do botão de cada dispositivo.
const MICROFONE = {
  ligar: TEXTOS.ligarMicrofone,
  desligar: TEXTOS.desligarMicrofone,
  ligando: TEXTOS.ligandoMicrofone,
  desconectado: TEXTOS.microfoneDesconectado,
  erros: {
    permissao: TEXTOS.erroPermissaoMicrofone,
    semDispositivo: TEXTOS.semMicrofone,
    falha: TEXTOS.erroLigarMicrofone,
  },
};

// Compartilhar a tela usa o mesmo botão: "ligar" é escolher o que compartilhar. Parar pelo
// navegador é normal, por isso não há mensagem de "desconectado".
const TELA = {
  ligar: TEXTOS.compartilharTela,
  desligar: TEXTOS.pararCompartilhamento,
  ligando: TEXTOS.escolhendoCompartilhamento,
  desconectado: null,
  // Cancelar a escolha não é erro: nenhuma mensagem (FR-011).
  erros: {
    cancelado: null,
    permissao: TEXTOS.erroPermissaoTela,
    falha: TEXTOS.erroCompartilhar,
  },
  classificarErro: (erro) => classificarErroCompartilhamento(erro?.name, erro?.message),
};

const CAMERA = {
  ligar: TEXTOS.ligarCamera,
  desligar: TEXTOS.desligarCamera,
  ligando: TEXTOS.ligandoCamera,
  desconectado: TEXTOS.cameraDesconectada,
  erros: {
    permissao: TEXTOS.erroPermissaoCamera,
    semDispositivo: TEXTOS.semCamera,
    falha: TEXTOS.erroLigarCamera,
  },
};

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
  const areaVideos = criarElemento("section", { id: "area-videos", hidden: true });
  const areaTela = criarAreaTela({
    aoEscolher(id) {
      escolha = id;
      atualizarTela();
    },
    // Recados (T07, contracts/websocket.md): o texto inteiro vai a cada alteração do campo.
    aoEscreverRecado: (dados) => enviarRecado({ acao: "escrever", ...dados }),
    aoFecharRecado: () => enviarRecado({ acao: "fechar" }),
    aoApagarRecado: () => enviarRecado({ acao: "apagar" }),
  });

  // Com a conexão fechada, o recado não sai: a pessoa fica sabendo (FR-012).
  function enviarRecado(dados) {
    const enviado = sala.enviar({ tipo: "recado", ...dados });
    if (!enviado) mostrarMensagem(TEXTOS.erroEnviarRecado);
    return enviado;
  }

  // Pessoas com quem a conexão de voz e vídeo falhou, a última lista recebida e o próprio id.
  const paresSemConexao = new Set();
  let ultimaLista = [];
  let idProprio = null;
  let avisoSemVoz = null;
  // Compartilhamento que a pessoa escolheu ver em destaque (null = o mais recente) e o último
  // `assistindo` enviado ao servidor.
  let escolha = null;
  let assistindoEnviado = null;
  let compartilhando = false;
  let ultimosRecados = [];

  // Avisa de quem não dá para ouvir; só importa enquanto essa pessoa está com o microfone ligado.
  function atualizarAvisoSemVoz() {
    const inaudivel = ultimaLista.find((p) => paresSemConexao.has(p.id) && p.microfone);
    if (inaudivel) {
      avisoSemVoz = TEXTOS.naoFoiPossivelOuvir(inaudivel.nome);
      mostrarMensagem(avisoSemVoz);
    } else {
      limparMensagemSeFor(avisoSemVoz);
      avisoSemVoz = null;
    }
  }

  function atualizarVideos() {
    mostrarQuadros(areaVideos, quadrosDeVideo(ultimaLista, idProprio, paresSemConexao), midia);
    atualizarTela();
  }

  // Calcula o destaque, mostra a área da tela e avisa o servidor quando o destaque muda: quem
  // compartilha só envia a tela para quem está assistindo (FR-017).
  function atualizarTela() {
    // A escolha vale enquanto aquele compartilhamento existir; depois, volta ao mais recente.
    const escolhaAindaCompartilha = ultimaLista.some((p) => p.id === escolha && p.tela);
    if (!escolhaAindaCompartilha) escolha = null;
    // Só o compartilhamento em destaque é enviado a esta pessoa, então só o som dele toca (FR-019).
    const estado = escolherDestaque(ultimaLista, idProprio, escolha);
    const ativa = midia.qualidadeAtiva();
    const qualidade = ativa && descreverQualidadeAtiva(ativa.qualidade, ativa);
    areaTela.atualizar(
      { ...estado, compartilhando, qualidade },
      { telaDe: midia.telaDe, idsComFalha: paresSemConexao },
    );
    const assistindo = estado.destaque?.id ?? null;
    if (idProprio !== null && assistindo !== assistindoEnviado) {
      assistindoEnviado = assistindo;
      sala.enviar({ tipo: "assistindo", id: assistindo });
    }
    // O destaque pode ter mudado: os recados desenhados são os do compartilhamento em destaque.
    areaTela.mostrarRecados(ultimosRecados, idProprio);
  }

  const botaoSom = criarElemento("button", { textContent: TEXTOS.ativarSom, hidden: true });
  const midia = criarMidia({
    enviarSinal: (para, dados) => sala.enviar({ tipo: "sinal", para, dados }),
    aoMudarSomBloqueado: (bloqueado) => (botaoSom.hidden = !bloqueado),
    aoFalharPar(id) {
      paresSemConexao.add(id);
      atualizarAvisoSemVoz();
      atualizarVideos();
    },
    aoMicrofoneEncerrado: () => microfone.marcarDesconectado(),
    aoCameraEncerrada: () => camera.marcarDesconectado(),
    aoChegarVideo: () => atualizarVideos(),
    aoTelaEncerrada: () => tela.marcarDesconectado(),
  });
  midiaAtual = midia;
  botaoSom.addEventListener("click", () => midia.ativarSom());

  const microfone = criarBotaoDispositivo(MICROFONE, {
    classe: "microfone",
    ligar: () => midia.ligarMicrofone(),
    desligar: () => midia.desligarMicrofone(),
    aoMudar: (ligado) => sala.enviar({ tipo: "microfone", ligado }),
  });
  const camera = criarBotaoDispositivo(CAMERA, {
    classe: "camera",
    ligar: () => midia.ligarCamera(),
    desligar: () => midia.desligarCamera(),
    aoMudar: (ligada) => {
      sala.enviar({ tipo: "camera", ligada });
      // Ao desligar, a própria prévia já foi descartada: o quadro fica sem imagem até a lista
      // voltar do servidor sem ele (instantes depois).
      atualizarVideos();
    },
  });

  // Celulares e alguns navegadores não permitem compartilhar: o botão fica indisponível, com a
  // explicação ao lado, e a pessoa continua assistindo (FR-010).
  const podeCompartilhar = typeof navigator.mediaDevices?.getDisplayMedia === "function";
  const avisoSemSuporte = criarElemento("p", {
    className: "sem-suporte",
    textContent: TEXTOS.semSuporteCompartilhar,
    hidden: podeCompartilhar,
  });
  const seletorQualidade = criarSeletorQualidade({ visivel: podeCompartilhar });
  seletorQualidade.addEventListener("change", async () => {
    const escolhida = qualidadePorId(seletorQualidade.value);
    if (!compartilhando) {
      salvarArmazenado(CHAVE_QUALIDADE, escolhida.id);
      return;
    }
    // Desabilitado durante a troca: trocas seguidas não se atropelam, vale a última aplicada.
    seletorQualidade.disabled = true;
    try {
      await midia.mudarQualidade(escolhida);
      salvarArmazenado(CHAVE_QUALIDADE, escolhida.id);
    } catch {
      mostrarMensagem(TEXTOS.erroQualidade);
      seletorQualidade.value = midia.qualidadeAtiva()?.qualidade.id ?? seletorQualidade.value;
    }
    seletorQualidade.disabled = false;
    atualizarTela();
  });
  const tela = criarBotaoDispositivo(TELA, {
    classe: "compartilhar",
    ligar: async () => {
      const resultado = await midia.compartilharTela(qualidadePorId(seletorQualidade.value));
      salvarArmazenado(CHAVE_QUALIDADE, seletorQualidade.value);
      return resultado;
    },
    desligar: () => midia.pararCompartilhamento(),
    aoMudar: (ligado, resultado) => {
      compartilhando = ligado;
      sala.enviar(
        ligado
          ? { tipo: "tela", compartilhando: true, som: resultado.som }
          : { tipo: "tela", compartilhando: false },
      );
      atualizarTela();
    },
  });

  // O link, os botões de mídia e o "Ativar som" ficam no topo da sala, sempre visíveis.
  const linhaLink = criarElemento("div", { className: "linha-link" }, [
    campoLink,
    botaoCopiar,
    microfone.botao,
    camera.botao,
    tela.botao,
    seletorQualidade,
    botaoSom,
  ]);
  if (!podeCompartilhar) tela.desabilitar();

  // A tela compartilhada fica acima das câmeras (FR-006).
  mostrarNaSala(
    titulo,
    linhaLink,
    avisoSemSuporte,
    areaTela.elemento,
    areaVideos,
    avisoAnfitriao,
    tituloLista,
    lista,
  );

  const sala = conectar(idSala, nome, {
    aoReceberLista(participantes, idVoce) {
      tituloLista.textContent = TEXTOS.tituloLista(participantes.length);
      lista.replaceChildren(
        ...rotularParticipantes(participantes, idVoce).map((item) =>
          criarElemento("li", { className: item.ehVoce ? "voce" : "" }, [
            criarIndicador(item.microfoneLigado ? "🎤" : "🔇", item.microfoneLigado, {
              classe: "indicador-microfone",
              rotulo: item.rotuloMicrofone,
            }),
            criarIndicador("📷", item.cameraLigada, {
              classe: "indicador-camera",
              rotulo: item.rotuloCamera,
            }),
            item.texto,
          ]),
        ),
      );
      avisoAnfitriao.hidden = !souAnfitriao(participantes, idVoce);
      // Antes da mídia: ela pode pedir para redesenhar a tela (aoChegarVideo) com a lista nova.
      ultimaLista = participantes;
      idProprio = idVoce;
      midia.atualizarParticipantes(participantes, idVoce);
      atualizarAvisoSemVoz();
      atualizarVideos();
    },
    aoReceberSinal: (de, dados) => midia.receberSinal(de, dados),
    aoReceberRecados(lista) {
      ultimosRecados = lista;
      areaTela.mostrarRecados(lista, idProprio);
    },
  });

  return {
    destacarBotaoCopiar: () => botaoCopiar.classList.add("destaque"),
  };
}

// Escolha da qualidade do compartilhamento (T06). Começa na última qualidade usada neste
// navegador (ou na padrão); some junto com o botão quando o navegador não permite compartilhar.
function criarSeletorQualidade({ visivel }) {
  const seletor = criarElemento(
    "select",
    { className: "qualidade", title: TEXTOS.qualidadeDoCompartilhamento, hidden: !visivel },
    QUALIDADES.map(({ id, nome }) => criarElemento("option", { value: id, textContent: nome })),
  );
  seletor.setAttribute("aria-label", TEXTOS.qualidadeDoCompartilhamento);
  seletor.value = qualidadePorId(lerArmazenado(CHAVE_QUALIDADE)).id;
  return seletor;
}

// Botão que liga e desliga um dispositivo (microfone, câmera ou compartilhamento de tela). Começa
// sempre desligado, e a permissão só é pedida no primeiro clique. `aoMudar(ligado, resultado)` só é
// chamado quando o dispositivo de fato liga ou desliga (`resultado` é o que `ligar` devolveu).
// Falhas só geram mensagem para a própria pessoa; a sala continua funcionando. Ver FR-001 a FR-012
// da T03 e da T04 e FR-010 a FR-012 da T05.
function criarBotaoDispositivo(textos, { classe, ligar, desligar, aoMudar }) {
  const botao = criarElemento("button", { className: classe });
  let ligado = false;
  let mensagemDeErro = null;
  let indisponivel = false;

  function mostrarErro(texto) {
    mensagemDeErro = texto;
    mostrarMensagem(texto);
  }

  function mostrarEstado() {
    botao.disabled = indisponivel;
    botao.textContent = ligado ? textos.desligar : textos.ligar;
    botao.setAttribute("aria-pressed", String(ligado));
  }

  botao.addEventListener("click", async () => {
    if (ligado) {
      // Primeiro para o envio, depois avisa os outros: nenhuma imagem ou som sai no intervalo.
      desligar();
      ligado = false;
      aoMudar(false);
      mostrarEstado();
      return;
    }
    // Desabilitado enquanto o navegador pergunta: cliques repetidos não abrem outro pedido.
    botao.disabled = true;
    botao.textContent = textos.ligando;
    try {
      const resultado = await ligar();
      ligado = true;
      aoMudar(true, resultado);
      limparMensagemSeFor(mensagemDeErro);
    } catch (erro) {
      const classificar = textos.classificarErro ?? ((e) => classificarErroCaptura(e?.name));
      const mensagem = textos.erros[classificar(erro)];
      if (mensagem) mostrarErro(mensagem);
    }
    mostrarEstado();
  });

  mostrarEstado();
  return {
    botao,
    // Dispositivo indisponível neste navegador: o botão fica desabilitado para sempre.
    desabilitar() {
      indisponivel = true;
      mostrarEstado();
    },
    // O dispositivo parou sozinho (desconectado ou permissão retirada durante o uso).
    marcarDesconectado() {
      if (!ligado) return;
      ligado = false;
      aoMudar(false);
      mostrarEstado();
      if (textos.desconectado) mostrarErro(textos.desconectado);
    },
  };
}

// Ícone ao lado do nome, com o estado em texto para leitores de tela e ao passar o mouse.
function criarIndicador(icone, ligado, { classe, rotulo }) {
  const indicador = criarElemento("span", {
    className: ligado ? `${classe} ligado` : classe,
    textContent: icone,
    title: rotulo,
  });
  indicador.setAttribute("role", "img");
  indicador.setAttribute("aria-label", rotulo);
  return indicador;
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

function conectar(idSala, nome, { aoReceberLista, aoReceberSinal, aoReceberRecados }) {
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
    } else if (mensagem.tipo === "sinal") {
      aoReceberSinal(mensagem.de, mensagem.dados);
    } else if (mensagem.tipo === "recados") {
      aoReceberRecados(mensagem.lista);
    } else if (mensagem.tipo === "erro") {
      recusada = true;
      encerrarMidia();
      tratarErro(idSala, mensagem.codigo);
    }
  });

  conexao.addEventListener("close", () => {
    if (conexaoAtual !== conexao) return;
    // Fora da sala, voz e vídeo também acabam e microfone e câmera são liberados.
    encerrarMidia();
    // Só avisa se for uma queda inesperada da conexão ainda em uso.
    if (!recusada) mostrarMensagem(TEXTOS.conexaoPerdida);
  });

  return {
    // Devolve se a mensagem saiu: com a conexão fechada, quem chamou pode avisar a pessoa (T07).
    enviar(mensagem) {
      if (conexao.readyState !== WebSocket.OPEN) return false;
      conexao.send(JSON.stringify(mensagem));
      return true;
    },
  };
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
  encerrarMidia();
  const conexao = conexaoAtual;
  conexaoAtual = null;
  conexao?.close();
}

function encerrarMidia() {
  midiaAtual?.encerrar();
  midiaAtual = null;
}

// Ao recarregar ou fechar a aba, o fechamento da conexão é esperado: não mostrar erro.
window.addEventListener("pagehide", () => {
  conexaoAtual = null;
  encerrarMidia();
});
window.addEventListener("popstate", renderizar);

renderizar();
