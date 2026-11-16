import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarSegredo, idValido, segredosIguais } from "../../src/ids.js";

const FORMATO = /^[A-Za-z0-9_-]{22}$/;

test("gerarSegredo devolve 22 caracteres base64url", () => {
  assert.match(gerarSegredo(), FORMATO);
});

test("10.000 segredos gerados não se repetem", () => {
  const gerados = new Set();
  for (let i = 0; i < 10_000; i++) gerados.add(gerarSegredo());
  assert.equal(gerados.size, 10_000);
});

test("idValido aceita só o formato de 22 caracteres base64url", () => {
  assert.equal(idValido(gerarSegredo()), true);
  assert.equal(idValido("curto"), false);
  assert.equal(idValido("a".repeat(23)), false);
  assert.equal(idValido("a".repeat(21) + "!"), false);
  assert.equal(idValido(undefined), false);
  assert.equal(idValido(123), false);
});

test("segredosIguais compara corretamente", () => {
  const segredo = gerarSegredo();
  assert.equal(segredosIguais(segredo, segredo), true);
  assert.equal(segredosIguais(segredo, gerarSegredo()), false);
  assert.equal(segredosIguais(segredo, segredo + "a"), false);
  assert.equal(segredosIguais(segredo, undefined), false);
  assert.equal(segredosIguais(undefined, undefined), false);
});
