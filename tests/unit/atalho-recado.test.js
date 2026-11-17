import { test } from "node:test";
import assert from "node:assert/strict";
import { deveAbrirCampo, ehCampoDeTexto } from "../../public/js/atalho-recado.js";

const PRONTO = { alvoEhCampoDeTexto: false, temDestaque: true, pontoNaImagem: { x: 0.5, y: 0.5 } };
const barra = (extra = {}) => ({
  key: "/",
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...extra,
});

test("/ sobre a imagem em destaque abre o campo", () => {
  assert.equal(deveAbrirCampo(barra(), PRONTO), true);
});

test("outras teclas não abrem", () => {
  assert.equal(deveAbrirCampo(barra({ key: "a" }), PRONTO), false);
  assert.equal(deveAbrirCampo(barra({ key: "?" }), PRONTO), false);
});

test("/ com Ctrl, Alt ou ⌘ não abre", () => {
  assert.equal(deveAbrirCampo(barra({ ctrlKey: true }), PRONTO), false);
  assert.equal(deveAbrirCampo(barra({ altKey: true }), PRONTO), false);
  assert.equal(deveAbrirCampo(barra({ metaKey: true }), PRONTO), false);
});

test("/ segurado (repetição) não abre", () => {
  assert.equal(deveAbrirCampo(barra({ repeat: true }), PRONTO), false);
});

test("/ digitado em outro campo de texto não abre", () => {
  assert.equal(deveAbrirCampo(barra(), { ...PRONTO, alvoEhCampoDeTexto: true }), false);
});

test("sem destaque ou com o ponteiro fora da imagem não abre", () => {
  assert.equal(deveAbrirCampo(barra(), { ...PRONTO, temDestaque: false }), false);
  assert.equal(deveAbrirCampo(barra(), { ...PRONTO, pontoNaImagem: null }), false);
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
