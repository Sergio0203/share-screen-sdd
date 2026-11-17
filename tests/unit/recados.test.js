import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RECADO_MAXIMO,
  contarCaracteres,
  normalizarTextoRecado,
  cortarTextoRecado,
  textoRecadoValido,
  textoDepoisDaInsercao,
  caberNoLimite,
} from "../../public/js/recados.js";

test("o limite é de 100 caracteres", () => {
  assert.equal(RECADO_MAXIMO, 100);
});

test("conta símbolos visíveis, não unidades internas", () => {
  assert.equal(contarCaracteres("abc"), 3);
  assert.equal(contarCaracteres("👍"), 1);
  assert.equal(contarCaracteres("👨‍👩‍👧"), 1);
  assert.equal(contarCaracteres("é"), 1);
  assert.equal(contarCaracteres(""), 0);
});

test("quebras de linha viram espaços", () => {
  assert.equal(normalizarTextoRecado("a\r\nb\nc\rd"), "a b c d");
});

test("corta em 100 caracteres sem partir emojis", () => {
  assert.equal(contarCaracteres(cortarTextoRecado("x".repeat(150))), 100);
  const emojis = cortarTextoRecado("👍".repeat(120));
  assert.equal(contarCaracteres(emojis), 100);
  assert.equal(emojis, "👍".repeat(100));
  assert.equal(cortarTextoRecado("a\nb"), "a b");
});

test("valida o texto do recado", () => {
  assert.equal(textoRecadoValido("x".repeat(100)), true);
  assert.equal(textoRecadoValido("x".repeat(101)), false);
  assert.equal(textoRecadoValido("👍".repeat(100)), true);
  assert.equal(textoRecadoValido("a\nb"), true);
  assert.equal(textoRecadoValido(""), true);
  assert.equal(textoRecadoValido(5), false);
  assert.equal(textoRecadoValido(null), false);
  assert.equal(textoRecadoValido({}), false);
});

test("calcula o texto depois de uma inserção que substitui a seleção", () => {
  assert.equal(textoDepoisDaInsercao("abcd", 1, 3, "XY"), "aXYd");
  assert.equal(textoDepoisDaInsercao("abc", 3, 3, "d"), "abcd");
});

test("ao colar, entra só o que cabe", () => {
  assert.equal(caberNoLimite("x".repeat(95), 95, 95, "y".repeat(10)), "yyyyy");
  assert.equal(caberNoLimite("x".repeat(100), 100, 100, "y"), "");
  assert.equal(caberNoLimite("x".repeat(100), 0, 3, "abc"), "abc");
  assert.equal(caberNoLimite("x".repeat(98), 98, 98, "👍👍👍"), "👍👍");
  assert.equal(caberNoLimite("", 0, 0, "a\nb"), "a b");
});

test("o contador diz quantos caracteres faltam, no singular com 1", async () => {
  const { TEXTOS } = await import("../../public/js/textos.js");
  assert.equal(TEXTOS.caracteresRestantes(100), "Faltam 100 caracteres");
  assert.equal(TEXTOS.caracteresRestantes(63), "Faltam 63 caracteres");
  assert.equal(TEXTOS.caracteresRestantes(1), "Falta 1 caractere");
  assert.equal(TEXTOS.caracteresRestantes(0), "Faltam 0 caracteres");
});
