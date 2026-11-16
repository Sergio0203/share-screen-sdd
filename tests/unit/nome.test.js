import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizarNome, motivoNomeInvalido } from "../../public/js/nome.js";

test("normalizarNome remove espaços nas pontas", () => {
  assert.equal(normalizarNome("  Ana  "), "Ana");
  assert.equal(motivoNomeInvalido("  Ana  "), null);
});

test("nome vazio, só espaços ou não-texto é inválido por estar vazio", () => {
  for (const valor of ["", "   ", undefined, null, 123]) {
    assert.equal(normalizarNome(valor), null);
    assert.equal(motivoNomeInvalido(valor), "vazio");
  }
});

test("aceita até 30 caracteres e recusa 31", () => {
  assert.equal(normalizarNome("a".repeat(30)), "a".repeat(30));
  assert.equal(normalizarNome("a".repeat(31)), null);
  assert.equal(motivoNomeInvalido("a".repeat(31)), "longo");
});

test("conta caracteres reais (emoji conta como 1)", () => {
  assert.equal(normalizarNome("😀".repeat(30)), "😀".repeat(30));
  assert.equal(normalizarNome("😀".repeat(31)), null);
});
