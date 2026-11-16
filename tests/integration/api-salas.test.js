import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { subirServidor } from "./auxiliares.js";

let servidor;
before(async () => {
  servidor = await subirServidor();
});
after(() => servidor.fechar());

test("POST /api/salas cria uma sala e devolve id, link e token", async () => {
  const resposta = await fetch(`${servidor.url}/api/salas`, { method: "POST" });
  assert.equal(resposta.status, 201);
  const corpo = await resposta.json();
  assert.match(corpo.id, /^[A-Za-z0-9_-]{22}$/);
  assert.match(corpo.tokenAnfitriao, /^[A-Za-z0-9_-]{22}$/);
  assert.equal(corpo.link, `${servidor.url}/sala/${corpo.id}`);
});

test("duas criações devolvem ids diferentes", async () => {
  const [a, b] = await Promise.all([
    fetch(`${servidor.url}/api/salas`, { method: "POST" }).then((r) => r.json()),
    fetch(`${servidor.url}/api/salas`, { method: "POST" }).then((r) => r.json()),
  ]);
  assert.notEqual(a.id, b.id);
});

test("GET /api/salas devolve 405 com mensagem em pt-BR", async () => {
  const resposta = await fetch(`${servidor.url}/api/salas`);
  assert.equal(resposta.status, 405);
  assert.deepEqual(await resposta.json(), { erro: "Método não permitido." });
});
