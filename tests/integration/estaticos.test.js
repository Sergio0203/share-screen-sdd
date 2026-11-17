import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { subirServidor } from "./auxiliares.js";

let servidor;
before(async () => {
  servidor = await subirServidor();
});
after(() => servidor.fechar());

// fetch normaliza "/../", então usamos http.get para enviar o caminho cru.
function getCru(url, caminho) {
  return new Promise((resolver, rejeitar) => {
    http
      .get(url + caminho, (resposta) => {
        resposta.resume();
        resolver(resposta.statusCode);
      })
      .on("error", rejeitar);
  });
}

test("GET / devolve a página da aplicação", async () => {
  const resposta = await fetch(`${servidor.url}/`);
  assert.equal(resposta.status, 200);
  assert.match(await resposta.text(), /<html lang="pt-BR">/);
});

test("a página traz o título e o cabeçalho com o nome Telão (T09 FR-018)", async () => {
  const html = await (await fetch(`${servidor.url}/`)).text();
  assert.match(html, /<title>Telão<\/title>/);
  assert.match(html, /<header class="cabecalho"[^>]*>[\s\S]*Telão[\s\S]*<\/header>/);
});

test("GET /sala/<id> devolve a mesma página da aplicação", async () => {
  const resposta = await fetch(`${servidor.url}/sala/abc`);
  assert.equal(resposta.status, 200);
  assert.match(await resposta.text(), /<html lang="pt-BR">/);
});

test("GET de arquivo JavaScript devolve o tipo de conteúdo correto", async () => {
  const resposta = await fetch(`${servidor.url}/js/textos.js`);
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get("content-type"), /javascript/);
});

test("caminho que sai de public/ devolve 404", async () => {
  assert.equal(await getCru(servidor.url, "/%2e%2e/package.json"), 404);
  assert.equal(await getCru(servidor.url, "/../package.json"), 404);
});

test("arquivo inexistente devolve 404", async () => {
  const resposta = await fetch(`${servidor.url}/nao-existe.js`);
  assert.equal(resposta.status, 404);
});
