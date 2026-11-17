import { test } from "node:test";
import assert from "node:assert/strict";
import { INTERVALO_POSICAO_MS, devoEnviarPosicao } from "../../public/js/movimento-recado.js";

const A = { x: 0.1, y: 0.2 };
const B = { x: 0.3, y: 0.4 };

test("o intervalo mínimo entre posições é de 50 ms", () => {
  assert.equal(INTERVALO_POSICAO_MS, 50);
});

test("a primeira posição é sempre enviada", () => {
  assert.equal(devoEnviarPosicao(1000, null, A, null), true);
});

test("o mesmo ponto não é enviado de novo, mesmo depois do intervalo", () => {
  assert.equal(devoEnviarPosicao(2000, 1000, { ...A }, A), false);
});

test("um ponto novo só é enviado depois de 50 ms", () => {
  assert.equal(devoEnviarPosicao(1049, 1000, B, A), false);
  assert.equal(devoEnviarPosicao(1050, 1000, B, A), true);
  assert.equal(devoEnviarPosicao(1200, 1000, B, A), true);
});

test("mudar só x ou só y conta como ponto novo", () => {
  assert.equal(devoEnviarPosicao(1050, 1000, { x: A.x, y: 0.9 }, A), true);
  assert.equal(devoEnviarPosicao(1050, 1000, { x: 0.9, y: A.y }, A), true);
});
