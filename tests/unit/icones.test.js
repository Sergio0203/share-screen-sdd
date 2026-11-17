import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ICONES } from "../../public/js/icones.js";

const NOMES = [
  "microfone",
  "microfone-desligado",
  "camera",
  "camera-desligada",
  "monitor",
  "monitor-parar",
  "tela-cheia",
  "qualidade",
  "copiar",
  "som",
  "coroa",
  "usuarios",
  "alerta",
  "sucesso",
  "seta-direita",
  "recarregar",
  "carregando",
];
const TAGS = new Set(["path", "circle", "rect", "line", "polyline"]);
const PASTA_JS = path.join(import.meta.dirname, "../../public/js");

test("o conjunto tem exatamente os ícones da interface", () => {
  assert.deepEqual(Object.keys(ICONES).sort(), [...NOMES].sort());
});

test("cada ícone tem pelo menos um elemento de desenho válido", () => {
  for (const [nome, elementos] of Object.entries(ICONES)) {
    assert.ok(elementos.length > 0, `${nome} sem desenho`);
    for (const [tag, atributos] of elementos) {
      assert.ok(TAGS.has(tag), `${nome}: tag inesperada ${tag}`);
      assert.equal(typeof atributos, "object", `${nome}: atributos ausentes`);
    }
  }
});

test("todo ícone usado no código existe no conjunto", () => {
  const usados = new Set();
  for (const arquivo of fs.readdirSync(PASTA_JS).filter((nome) => nome.endsWith(".js"))) {
    const codigo = fs.readFileSync(path.join(PASTA_JS, arquivo), "utf8");
    for (const [, nome] of codigo.matchAll(/criarIcone\("([a-z-]+)"\)/g)) usados.add(nome);
  }
  for (const nome of usados) assert.ok(nome in ICONES, `ícone desconhecido: ${nome}`);
});
