import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import WebSocket from "ws";
import { subirServidor } from "./auxiliares.js";

const TOLERANCIA_MS = 100;

let servidor;
before(async () => {
  servidor = await subirServidor({ toleranciaMs: TOLERANCIA_MS });
});
after(() => servidor.fechar());

async function criarSala() {
  const resposta = await fetch(`${servidor.url}/api/salas`, { method: "POST" });
  return resposta.json();
}

// Abre uma conexão e coleta as mensagens e o fechamento.
async function conectar() {
  const ws = new WebSocket(servidor.urlWs);
  const mensagens = [];
  const filaDeEspera = [];
  ws.on("message", (dados) => {
    const mensagem = JSON.parse(dados.toString());
    const aguardando = filaDeEspera.shift();
    if (aguardando) aguardando(mensagem);
    else mensagens.push(mensagem);
  });
  const fechada = new Promise((resolver) => ws.on("close", resolver));
  await new Promise((resolver, rejeitar) => {
    ws.on("open", resolver);
    ws.on("error", rejeitar);
  });
  return {
    enviar: (dados) => ws.send(typeof dados === "string" ? dados : JSON.stringify(dados)),
    proximaMensagem: () =>
      mensagens.length
        ? Promise.resolve(mensagens.shift())
        : new Promise((resolver) => filaDeEspera.push(resolver)),
    fechar: () => ws.close(),
    fechada,
  };
}

test("entrar com o token do anfitrião devolve anfitriao: true", async () => {
  const { id, tokenAnfitriao } = await criarSala();
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: id, tokenAnfitriao });
  assert.deepEqual(await cliente.proximaMensagem(), {
    tipo: "entrou",
    idSala: id,
    anfitriao: true,
  });
  cliente.fechar();
});

test("entrar sem token devolve anfitriao: false", async () => {
  const { id } = await criarSala();
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: id });
  assert.deepEqual(await cliente.proximaMensagem(), {
    tipo: "entrou",
    idSala: id,
    anfitriao: false,
  });
  cliente.fechar();
});

test("sala inexistente devolve erro e fecha a conexão", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: "a".repeat(22) });
  assert.deepEqual(await cliente.proximaMensagem(), {
    tipo: "erro",
    codigo: "sala-inexistente",
  });
  await cliente.fechada;
});

test("id em formato inválido é tratado como sala inexistente", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: "../x" });
  assert.equal((await cliente.proximaMensagem()).codigo, "sala-inexistente");
  await cliente.fechada;
});

for (const [descricao, mensagem] of [
  ["JSON inválido", "{nao é json"],
  ["tipo desconhecido", { tipo: "dançar" }],
]) {
  test(`${descricao} devolve mensagem-invalida e fecha`, async () => {
    const cliente = await conectar();
    cliente.enviar(mensagem);
    assert.deepEqual(await cliente.proximaMensagem(), {
      tipo: "erro",
      codigo: "mensagem-invalida",
    });
    await cliente.fechada;
  });
}

test("entrar repetido devolve mensagem-invalida e fecha", async () => {
  const { id } = await criarSala();
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: id });
  await cliente.proximaMensagem();
  cliente.enviar({ tipo: "entrar", idSala: id });
  assert.equal((await cliente.proximaMensagem()).codigo, "mensagem-invalida");
  await cliente.fechada;
});

test("sala expira após a tolerância quando a última pessoa sai", async () => {
  const { id } = await criarSala();
  const primeiro = await conectar();
  primeiro.enviar({ tipo: "entrar", idSala: id });
  await primeiro.proximaMensagem();
  primeiro.fechar();
  await primeiro.fechada;
  await esperar(TOLERANCIA_MS * 3);

  const segundo = await conectar();
  segundo.enviar({ tipo: "entrar", idSala: id });
  assert.equal((await segundo.proximaMensagem()).codigo, "sala-inexistente");
});

test("voltar dentro da tolerância mantém a sala e o anfitrião", async () => {
  const { id, tokenAnfitriao } = await criarSala();
  const primeiro = await conectar();
  primeiro.enviar({ tipo: "entrar", idSala: id, tokenAnfitriao });
  await primeiro.proximaMensagem();
  primeiro.fechar();
  await primeiro.fechada;

  const segundo = await conectar();
  segundo.enviar({ tipo: "entrar", idSala: id, tokenAnfitriao });
  assert.equal((await segundo.proximaMensagem()).anfitriao, true);
  segundo.fechar();
});
