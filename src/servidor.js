import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { idValido } from "./ids.js";
import { criarRegistroSalas } from "./salas.js";

const PASTA_PUBLICA = fileURLToPath(new URL("../public/", import.meta.url));

const TIPOS_DE_CONTEUDO = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

// `opcoes` é repassado ao registro de salas (ex.: `toleranciaMs` menor nos testes).
export function criarServidor(opcoes = {}) {
  const registro = criarRegistroSalas(opcoes);

  const servidor = http.createServer(async (requisicao, resposta) => {
    const { pathname } = new URL(requisicao.url, "http://localhost");

    if (pathname === "/api/salas") {
      criarSalaPorHttp(registro, requisicao, resposta);
      return;
    }

    if (requisicao.method === "GET") {
      await servirEstatico(pathname, resposta);
      return;
    }

    responderNaoEncontrado(resposta);
  });

  const servidorWs = new WebSocketServer({ noServer: true });
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

  servidor.on("close", () => servidorWs.close());
  return servidor;
}

// Contrato: specs/001-criar-sala/contracts/http.md
function criarSalaPorHttp(registro, requisicao, resposta) {
  if (requisicao.method !== "POST") {
    responderJson(resposta, 405, { erro: "Método não permitido." });
    return;
  }
  try {
    const { id, tokenAnfitriao } = registro.criar();
    const protocolo = requisicao.headers["x-forwarded-proto"] ?? "http";
    const link = `${protocolo}://${requisicao.headers.host}/sala/${id}`;
    responderJson(resposta, 201, { id, link, tokenAnfitriao });
  } catch (erro) {
    console.error("Erro ao criar sala:", erro);
    responderJson(resposta, 500, { erro: "Não foi possível criar a sala. Tente novamente." });
  }
}

// Contrato: specs/001-criar-sala/contracts/websocket.md
function atenderConexao(registro, conexao) {
  let idSalaAtual = null;

  function recusar(codigo) {
    conexao.send(JSON.stringify({ tipo: "erro", codigo }));
    conexao.close();
  }

  conexao.on("message", (dados) => {
    const mensagem = lerJson(dados.toString());
    if (mensagem?.tipo !== "entrar" || idSalaAtual !== null) {
      recusar("mensagem-invalida");
      return;
    }

    const resultado = idValido(mensagem.idSala)
      ? registro.entrar(mensagem.idSala, conexao, mensagem.tokenAnfitriao)
      : null;
    if (resultado === null) {
      recusar("sala-inexistente");
      return;
    }

    idSalaAtual = mensagem.idSala;
    conexao.send(
      JSON.stringify({ tipo: "entrou", idSala: idSalaAtual, anfitriao: resultado.anfitriao }),
    );
  });

  conexao.on("close", () => {
    if (idSalaAtual !== null) registro.sair(idSalaAtual, conexao);
  });
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
