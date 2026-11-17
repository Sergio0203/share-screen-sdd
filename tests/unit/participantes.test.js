import { test } from "node:test";
import assert from "node:assert/strict";
import { rotularParticipantes, souAnfitriao } from "../../public/js/participantes.js";
import { TEXTOS } from "../../public/js/textos.js";

const LISTA = [
  { id: "a", nome: "Ana", anfitriao: true, microfone: true, camera: false },
  { id: "b", nome: "Bruno", anfitriao: false, microfone: false, camera: true },
];

test("rotularParticipantes marca você e o anfitrião, na mesma ordem", () => {
  assert.deepEqual(rotularParticipantes(LISTA, "a"), [
    {
      id: "a",
      texto: "Ana (você) · anfitrião",
      ehVoce: true,
      ehAnfitriao: true,
      microfoneLigado: true,
      rotuloMicrofone: TEXTOS.microfoneLigado,
      cameraLigada: false,
      rotuloCamera: TEXTOS.cameraDesligada,
    },
    {
      id: "b",
      texto: "Bruno",
      ehVoce: false,
      ehAnfitriao: false,
      microfoneLigado: false,
      rotuloMicrofone: TEXTOS.microfoneDesligado,
      cameraLigada: true,
      rotuloCamera: TEXTOS.cameraLigada,
    },
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

test("rotularParticipantes descreve o microfone de cada pessoa", () => {
  assert.deepEqual(
    rotularParticipantes(LISTA, "b").map((item) => item.rotuloMicrofone),
    ["microfone ligado", "microfone desligado"],
  );
});

test("rotularParticipantes descreve a câmera de cada pessoa", () => {
  assert.deepEqual(
    rotularParticipantes(LISTA, "a").map((item) => item.rotuloCamera),
    ["câmera desligada", "câmera ligada"],
  );
});
