import { test } from "node:test";
import assert from "node:assert/strict";
import { inicialDoNome, quadrosDeVideo } from "../../public/js/quadros.js";

const LISTA = [
  { id: "a", nome: "Ana", camera: true },
  { id: "b", nome: "Bruno", camera: false },
  { id: "c", nome: "Carla", camera: true },
];

// T09 FR-017 (altera a T04): todo participante tem quadro; câmera desligada vira avatar.
test("todos os participantes têm quadro, na ordem da lista", () => {
  assert.deepEqual(
    quadrosDeVideo(LISTA, "b", []).map((q) => q.id),
    ["a", "b", "c"],
  );
});

test("o próprio quadro é marcado com (você) e cada quadro traz câmera e inicial", () => {
  assert.deepEqual(quadrosDeVideo(LISTA, "a", []), [
    {
      id: "a",
      nome: "Ana",
      rotulo: "Ana (você)",
      ehVoce: true,
      cameraLigada: true,
      falhou: false,
      inicial: "A",
    },
    {
      id: "b",
      nome: "Bruno",
      rotulo: "Bruno",
      ehVoce: false,
      cameraLigada: false,
      falhou: false,
      inicial: "B",
    },
    {
      id: "c",
      nome: "Carla",
      rotulo: "Carla",
      ehVoce: false,
      cameraLigada: true,
      falhou: false,
      inicial: "C",
    },
  ]);
});

test("falhou só vale para outras pessoas com câmera ligada e aceita qualquer iterável", () => {
  const quadros = quadrosDeVideo(LISTA, "a", new Set(["a", "b", "c"]));
  assert.deepEqual(
    quadros.map((q) => [q.id, q.falhou]),
    [
      ["a", false],
      ["b", false],
      ["c", true],
    ],
  );
});

test("câmera desligada gera quadro sem vídeo", () => {
  assert.deepEqual(
    quadrosDeVideo([{ id: "a", nome: "Ana", camera: false }], "a", []).map((q) => q.cameraLigada),
    [false],
  );
});

test("sem participantes não há quadros", () => {
  assert.deepEqual(quadrosDeVideo([], "a", []), []);
});

test("inicialDoNome devolve o primeiro caractere visível em maiúscula", () => {
  assert.equal(inicialDoNome("ana"), "A");
  assert.equal(inicialDoNome("Élia"), "É");
  assert.equal(inicialDoNome("🎮 Léo"), "🎮");
  assert.equal(inicialDoNome("ñandu"), "Ñ");
  assert.equal(inicialDoNome("élia"), "É");
  assert.equal(inicialDoNome(""), "?");
});
