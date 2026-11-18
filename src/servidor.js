import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { idValido } from "./ids.js";
import { lerConfiguracaoLivekit, removerDaMidia } from "./livekit.js";
import { criarPermissaoMidia, verificarAvisoLivekit } from "./permissao-midia.js";
import { criarRegistroSalas } from "./salas.js";

const PASTA_PUBLICA = fileURLToPath(new URL("../public/", import.meta.url));

// Biblioteca do servidor de mídia: um módulo ES único, sem dependências, servido direto do pacote
// instalado (T10 research §2). É o único arquivo de node_modules acessível.
const CAMINHO_LIVEKIT_CLIENT = "/js/livekit-client.js";
// Avisos (webhooks) do servidor de mídia (T10 research §4, contracts/livekit.md).
const CAMINHO_AVISOS_LIVEKIT = "/api/livekit/eventos";
const ARQUIVO_LIVEKIT_CLIENT = fileURLToPath(
  new URL("../node_modules/livekit-client/dist/livekit-client.esm.mjs", import.meta.url),
);

const TAMANHO_MAXIMO_MENSAGEM = 64 * 1024;

const TIPOS_DE_CONTEUDO = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

// `opcoes` é repassado ao registro de salas (ex.: `toleranciaMs` menor nos testes).
// `intervaloPingMs`: de quanto em quanto tempo verificar se cada conexão continua viva.
// `livekit`: endereço e chaves do servidor de mídia (T10); os testes injetam valores próprios.
export function criarServidor({
  intervaloPingMs = 1000,
  livekit = lerConfiguracaoLivekit(),
  ...opcoesRegistro
} = {}) {
  const registro = criarRegistroSalas({
    ...opcoesRegistro,
    // Adiado para depois do código atual, para que quem entrou receba `entrou` antes da lista.
    aoMudar: (idSala) => queueMicrotask(() => enviarLista(registro, idSala)),
    aoMudarRecados: (idSala) => queueMicrotask(() => enviarRecados(registro, idSala)),
    // Quem deixa a sala também deixa o servidor de mídia (T10 FR-006).
    aoSair: (idSala, idPublico) => removerDaMidia(livekit, idSala, idPublico),
  });

  const servidor = http.createServer(async (requisicao, resposta) => {
    const { pathname } = new URL(requisicao.url, "http://localhost");

    if (pathname === "/api/salas") {
      criarSalaPorHttp(registro, requisicao, resposta);
      return;
    }

    if (pathname === CAMINHO_AVISOS_LIVEKIT) {
      receberAvisoLivekit(registro, livekit, requisicao, resposta);
      return;
    }

    if (pathname.startsWith("/api/salas/")) {
      consultarSalaPorHttp(registro, pathname.slice("/api/salas/".length), requisicao, resposta);
      return;
    }

    if (requisicao.method === "GET" && pathname === CAMINHO_LIVEKIT_CLIENT) {
      await servirArquivo(ARQUIVO_LIVEKIT_CLIENT, TIPOS_DE_CONTEUDO[".js"], resposta);
      return;
    }

    if (requisicao.method === "GET") {
      await servirEstatico(pathname, resposta);
      return;
    }

    responderNaoEncontrado(resposta);
  });

  // Mensagens da sala têm poucos KB; o limite protege o servidor de mensagens enormes.
  const servidorWs = new WebSocketServer({ noServer: true, maxPayload: TAMANHO_MAXIMO_MENSAGEM });
  servidorWs.on("connection", (conexao) => atenderConexao(registro, livekit, conexao));

  servidor.on("upgrade", (requisicao, socket, cabecalho) => {
    const { pathname } = new URL(requisicao.url, "http://localhost");
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }
    servidorWs.handleUpgrade(requisicao, socket, cabecalho, (conexao) => {
      servidorWs.emit("connection", conexao, requisicao);
    });
  });

  // Quedas de rede não fecham a conexão na hora; o ping percebe em até ~2 intervalos (FR-006).
  const verificacao = setInterval(() => {
    for (const conexao of servidorWs.clients) {
      if (conexao.vivo === false) {
        conexao.terminate();
        continue;
      }
      conexao.vivo = false;
      conexao.ping();
    }
  }, intervaloPingMs);
  verificacao.unref();

  servidor.on("close", () => {
    clearInterval(verificacao);
    servidorWs.close();
  });
  return servidor;
}

// Contrato: specs/002-entrar-sala-link/contracts/http.md
function criarSalaPorHttp(registro, requisicao, resposta) {
  if (requisicao.method !== "POST") {
    responderJson(resposta, 405, { erro: "Método não permitido." });
    return;
  }
  try {
    const { id, chave } = registro.criar();
    const protocolo = requisicao.headers["x-forwarded-proto"] ?? "http";
    const link = `${protocolo}://${requisicao.headers.host}/sala/${id}`;
    responderJson(resposta, 201, { id, link, chave });
  } catch (erro) {
    console.error("Erro ao criar sala:", erro);
    responderJson(resposta, 500, { erro: "Não foi possível criar a sala. Tente novamente." });
  }
}

// Aviso do servidor de mídia: quem entrou na mídia de uma sala sem estar nela pelo app (ex.: com a
// permissão de quem já saiu) é tirado na hora (T10 research §4, contracts/livekit.md).
function receberAvisoLivekit(registro, livekit, requisicao, resposta) {
  if (requisicao.method !== "POST") {
    responderJson(resposta, 405, { erro: "Método não permitido." });
    return;
  }
  lerCorpo(requisicao, TAMANHO_MAXIMO_MENSAGEM).then((corpo) => {
    if (corpo === null || lerJson(corpo) === null) {
      responderJson(resposta, 400, { erro: "Aviso inválido." });
      return;
    }
    const aviso = verificarAvisoLivekit({
      corpo,
      autorizacao: requisicao.headers.authorization,
      chave: livekit.chave,
      segredo: livekit.segredo,
    });
    if (aviso === null) {
      responderJson(resposta, 401, { erro: "Aviso não autorizado." });
      return;
    }
    const idSala = aviso.room?.name;
    const idPublico = aviso.participant?.identity;
    const intruso =
      aviso.event === "participant_joined" && !registro.participanteNaSala(idSala, idPublico);
    if (intruso) removerDaMidia(livekit, idSala, idPublico);
    responderJson(resposta, 200, {});
  });
}

// Lê o corpo da requisição como texto; null se passar de `limite` bytes.
function lerCorpo(requisicao, limite) {
  return new Promise((resolver) => {
    const partes = [];
    let tamanho = 0;
    requisicao.on("data", (parte) => {
      tamanho += parte.length;
      if (tamanho <= limite) partes.push(parte);
    });
    requisicao.on("end", () =>
      resolver(tamanho > limite ? null : Buffer.concat(partes).toString("utf8")),
    );
    requisicao.on("error", () => resolver(null));
  });
}

// Consulta antes da tela de nome: a sala existe? tem vaga? (contracts/http.md)
function consultarSalaPorHttp(registro, idSala, requisicao, resposta) {
  if (requisicao.method !== "GET") {
    responderJson(resposta, 405, { erro: "Método não permitido." });
    return;
  }
  const situacao = idValido(idSala) ? registro.consultar(idSala) : null;
  if (situacao === null) {
    responderJson(resposta, 404, { erro: "Sala não encontrada." });
    return;
  }
  responderJson(resposta, 200, situacao);
}

// Contratos: specs/002-entrar-sala-link/contracts/websocket.md e
// specs/003-conversar-por-voz/contracts/websocket.md (e as extensões até
// specs/007-recado-na-tela/contracts/websocket.md, specs/008-recado-segue-cursor/contracts/websocket.md
// e specs/010-midia-por-servidor/contracts/websocket.md)
function atenderConexao(registro, livekit, conexao) {
  // Sala em que esta conexão entrou; nula até um `entrar` bem-sucedido.
  let idSalaAtual = null;
  conexao.vivo = true;
  conexao.on("pong", () => (conexao.vivo = true));
  // Erros de protocolo (ex.: mensagem acima do limite) já fazem o `ws` fechar a conexão; sem este
  // ouvinte, o evento derrubaria o processo.
  conexao.on("error", () => {});

  conexao.on("message", (dados) => {
    const mensagem = lerJson(dados.toString());
    const jaEntrou = idSalaAtual !== null;

    if (mensagem?.tipo === "entrar" && !jaEntrou) {
      if (tratarEntrar(registro, conexao, mensagem)) {
        idSalaAtual = mensagem.idSala;
        enviarPermissaoMidia(registro, livekit, idSalaAtual, conexao);
      }
      return;
    }
    if (mensagem?.tipo === "pedir-midia" && jaEntrou) {
      enviarPermissaoMidia(registro, livekit, idSalaAtual, conexao);
      return;
    }
    if (mensagem?.tipo === "microfone" && jaEntrou) {
      tratarMicrofone(registro, idSalaAtual, conexao, mensagem);
      return;
    }
    if (mensagem?.tipo === "camera" && jaEntrou) {
      tratarCamera(registro, idSalaAtual, conexao, mensagem);
      return;
    }
    if (mensagem?.tipo === "tela" && jaEntrou) {
      tratarTela(registro, idSalaAtual, conexao, mensagem);
      return;
    }
    if (mensagem?.tipo === "assistindo" && jaEntrou) {
      tratarAssistindo(registro, idSalaAtual, conexao, mensagem);
      return;
    }
    if (mensagem?.tipo === "recado" && jaEntrou) {
      tratarRecado(registro, idSalaAtual, conexao, mensagem);
      return;
    }
    recusar(conexao, "mensagem-invalida");
  });

  conexao.on("close", () => {
    if (idSalaAtual !== null) registro.sair(idSalaAtual, conexao);
  });
}

// Devolve true se a pessoa entrou na sala.
function tratarEntrar(registro, conexao, { idSala, nome, chave }) {
  const resultado = idValido(idSala)
    ? registro.entrar(idSala, { chave, nome, conexao })
    : { erro: "sala-inexistente" };
  if (resultado.erro) {
    recusar(conexao, resultado.erro);
    return false;
  }

  if (resultado.conexaoSubstituida) recusar(resultado.conexaoSubstituida, "aberta-em-outra-aba");
  const { participante } = resultado;
  enviar(conexao, { tipo: "entrou", idSala, chave: participante.chave, voce: participante.id });
  // Quem entra vê os recados que ainda estão na tela (FR-011). Sem recados, nada é enviado.
  const recados = registro.listarRecados(idSala);
  if (recados.length > 0) enviar(conexao, { tipo: "recados", lista: recados });
  return true;
}

// Permissão para conectar ao servidor de mídia, só desta sala e desta pessoa (T10 research §3).
// Uma conexão já substituída por outra aba não recebe mais nada.
function enviarPermissaoMidia(registro, livekit, idSala, conexao) {
  const participante = registro.participantePublicoPorConexao(idSala, conexao);
  if (participante === null) return;
  const token = criarPermissaoMidia({
    chave: livekit.chave,
    segredo: livekit.segredo,
    idSala,
    idPublico: participante.id,
    nome: participante.nome,
  });
  enviar(conexao, { tipo: "midia", url: livekit.url, token });
}

// O estado do microfone vai para todos na lista de participantes (enviada em `aoMudar`).
function tratarMicrofone(registro, idSala, conexao, { ligado }) {
  if (typeof ligado !== "boolean") {
    recusar(conexao, "mensagem-invalida");
    return;
  }
  registro.definirMicrofone(idSala, conexao, ligado);
}

// O estado da câmera vai para todos na lista e decide quais quadros de vídeo aparecem (T04).
function tratarCamera(registro, idSala, conexao, { ligada }) {
  if (typeof ligada !== "boolean") {
    recusar(conexao, "mensagem-invalida");
    return;
  }
  registro.definirCamera(idSala, conexao, ligada);
}

// Quem compartilha a tela (e se tem som); a lista decide o destaque de cada pessoa (T05).
function tratarTela(registro, idSala, conexao, { compartilhando, som }) {
  const valida =
    typeof compartilhando === "boolean" && (!compartilhando || typeof som === "boolean");
  if (!valida) {
    recusar(conexao, "mensagem-invalida");
    return;
  }
  registro.definirTela(idSala, conexao, { compartilhando, som });
}

// Qual compartilhamento a pessoa tem em destaque: a mídia dela passa a receber só essa tela (T10).
function tratarAssistindo(registro, idSala, conexao, { id }) {
  if (id !== null && typeof id !== "string") {
    recusar(conexao, "mensagem-invalida");
    return;
  }
  registro.definirAssistindo(idSala, conexao, id);
}

// Recados sobre o compartilhamento (T07). Aqui só o formato é conferido; o registro ignora valores
// inválidos (texto longo, alvo que não compartilha, ponto fora da imagem) sem fechar a conexão.
function tratarRecado(registro, idSala, conexao, mensagem) {
  const { acao } = mensagem;
  if (acao === "escrever" && formatoDeEscreverValido(mensagem)) {
    const { alvo, x, y, texto } = mensagem;
    registro.escreverRecado(idSala, conexao, { alvo, x, y, texto });
  } else if (acao === "mover" && typeof mensagem.x === "number" && typeof mensagem.y === "number") {
    registro.moverRecado(idSala, conexao, { x: mensagem.x, y: mensagem.y });
  } else if (acao === "apagar") {
    registro.apagarRecado(idSala, conexao);
  } else {
    recusar(conexao, "mensagem-invalida");
  }
}

function formatoDeEscreverValido({ alvo, x, y, texto }) {
  return (
    typeof alvo === "string" &&
    typeof texto === "string" &&
    typeof x === "number" &&
    typeof y === "number"
  );
}

function enviarLista(registro, idSala) {
  const lista = registro.listar(idSala);
  if (lista === null) return;
  for (const conexao of registro.conexoes(idSala)) {
    enviar(conexao, { tipo: "participantes", lista });
  }
}

function enviarRecados(registro, idSala) {
  const lista = registro.listarRecados(idSala);
  if (lista === null) return;
  for (const conexao of registro.conexoes(idSala)) {
    enviar(conexao, { tipo: "recados", lista });
  }
}

function enviar(conexao, mensagem) {
  if (conexao.readyState === WebSocket.OPEN) conexao.send(JSON.stringify(mensagem));
}

function recusar(conexao, codigo) {
  enviar(conexao, { tipo: "erro", codigo });
  conexao.close();
}

function lerJson(texto) {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function responderJson(resposta, status, corpo) {
  resposta.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  resposta.end(JSON.stringify(corpo));
}

async function servirEstatico(pathname, resposta) {
  // A SPA decide a tela pelo caminho: "/" e "/sala/<id>" recebem o mesmo HTML.
  const ehPaginaDaAplicacao = pathname === "/" || pathname.startsWith("/sala/");
  const caminhoRelativo = ehPaginaDaAplicacao ? "index.html" : decodificar(pathname);
  if (caminhoRelativo === null) return responderNaoEncontrado(resposta);

  const caminhoArquivo = path.join(PASTA_PUBLICA, caminhoRelativo);
  // Impede acesso a arquivos fora de public/ (ex.: "/../package.json").
  if (!caminhoArquivo.startsWith(PASTA_PUBLICA)) return responderNaoEncontrado(resposta);

  const tipo = TIPOS_DE_CONTEUDO[path.extname(caminhoArquivo)];
  if (!tipo) return responderNaoEncontrado(resposta);
  await servirArquivo(caminhoArquivo, tipo, resposta);
}

async function servirArquivo(caminhoArquivo, tipo, resposta) {
  try {
    const conteudo = await readFile(caminhoArquivo);
    resposta.writeHead(200, { "Content-Type": tipo });
    resposta.end(conteudo);
  } catch {
    responderNaoEncontrado(resposta);
  }
}

function decodificar(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function responderNaoEncontrado(resposta) {
  resposta.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  resposta.end("Página não encontrada.");
}

const executadoDiretamente = process.argv[1] === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  const porta = process.env.PORT ?? 3000;
  criarServidor().listen(porta, () => {
    console.log(`Servidor rodando em http://localhost:${porta}`);
  });
}
