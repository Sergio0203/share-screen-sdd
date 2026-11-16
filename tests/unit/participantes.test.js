import { test } from "node:test";
import assert from "node:assert/strict";
import { rotularParticipantes, souAnfitriao } from "../../public/js/participantes.js";

const LISTA = [
  { id: "a", nome: "Ana", anfitriao: true },
  { id: "b", nome: "Bruno", anfitriao: false },
];

test("rotularParticipantes marca você e o anfitrião, na mesma ordem", () => {
  assert.deepEqual(rotularParticipantes(LISTA, "a"), [
    { id: "a", texto: "Ana (você) · anfitrião", ehVoce: true, ehAnfitriao: true },
    { id: "b", texto: "Bruno", ehVoce: false, ehAnfitriao: false },
  ]);
});

test("rotularParticipantes para quem não é anfitrião", () => {
  assert.deepEqual(
    rotularParticipantes(LISTA, "b").map((item) => item.texto),
    ["Ana · anfitrião", "Bruno (você)"],
  );
});

test("souAnfitriao indica se a própria pessoa é a anfitriã", () => {
  assert.equal(souAnfitriao(LISTA, "a"), true);
  assert.equal(souAnfitriao(LISTA, "b"), false);
  assert.equal(souAnfitriao([], "a"), false);
});
