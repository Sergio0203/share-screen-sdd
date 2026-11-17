import { test } from "node:test";
import assert from "node:assert/strict";
import { quadrosDeVideo } from "../../public/js/quadros.js";

const LISTA = [
  { id: "a", nome: "Ana", camera: true },
  { id: "b", nome: "Bruno", camera: false },
  { id: "c", nome: "Carla", camera: true },
];

test("só quem está com a câmera ligada tem quadro, na ordem da lista", () => {
  assert.deepEqual(
    quadrosDeVideo(LISTA, "b", []).map((q) => q.id),
    ["a", "c"],
  );
});

test("o próprio quadro é marcado com (você)", () => {
  assert.deepEqual(quadrosDeVideo(LISTA, "a", []), [
    { id: "a", nome: "Ana", rotulo: "Ana (você)", ehVoce: true, falhou: false },
    { id: "c", nome: "Carla", rotulo: "Carla", ehVoce: false, falhou: false },
  ]);
});

test("falhou só vale para outras pessoas e aceita qualquer iterável", () => {
  const quadros = quadrosDeVideo(LISTA, "a", new Set(["a", "c"]));
  assert.deepEqual(
    quadros.map((q) => [q.id, q.falhou]),
    [
      ["a", false],
      ["c", true],
    ],
  );
});

test("sem câmeras ligadas não há quadros", () => {
  assert.deepEqual(quadrosDeVideo([{ id: "a", nome: "Ana", camera: false }], "a", []), []);
});
