import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  criarPermissaoAdministracao,
  criarPermissaoMidia,
  verificarAvisoLivekit,
} from "../../src/permissao-midia.js";

const CHAVE = "chave-teste";
const SEGREDO = "segredo-de-teste-com-mais-de-32-caracteres";
const AGORA = 1_700_000_000_000;

function partes(token) {
  const [cabecalho, corpo, assinatura] = token.split(".");
  return {
    cabecalho: JSON.parse(Buffer.from(cabecalho, "base64url").toString()),
    corpo: JSON.parse(Buffer.from(corpo, "base64url").toString()),
    assinatura,
    assinado: `${cabecalho}.${corpo}`,
  };
}

function assinar(texto, segredo = SEGREDO) {
  return crypto.createHmac("sha256", segredo).update(texto).digest("base64url");
}

test("a permissão de mídia é um JWT HS256 assinado com o segredo", () => {
  const token = criarPermissaoMidia({
    chave: CHAVE,
    segredo: SEGREDO,
    idSala: "sala",
    idPublico: "pessoa",
    nome: "Ana",
    agora: AGORA,
  });
  assert.equal(token.split(".").length, 3);
  assert.doesNotMatch(token, /[=+/]/);
  const { cabecalho, assinatura, assinado } = partes(token);
  assert.deepEqual(cabecalho, { alg: "HS256", typ: "JWT" });
  assert.equal(assinatura, assinar(assinado));
  assert.notEqual(assinatura, assinar(assinado, "outro-segredo"));
});

test("a permissão de mídia vale 30 s, só para aquela sala e aquela pessoa", () => {
  const token = criarPermissaoMidia({
    chave: CHAVE,
    segredo: SEGREDO,
    idSala: "sala-a",
    idPublico: "pessoa-1",
    nome: "Ana",
    agora: AGORA,
  });
  assert.deepEqual(partes(token).corpo, {
    iss: CHAVE,
    sub: "pessoa-1",
    name: "Ana",
    nbf: AGORA / 1000,
    exp: AGORA / 1000 + 30,
    video: {
      room: "sala-a",
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
      canPublishSources: ["microphone", "camera", "screen_share", "screen_share_audio"],
    },
  });
});

test("o token de administração só administra a sala pedida", () => {
  const token = criarPermissaoAdministracao({
    chave: CHAVE,
    segredo: SEGREDO,
    idSala: "sala-a",
    agora: AGORA,
  });
  const { corpo, assinatura, assinado } = partes(token);
  assert.equal(assinatura, assinar(assinado));
  assert.deepEqual(corpo, {
    iss: CHAVE,
    sub: "telao-app",
    nbf: AGORA / 1000,
    exp: AGORA / 1000 + 30,
    video: { room: "sala-a", roomAdmin: true },
  });
});

test("sem `agora`, usa o relógio atual", () => {
  const antes = Math.floor(Date.now() / 1000);
  const token = criarPermissaoMidia({
    chave: CHAVE,
    segredo: SEGREDO,
    idSala: "s",
    idPublico: "p",
    nome: "N",
  });
  const { nbf, exp } = partes(token).corpo;
  assert.ok(nbf >= antes && nbf <= antes + 1);
  assert.equal(exp, nbf + 30);
});

// ---------- Avisos (webhooks) do LiveKit (T10 US2) ----------

// Assina um aviso como o LiveKit: JWT HS256 com o sha256 (base64) do corpo.
function avisoAssinado(corpo, { segredo = SEGREDO, iss = CHAVE, exp = AGORA / 1000 + 300 } = {}) {
  const base64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
  const sha256 = crypto.createHash("sha256").update(corpo).digest("base64");
  const assinado = `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ iss, nbf: AGORA / 1000 - 1, exp, sha256 })}`;
  return `${assinado}.${assinar(assinado, segredo)}`;
}

const CORPO = JSON.stringify({
  event: "participant_joined",
  room: { name: "sala" },
  participant: { identity: "pessoa" },
});

const verificar = (corpo, autorizacao) =>
  verificarAvisoLivekit({ corpo, autorizacao, chave: CHAVE, segredo: SEGREDO, agora: AGORA });

test("aviso com assinatura e corpo certos é aceito e devolve o evento", () => {
  assert.deepEqual(verificar(CORPO, avisoAssinado(CORPO)), JSON.parse(CORPO));
});

test("aviso também é aceito com o prefixo Bearer", () => {
  assert.deepEqual(verificar(CORPO, `Bearer ${avisoAssinado(CORPO)}`), JSON.parse(CORPO));
});

test("aviso com corpo alterado, segredo errado, outra chave ou vencido é recusado", () => {
  const alterado = CORPO.replace("pessoa", "intrusa");
  assert.equal(verificar(alterado, avisoAssinado(CORPO)), null, "corpo alterado");
  assert.equal(verificar(CORPO, avisoAssinado(CORPO, { segredo: "outro" })), null, "segredo");
  assert.equal(verificar(CORPO, avisoAssinado(CORPO, { iss: "outra" })), null, "chave");
  assert.equal(verificar(CORPO, avisoAssinado(CORPO, { exp: AGORA / 1000 - 60 })), null, "vencido");
});

test("aviso sem autorização, malformado ou com corpo que não é JSON é recusado", () => {
  assert.equal(verificar(CORPO, undefined), null);
  assert.equal(verificar(CORPO, ""), null);
  assert.equal(verificar(CORPO, "a.b"), null);
  assert.equal(verificar(CORPO, "não.é.jwt"), null);
  assert.equal(verificar("nada", avisoAssinado("nada")), null);
});
