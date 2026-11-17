import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classificarErroCaptura,
  compararPares,
  devoIniciar,
} from "../../public/js/midia-regras.js";

const lista = (...ids) => ids.map((id) => ({ id, nome: id }));

// ---------- Quem inicia cada conexão ----------

test("devoIniciar escolhe exatamente um lado de cada par", () => {
  assert.equal(devoIniciar("a", "b"), true);
  assert.equal(devoIniciar("b", "a"), false);
});

// ---------- Diferença entre conexões e lista ----------

test("compararPares cria só os pares em que sou o iniciador, nunca comigo", () => {
  assert.deepEqual(compararPares([], lista("a", "b", "c"), "b"), { criar: ["c"], fechar: [] });
  assert.deepEqual(compararPares([], lista("a", "b", "c"), "a"), {
    criar: ["b", "c"],
    fechar: [],
  });
});

test("compararPares fecha pares de quem saiu da lista", () => {
  assert.deepEqual(compararPares(["c", "d"], lista("a", "c"), "a"), {
    criar: [],
    fechar: ["d"],
  });
});

test("compararPares não mexe em pares que continuam na lista", () => {
  assert.deepEqual(compararPares(["b"], lista("a", "b"), "a"), { criar: [], fechar: [] });
  // Par criado pelo outro lado (sou o maior) também é mantido.
  assert.deepEqual(compararPares(["a"], lista("a", "b"), "b"), { criar: [], fechar: [] });
});

test("compararPares aceita qualquer iterável de ids", () => {
  const pares = new Map([["z", {}]]);
  assert.deepEqual(compararPares(pares.keys(), lista("a", "b"), "a"), {
    criar: ["b"],
    fechar: ["z"],
  });
});

// ---------- Erros do microfone ----------

for (const [nome, esperado] of [
  ["NotAllowedError", "permissao"],
  ["SecurityError", "permissao"],
  ["NotFoundError", "semDispositivo"],
  ["OverconstrainedError", "semDispositivo"],
  ["NotReadableError", "falha"],
  ["AbortError", "falha"],
  ["TypeError", "falha"],
  [undefined, "falha"],
]) {
  test(`classificarErroCaptura(${nome}) → ${esperado}`, () => {
    assert.equal(classificarErroCaptura(nome), esperado);
  });
}
