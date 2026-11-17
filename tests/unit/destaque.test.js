import { test } from "node:test";
import assert from "node:assert/strict";
import { escolherDestaque } from "../../public/js/destaque.js";

const pessoa = (id, tela) => ({ id, nome: id.toUpperCase(), tela });

test("sem compartilhamentos não há destaque", () => {
  assert.deepEqual(escolherDestaque([pessoa("a", null), pessoa("b", null)], "a", null), {
    destaque: null,
    miniaturas: [],
  });
});

test("a própria tela nunca aparece para quem compartilha", () => {
  const lista = [pessoa("a", { inicio: 1, som: true }), pessoa("b", null)];
  assert.deepEqual(escolherDestaque(lista, "a", null), { destaque: null, miniaturas: [] });
});

test("um compartilhamento de outra pessoa vai para o destaque", () => {
  const lista = [pessoa("a", null), pessoa("b", { inicio: 4, som: false })];
  assert.deepEqual(escolherDestaque(lista, "a", null), {
    destaque: { id: "b", nome: "B", som: false, inicio: 4 },
    miniaturas: [],
  });
});

test("com dois, o mais recente fica em destaque", () => {
  const lista = [
    pessoa("a", null),
    pessoa("b", { inicio: 5, som: true }),
    pessoa("c", { inicio: 2, som: true }),
  ];
  const { destaque, miniaturas } = escolherDestaque(lista, "a", null);
  assert.equal(destaque.id, "b");
  assert.deepEqual(
    miniaturas.map((m) => m.id),
    ["c"],
  );
});

// ---------- Escolha manual (US2) ----------

const TRES = [
  pessoa("a", null),
  pessoa("b", { inicio: 2, som: true }),
  pessoa("c", { inicio: 7, som: false }),
  pessoa("d", { inicio: 5, som: true }),
];

test("a escolha que ainda compartilha fica em destaque, mesmo não sendo a mais recente", () => {
  const { destaque, miniaturas } = escolherDestaque(TRES, "a", "b");
  assert.equal(destaque.id, "b");
  assert.deepEqual(
    miniaturas.map((m) => m.id),
    ["c", "d"],
  );
});

test("escolha que parou de compartilhar volta para a mais recente", () => {
  assert.equal(escolherDestaque(TRES, "a", "z").destaque.id, "c");
});

test("escolher a própria tela é ignorado", () => {
  const lista = [pessoa("a", { inicio: 9, som: true }), pessoa("b", { inicio: 1, som: true })];
  assert.equal(escolherDestaque(lista, "a", "a").destaque.id, "b");
});

test("miniaturas ficam do mais recente ao mais antigo e mantêm o som", () => {
  const { miniaturas } = escolherDestaque(TRES, "a", null);
  assert.deepEqual(
    miniaturas.map(({ id, som }) => [id, som]),
    [
      ["d", true],
      ["b", true],
    ],
  );
});
