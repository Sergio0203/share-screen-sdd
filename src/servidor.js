import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { idValido } from "./ids.js";
import { criarRegistroSalas } from "./salas.js";

const PASTA_PUBLICA = fileURLToPath(new URL("../public/", import.meta.url));

const TAMANHO_MAXIMO_MENSAGEM = 64 * 1024;

const TIPOS_DE_CONTEUDO = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

// `opcoes` é repassado ao registro de salas (ex.: `toleranciaMs` menor nos testes).
// `intervaloPingMs`: de quanto em quanto tempo verificar se cada conexão continua viva.
export function criarServidor({ intervaloPingMs = 1000, ...opcoesRegistro } = {}) {
  const registro = criarRegistroSalas({
    ...opcoesRegistro,
    // Adiado para depois do código atual, para que quem entrou receba `entrou` antes da lista.
    aoMudar: (idSala) => queueMicrotask(() => enviarLista(registro, idSala)),
  });

  const servidor = http.createServer(async (requisicao, resposta) => {
    const { pathname } = new URL(requisicao.url, "http://localhost");

    if (pathname === "/api/salas") {
      criarSalaPorHttp(registro, requisicao, resposta);
      return;
    }

    if (pathname.startsWith("/api/salas/")) {
      consultarSalaPorHttp(registro, pathname.slice("/api/salas/".length), requisicao, resposta);
      return;
    }

    if (requisicao.method === "GET") {
      await servirEstatico(pathname, resposta);
      return;
    }

    responderNaoEncontrado(resposta);
  });

  // Mensagens de sinal de voz têm poucos KB; o limite protege o servidor de mensagens enormes.
  const servidorWs = new WebSocketServer({ noServer: true, maxPayload: TAMANHO_MAXIMO_MENSAGEM });
  servidorWs.on("connection", (conexao) => atenderConexao(registro, conexao));

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
// specs/003-conversar-por-voz/contracts/websocket.md
function atenderConexao(registro, conexao) {
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
      if (tratarEntrar(registro, conexao, mensagem)) idSalaAtual = mensagem.idSala;
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
    if (mensagem?.tipo === "sinal" && jaEntrou) {
      tratarSinal(registro, idSalaAtual, conexao, mensagem);
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
  return true;
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

// Qual compartilhamento a pessoa tem em destaque: quem compartilha só envia a tela para ela.
function tratarAssistindo(registro, idSala, conexao, { id }) {
  if (id !== null && typeof id !== "string") {
    recusar(conexao, "mensagem-invalida");
    return;
  }
  registro.definirAssistindo(idSala, conexao, id);
}

// Repassa ofertas, respostas e candidatos de voz a outra pessoa da mesma sala. O servidor não lê
// `dados`; só preenche `de`, para ninguém se passar por outra pessoa.
function tratarSinal(registro, idSala, conexao, { para, dados }) {
  const dadosValidos = typeof dados === "object" && dados !== null && !Array.isArray(dados);
  if (typeof para !== "string" || !dadosValidos) {
    recusar(conexao, "mensagem-invalida");
    return;
  }
  const destino = registro.conexaoPorId(idSala, para);
  // Destinatário que acabou de sair: ignorar, não é erro de quem enviou.
  if (destino === null || destino === conexao) return;
  enviar(destino, { tipo: "sinal", de: registro.idPorConexao(idSala, conexao), dados });
}

function enviarLista(registro, idSala) {
  const lista = registro.listar(idSala);
  if (lista === null) return;
  for (const conexao of registro.conexoes(idSala)) {
    enviar(conexao, { tipo: "participantes", lista });
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
