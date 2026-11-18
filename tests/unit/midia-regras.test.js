import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classificarErroCaptura,
  classificarErroCompartilhamento,
} from "../../public/js/midia-regras.js";

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

// ---------- Erros do compartilhamento de tela (T05) ----------

for (const [nome, mensagem, esperado] of [
  ["NotAllowedError", "Permission denied by system", "permissao"],
  ["NotAllowedError", "Permission denied", "cancelado"],
  ["AbortError", "", "cancelado"],
  ["NotFoundError", "", "falha"],
  ["NotReadableError", "", "falha"],
  ["TypeError", "", "falha"],
  [undefined, undefined, "falha"],
]) {
  test(`classificarErroCompartilhamento(${nome}, ${JSON.stringify(mensagem)}) → ${esperado}`, () => {
    assert.equal(classificarErroCompartilhamento(nome, mensagem), esperado);
  });
}
