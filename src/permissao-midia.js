import crypto from "node:crypto";

// Permissões para o servidor de mídia (LiveKit): tokens JWT HS256 assinados com o segredo
// compartilhado (specs/010-midia-por-servidor/research.md §3, data-model.md "Permissão de mídia").
// Valem pouco: só servem para conectar; conectado, o próprio LiveKit renova a sessão.
const VALIDADE_S = 30;

const FONTES_PERMITIDAS = ["microphone", "camera", "screen_share", "screen_share_audio"];

// Identidade do app quando ele mesmo chama a API do LiveKit (ex.: tirar alguém da sala).
const IDENTIDADE_APP = "telao-app";

// Permissão para uma pessoa que entrou na sala pelo app: só aquela sala, só aquela pessoa.
export function criarPermissaoMidia({
  chave,
  segredo,
  idSala,
  idPublico,
  nome,
  agora = Date.now(),
}) {
  return assinarJwt(segredo, {
    iss: chave,
    sub: idPublico,
    name: nome,
    ...validade(agora),
    video: {
      room: idSala,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      // Recados continuam pelo WebSocket do app.
      canPublishData: false,
      canPublishSources: FONTES_PERMITIDAS,
    },
  });
}

// Permissão do próprio app para administrar uma sala (ex.: RemoveParticipant).
export function criarPermissaoAdministracao({ chave, segredo, idSala, agora = Date.now() }) {
  return assinarJwt(segredo, {
    iss: chave,
    sub: IDENTIDADE_APP,
    ...validade(agora),
    video: { room: idSala, roomAdmin: true },
  });
}

// Confere um aviso (webhook) do LiveKit: JWT HS256 assinado com o mesmo segredo, emitido com a
// nossa chave, dentro da validade (com folga de relógio) e com o sha256 do corpo recebido
// (contracts/livekit.md). Devolve o evento, ou null se algo não confere.
const FOLGA_RELOGIO_S = 10;

export function verificarAvisoLivekit({ corpo, autorizacao, chave, segredo, agora = Date.now() }) {
  const token = String(autorizacao ?? "").replace(/^Bearer /, "");
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [cabecalho, carga, recebida] = partes;
  if (!assinaturasIguais(recebida, assinatura(segredo, `${cabecalho}.${carga}`))) return null;

  const declaracoes = lerJson(Buffer.from(carga, "base64url").toString());
  const segundos = Math.floor(agora / 1000);
  const dentroDaValidade =
    (declaracoes?.nbf ?? 0) <= segundos + FOLGA_RELOGIO_S &&
    (declaracoes?.exp ?? 0) >= segundos - FOLGA_RELOGIO_S;
  const resumo = crypto.createHash("sha256").update(corpo).digest("base64");
  if (declaracoes?.iss !== chave || !dentroDaValidade || declaracoes.sha256 !== resumo) return null;
  return lerJson(corpo);
}

function assinaturasIguais(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

function lerJson(texto) {
  try {
    const valor = JSON.parse(texto);
    return typeof valor === "object" && valor !== null ? valor : null;
  } catch {
    return null;
  }
}

function validade(agora) {
  const segundos = Math.floor(agora / 1000);
  return { nbf: segundos, exp: segundos + VALIDADE_S };
}

function assinarJwt(segredo, corpo) {
  const cabecalho = codificar({ alg: "HS256", typ: "JWT" });
  const assinado = `${cabecalho}.${codificar(corpo)}`;
  return `${assinado}.${assinatura(segredo, assinado)}`;
}

function codificar(objeto) {
  return Buffer.from(JSON.stringify(objeto)).toString("base64url");
}

function assinatura(segredo, texto) {
  return crypto.createHmac("sha256", segredo).update(texto).digest("base64url");
}
