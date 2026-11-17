import { test } from "node:test";
import assert from "node:assert/strict";
import { acaoDaTecla, ehCampoDeTexto } from "../../public/js/atalho-recado.js";

// Sem campo aberto, ponteiro sobre a imagem em destaque.
const PRONTO = {
  alvoEhCampoDeTexto: false,
  campoAberto: false,
  temDestaque: true,
  pontoNaImagem: { x: 0.5, y: 0.5 },
};
// Campo de recado aberto, mas sem foco (a pessoa clicou na imagem ou voltou de outra janela).
const CAMPO_SEM_FOCO = { ...PRONTO, campoAberto: true };

const tecla = (key, extra = {}) => ({
  key,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...extra,
});

// ---------- Sem campo aberto: só `/` abre (T07) ----------

test("/ sobre a imagem em destaque abre o campo", () => {
  assert.equal(acaoDaTecla(tecla("/"), PRONTO), "abrir");
});

test("outras teclas não fazem nada sem campo aberto", () => {
  for (const key of ["a", "?", "Escape", "Enter", "Backspace"]) {
    assert.equal(acaoDaTecla(tecla(key), PRONTO), null, key);
  }
});

test("/ com Ctrl, Alt ou ⌘ não abre", () => {
  assert.equal(acaoDaTecla(tecla("/", { ctrlKey: true }), PRONTO), null);
  assert.equal(acaoDaTecla(tecla("/", { altKey: true }), PRONTO), null);
  assert.equal(acaoDaTecla(tecla("/", { metaKey: true }), PRONTO), null);
});

test("/ segurado (repetição) não abre", () => {
  assert.equal(acaoDaTecla(tecla("/", { repeat: true }), PRONTO), null);
});

test("/ digitado em outro campo de texto não abre", () => {
  assert.equal(acaoDaTecla(tecla("/"), { ...PRONTO, alvoEhCampoDeTexto: true }), null);
});

test("sem destaque ou com o ponteiro fora da imagem não abre", () => {
  assert.equal(acaoDaTecla(tecla("/"), { ...PRONTO, temDestaque: false }), null);
  assert.equal(acaoDaTecla(tecla("/"), { ...PRONTO, pontoNaImagem: null }), null);
});

// ---------- Campo aberto sem foco: as teclas voltam ao recado (T08) ----------

test("teclas que escrevem voltam ao campo, inclusive /", () => {
  for (const key of ["/", "a", "Á", " ", "7", "Backspace", "Delete", "Dead"]) {
    assert.equal(acaoDaTecla(tecla(key), CAMPO_SEM_FOCO), "voltarAoCampo", key);
  }
});

test("/ com o recado visível não abre outro campo, mesmo fora da imagem", () => {
  assert.equal(
    acaoDaTecla(tecla("/"), { ...CAMPO_SEM_FOCO, pontoNaImagem: null }),
    "voltarAoCampo",
  );
});

test("Esc com o campo sem foco apaga o recado", () => {
  assert.equal(acaoDaTecla(tecla("Escape"), CAMPO_SEM_FOCO), "apagar");
});

test("teclas que não escrevem não puxam o foco", () => {
  for (const key of ["Enter", "ArrowLeft", "Tab", "F1", "Shift", "Control"]) {
    assert.equal(acaoDaTecla(tecla(key), CAMPO_SEM_FOCO), null, key);
  }
});

test("atalhos com Ctrl, Alt ou ⌘ não puxam o foco", () => {
  assert.equal(acaoDaTecla(tecla("a", { ctrlKey: true }), CAMPO_SEM_FOCO), null);
  assert.equal(acaoDaTecla(tecla("c", { metaKey: true }), CAMPO_SEM_FOCO), null);
  assert.equal(acaoDaTecla(tecla("a", { altKey: true }), CAMPO_SEM_FOCO), null);
});

test("teclas num campo de texto (o próprio recado ou o nome) ficam com ele", () => {
  const emCampo = { ...CAMPO_SEM_FOCO, alvoEhCampoDeTexto: true };
  for (const key of ["/", "a", "Escape", "Backspace"]) {
    assert.equal(acaoDaTecla(tecla(key), emCampo), null, key);
  }
});

test("reconhece campos de texto", () => {
  assert.equal(ehCampoDeTexto({ tagName: "INPUT", type: "text" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "INPUT", type: "search" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "TEXTAREA" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "SELECT" }), true);
  assert.equal(ehCampoDeTexto({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(ehCampoDeTexto({ tagName: "BUTTON" }), false);
  assert.equal(ehCampoDeTexto({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(ehCampoDeTexto({ tagName: "DIV", isContentEditable: false }), false);
  assert.equal(ehCampoDeTexto(null), false);
});
