import { test } from "node:test";
import assert from "node:assert/strict";
import {
  areaDaImagem,
  pontoNaImagem,
  pixelNaArea,
  encaixarNaArea,
} from "../../public/js/posicao-recado.js";

const quaseIgual = (a, b, tolerancia = 1e-9) =>
  assert.ok(Math.abs(a - b) <= tolerancia, `${a} ≠ ${b}`);

// Compara objetos de números com tolerância de arredondamento.
function objetosQuaseIguais(atual, esperado) {
  assert.deepEqual(Object.keys(atual).sort(), Object.keys(esperado).sort());
  for (const chave of Object.keys(esperado)) quaseIgual(atual[chave], esperado[chave]);
}

test("imagem larga numa caixa quadrada: faixas em cima e embaixo", () => {
  objetosQuaseIguais(areaDaImagem({ left: 0, top: 0, width: 1000, height: 1000 }, 1920, 1080), {
    left: 0,
    top: 218.75,
    width: 1000,
    height: 562.5,
  });
});

test("imagem 16:9 numa caixa baixa: faixas laterais, centralizada", () => {
  const area = areaDaImagem({ left: 10, top: 20, width: 1000, height: 300 }, 1920, 1080);
  quaseIgual(area.height, 300);
  quaseIgual(area.width, (300 * 1920) / 1080);
  quaseIgual(area.top, 20);
  quaseIgual(area.left, 10 + (1000 - area.width) / 2);
});

test("sem dimensões do vídeo não há área", () => {
  assert.equal(areaDaImagem({ left: 0, top: 0, width: 100, height: 100 }, 0, 0), null);
});

test("ponto dentro da imagem vira fração da imagem", () => {
  const caixa = { left: 0, top: 0, width: 1000, height: 1000 };
  objetosQuaseIguais(pontoNaImagem(caixa, 1920, 1080, 500, 500), { x: 0.5, y: 0.5 });
  objetosQuaseIguais(pontoNaImagem(caixa, 1920, 1080, 0, 218.75), { x: 0, y: 0 });
  objetosQuaseIguais(pontoNaImagem(caixa, 1920, 1080, 1000, 781.25), { x: 1, y: 1 });
});

test("ponto nas faixas vazias ou fora da caixa não vale", () => {
  const caixa = { left: 0, top: 0, width: 1000, height: 1000 };
  assert.equal(pontoNaImagem(caixa, 1920, 1080, 500, 100), null);
  assert.equal(pontoNaImagem(caixa, 1920, 1080, 500, 900), null);
  assert.equal(pontoNaImagem(caixa, 1920, 1080, -5, 500), null);
  assert.equal(pontoNaImagem(caixa, 1920, 1080, 1200, 500), null);
  assert.equal(pontoNaImagem(caixa, 0, 0, 500, 500), null);
});

test("o mesmo ponto da imagem em janelas de tamanhos diferentes (SC-002)", () => {
  const pequena = { left: 0, top: 0, width: 1280, height: 600 };
  const grande = { left: 50, top: 80, width: 1920, height: 1080 };
  const ponto = pontoNaImagem(pequena, 1920, 1080, 700, 333);
  const areaPequena = areaDaImagem(pequena, 1920, 1080);
  const areaGrande = areaDaImagem(grande, 1920, 1080);
  const naGrande = pixelNaArea(areaGrande, ponto.x, ponto.y);
  quaseIgual(
    naGrande.esquerda / areaGrande.width,
    (700 - areaPequena.left) / areaPequena.width,
    0.01,
  );
  quaseIgual(naGrande.topo / areaGrande.height, (333 - areaPequena.top) / areaPequena.height, 0.01);
});

test("pixelNaArea é relativo à área da imagem", () => {
  assert.deepEqual(pixelNaArea({ left: 30, top: 40, width: 200, height: 100 }, 0.25, 0.5), {
    esquerda: 50,
    topo: 50,
  });
});

test("caixa que passa da borda é empurrada para dentro", () => {
  const area = { left: 0, top: 0, width: 400, height: 300 };
  assert.deepEqual(encaixarNaArea({ esquerda: 350, topo: 280, largura: 100, altura: 40 }, area), {
    esquerda: 300,
    topo: 260,
  });
  assert.deepEqual(encaixarNaArea({ esquerda: 10, topo: 10, largura: 100, altura: 40 }, area), {
    esquerda: 10,
    topo: 10,
  });
  // Caixa maior que a área: fica no canto, nunca em posição negativa.
  assert.deepEqual(encaixarNaArea({ esquerda: 50, topo: 50, largura: 500, altura: 400 }, area), {
    esquerda: 0,
    topo: 0,
  });
});

test("ultrawide numa caixa 4:3: faixas em cima e embaixo, ponto fiel", () => {
  const caixa = { left: 0, top: 0, width: 800, height: 600 };
  const area = areaDaImagem(caixa, 2560, 1080);
  quaseIgual(area.width, 800);
  quaseIgual(area.height, (800 * 1080) / 2560);
  quaseIgual(area.top, (600 - area.height) / 2);
  const ponto = pontoNaImagem(caixa, 2560, 1080, 200, area.top + area.height / 4);
  objetosQuaseIguais(ponto, { x: 0.25, y: 0.25 });
});

test("janela estreita (retrato) numa caixa 16:9: faixas laterais, ponto fiel", () => {
  const caixa = { left: 0, top: 0, width: 1600, height: 900 };
  const area = areaDaImagem(caixa, 1080, 1920);
  quaseIgual(area.height, 900);
  quaseIgual(area.width, (900 * 1080) / 1920);
  quaseIgual(area.left, (1600 - area.width) / 2);
  assert.equal(pontoNaImagem(caixa, 1080, 1920, 100, 450), null);
  objetosQuaseIguais(pontoNaImagem(caixa, 1080, 1920, 800, 450), { x: 0.5, y: 0.5 });
});

test("recado no canto inferior direito é empurrado para dentro sem mudar o ponto", () => {
  const area = { left: 0, top: 0, width: 640, height: 360 };
  const ponto = { x: 0.98, y: 0.97 };
  const { esquerda, topo } = pixelNaArea(area, ponto.x, ponto.y);
  const caixa = encaixarNaArea({ esquerda, topo, largura: 200, altura: 40 }, area);
  assert.deepEqual(caixa, { esquerda: 440, topo: 320 });
  assert.deepEqual(ponto, { x: 0.98, y: 0.97 });
});
