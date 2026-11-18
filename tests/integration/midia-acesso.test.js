import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { setTimeout as esperar } from "node:timers/promises";
import { conectarCliente, subirServidor } from "./auxiliares.js";

// T10: acesso ao servidor de mídia (specs/010-midia-por-servidor/contracts/websocket.md e
// contracts/livekit.md).

const LIVEKIT = {
  url: "ws://midia.teste",
  chave: "chave",
  segredo: "segredo-de-teste-com-mais-de-32-caracteres",
};

// LiveKit falso: guarda cada chamada à API e responde com `respostaApi`.
const chamadas = [];
let respostaApi = 200;
const livekitFalso = http.createServer((requisicao, resposta) => {
  let corpo = "";
  requisicao.on("data", (parte) => (corpo += parte));
  requisicao.on("end", () => {
    chamadas.push({
      caminho: requisicao.url,
      autorizacao: requisicao.headers.authorization,
      corpo: JSON.parse(corpo || "null"),
    });
    resposta.writeHead(respostaApi, { "Content-Type": "application/json" });
    resposta.end(respostaApi === 200 ? "{}" : '{"code":"not_found"}');
  });
});

let servidor;
before(async () => {
  await new Promise((resolver) => livekitFalso.listen(0, "127.0.0.1", resolver));
  const urlApi = `http://127.0.0.1:${livekitFalso.address().port}`;
  servidor = await subirServidor({ livekit: { ...LIVEKIT, urlApi }, intervaloPingMs: 50 });
});
after(async () => {
  await servidor.fechar();
  livekitFalso.closeAllConnections();
  await new Promise((resolver) => livekitFalso.close(resolver));
});
beforeEach(() => {
  chamadas.length = 0;
  respostaApi = 200;
});

async function criarSala() {
  const resposta = await fetch(`${servidor.url}/api/salas`, { method: "POST" });
  return resposta.json();
}

async function entrar(idSala, nome, chave) {
  const cliente = await conectarCliente(servidor.urlWs);
  cliente.enviar({ tipo: "entrar", idSala, nome, chave });
  cliente.entrou = await cliente.proxima();
  return cliente;
}

function lerToken(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
}

// ---------- Emissão da permissão ----------

test("quem entra recebe a permissão de mídia daquela sala, para si", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  const midia = await ana.esperarMidias(1);
  assert.equal(midia.url, LIVEKIT.url);
  const corpo = lerToken(midia.token);
  assert.equal(corpo.video.room, id);
  assert.equal(corpo.sub, ana.entrou.voce);
  assert.equal(corpo.name, "Ana");
  ana.fechar();
});

test("pedir-midia depois de entrar devolve uma permissão nova", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  await ana.esperarMidias(1);
  ana.enviar({ tipo: "pedir-midia" });
  const segunda = await ana.esperarMidias(2);
  const corpo = lerToken(segunda.token);
  assert.equal(corpo.video.room, id);
  assert.equal(corpo.sub, ana.entrou.voce);
  ana.fechar();
});

test("pedir-midia antes de entrar é recusado e fecha a conexão", async () => {
  const cliente = await conectarCliente(servidor.urlWs);
  cliente.enviar({ tipo: "pedir-midia" });
  assert.deepEqual(await cliente.proxima(), { tipo: "erro", codigo: "mensagem-invalida" });
  await cliente.fechada;
  assert.equal(cliente.midias.length, 0);
});

test("a aba substituída não recebe mais permissão; a nova recebe a sua", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrar(id, "Ana", chave);
  await antiga.esperarMidias(1);
  const nova = await entrar(id, "Ana", chave);
  const midiaNova = await nova.esperarMidias(1);
  assert.equal(lerToken(midiaNova.token).sub, nova.entrou.voce);
  await antiga.fechada;
  assert.equal(antiga.midias.length, 1);
  nova.fechar();
});

test("quem encontra a sala cheia não recebe permissão", async () => {
  const { id, chave } = await criarSala();
  const presentes = [await entrar(id, "P1", chave)];
  for (let i = 2; i <= 6; i++) presentes.push(await entrar(id, `P${i}`));
  const setima = await entrar(id, "P7");
  assert.deepEqual(setima.entrou, { tipo: "erro", codigo: "sala-cheia" });
  await setima.fechada;
  assert.equal(setima.midias.length, 0);
  for (const cliente of presentes) cliente.fechar();
});

// ---------- Tirar do servidor de mídia quem sai (US2) ----------

const REMOVER = "/twirp/livekit.RoomService/RemoveParticipant";

// Chamadas à API de uma sala só (as saídas de testes anteriores chegam a qualquer momento).
const chamadasDa = (idSala) => chamadas.filter((chamada) => chamada.corpo?.room === idSala);

// Espera até `condicao()` valer, por no máximo `ms`.
async function esperarAte(condicao, ms = 1000) {
  const limite = Date.now() + ms;
  while (!condicao()) {
    if (Date.now() > limite) return false;
    await esperar(10);
  }
  return true;
}

test("quem sai é tirado do servidor de mídia em até 1 s, com permissão de administração da sala", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  const bruno = await entrar(id, "Bruno");
  bruno.fechar();
  assert.ok(await esperarAte(() => chamadasDa(id).length === 1), "RemoveParticipant em até 1 s");
  const [chamada] = chamadasDa(id);
  assert.equal(chamada.caminho, REMOVER);
  assert.deepEqual(chamada.corpo, { room: id, identity: bruno.entrou.voce });
  const token = chamada.autorizacao.replace(/^Bearer /, "");
  assert.deepEqual(lerToken(token).video, { room: id, roomAdmin: true });
  ana.fechar();
});

test("outra aba com a mesma chave tira o id antigo do servidor de mídia", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrar(id, "Ana", chave);
  const nova = await entrar(id, "Ana", chave);
  assert.ok(await esperarAte(() => chamadasDa(id).length >= 1));
  assert.deepEqual(chamadasDa(id)[0].corpo, { room: id, identity: antiga.entrou.voce });
  nova.fechar();
});

test("servidor de mídia respondendo erro não atrapalha a sala", async () => {
  respostaApi = 500;
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  const bruno = await entrar(id, "Bruno");
  bruno.fechar();
  assert.ok(await esperarAte(() => chamadasDa(id).length === 1));
  const lista = await ana.esperarLista((l) => l.length === 1);
  assert.equal(lista[0].nome, "Ana");
  ana.enviar({ tipo: "microfone", ligado: true });
  await ana.esperarLista((l) => l[0].microfone === true);
  ana.fechar();
});

// ---------- Avisos de entrada do servidor de mídia (US2) ----------

function avisoAssinado(corpo, segredo = LIVEKIT.segredo) {
  const base64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
  const agora = Math.floor(Date.now() / 1000);
  const sha256 = crypto.createHash("sha256").update(corpo).digest("base64");
  const assinado = `${base64({ alg: "HS256", typ: "JWT" })}.${base64({ iss: LIVEKIT.chave, nbf: agora, exp: agora + 300, sha256 })}`;
  const assinatura = crypto.createHmac("sha256", segredo).update(assinado).digest("base64url");
  return `${assinado}.${assinatura}`;
}

function enviarAviso(corpo, autorizacao = avisoAssinado(corpo)) {
  return fetch(`${servidor.url}/api/livekit/eventos`, {
    method: "POST",
    headers: { "Content-Type": "application/webhook+json", Authorization: autorizacao },
    body: corpo,
  });
}

const entrouNaMidia = (idSala, identidade) =>
  JSON.stringify({
    event: "participant_joined",
    room: { name: idSala },
    participant: { identity: identidade },
  });

test("quem entra no servidor de mídia sem estar na sala é tirado na hora", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  const resposta = await enviarAviso(entrouNaMidia(id, "x".repeat(22)));
  assert.equal(resposta.status, 200);
  assert.ok(await esperarAte(() => chamadasDa(id).length === 1));
  assert.deepEqual(chamadasDa(id)[0].corpo, { room: id, identity: "x".repeat(22) });
  ana.fechar();
});

test("quem já saiu e volta ao servidor de mídia é tirado de novo", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  const bruno = await entrar(id, "Bruno");
  bruno.fechar();
  await esperarAte(() => chamadasDa(id).length === 1);
  await enviarAviso(entrouNaMidia(id, bruno.entrou.voce));
  assert.ok(await esperarAte(() => chamadasDa(id).length === 2));
  assert.deepEqual(chamadasDa(id)[1].corpo, { room: id, identity: bruno.entrou.voce });
  ana.fechar();
});

test("quem está na sala entra no servidor de mídia sem ser tirado", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrar(id, "Ana", chave);
  const resposta = await enviarAviso(entrouNaMidia(id, ana.entrou.voce));
  assert.equal(resposta.status, 200);
  await esperar(100);
  assert.equal(chamadasDa(id).length, 0);
  ana.fechar();
});

test("outros eventos do servidor de mídia são aceitos e ignorados", async () => {
  const resposta = await enviarAviso(
    JSON.stringify({ event: "room_started", room: { name: "x" } }),
  );
  assert.equal(resposta.status, 200);
  await esperar(50);
  assert.equal(chamadasDa("x").length, 0);
});

test("aviso com assinatura inválida é recusado com 401 e nada é feito", async () => {
  const corpo = entrouNaMidia("x".repeat(22), "y".repeat(22));
  assert.equal((await enviarAviso(corpo, avisoAssinado(corpo, "segredo-errado"))).status, 401);
  assert.equal((await enviarAviso(corpo, "")).status, 401);
  await esperar(50);
  assert.equal(chamadasDa("x".repeat(22)).length, 0);
});

test("aviso grande demais ou que não é JSON é recusado com 400", async () => {
  const grande = JSON.stringify({ event: "x", lixo: "a".repeat(70 * 1024) });
  assert.equal((await enviarAviso(grande)).status, 400);
  assert.equal((await enviarAviso("não é json")).status, 400);
});

test("aviso só aceita POST", async () => {
  const resposta = await fetch(`${servidor.url}/api/livekit/eventos`);
  assert.equal(resposta.status, 405);
});
