import { test } from "node:test";
import assert from "node:assert/strict";
import {
  QUALIDADES,
  QUALIDADE_PADRAO,
  descreverQualidadeAtiva,
  parametrosDeEnvio,
  qualidadePorId,
  restricoesDeCaptura,
} from "../../public/js/qualidades.js";

test("as três qualidades, nesta ordem, com seus valores", () => {
  assert.deepEqual(
    QUALIDADES.map(({ id, nome, largura, altura, qps, taxaMaxima }) => [
      id,
      nome,
      largura,
      altura,
      qps,
      taxaMaxima,
    ]),
    [
      ["720p30", "720p · 30 fps", 1280, 720, 30, 2_500_000],
      ["1080p30", "1080p · 30 fps", 1920, 1080, 30, 4_000_000],
      ["1080p60", "1080p · 60 fps", 1920, 1080, 60, 6_000_000],
    ],
  );
});

test("a padrão é 1080p · 30 fps e id desconhecido cai na padrão", () => {
  assert.equal(QUALIDADE_PADRAO, "1080p30");
  assert.equal(qualidadePorId("1080p60").qps, 60);
  for (const id of ["xyz", undefined, null]) assert.equal(qualidadePorId(id).id, "1080p30");
});

test("restricoesDeCaptura só limita o máximo (nunca aumenta a imagem)", () => {
  assert.deepEqual(restricoesDeCaptura(qualidadePorId("720p30")), {
    width: { max: 1280 },
    height: { max: 720 },
    frameRate: { ideal: 30, max: 30 },
  });
});

test("parametrosDeEnvio limita qps e taxa, mantém a fluidez e não altera o original", () => {
  const atuais = { encodings: [{ active: true }], outro: 1 };
  const novos = parametrosDeEnvio(atuais, qualidadePorId("1080p60"));
  assert.deepEqual(novos, {
    outro: 1,
    degradationPreference: "maintain-framerate",
    encodings: [
      { active: true, maxFramerate: 60, maxBitrate: 6_000_000, scaleResolutionDownBy: 1 },
    ],
  });
  assert.deepEqual(atuais, { encodings: [{ active: true }], outro: 1 });
});

test("parametrosDeEnvio sem encodings (ainda não negociado) não muda os encodings", () => {
  const novos = parametrosDeEnvio({ encodings: [] }, qualidadePorId("720p30"));
  assert.deepEqual(novos.encodings, []);
});

test("descreverQualidadeAtiva: normal, ultrawide e tela menor", () => {
  const q = qualidadePorId("1080p30");
  assert.equal(
    descreverQualidadeAtiva(q, { largura: 1920, altura: 1080 }),
    "Qualidade: 1080p · 30 fps",
  );
  // Ultrawide reduzido: a largura bate no máximo, só a proporção é diferente.
  assert.equal(
    descreverQualidadeAtiva(q, { largura: 1920, altura: 804 }),
    "Qualidade: 1080p · 30 fps",
  );
  assert.equal(
    descreverQualidadeAtiva(q, { largura: 1366, altura: 768 }),
    "Qualidade: 1366×768 · 30 fps (limitada pelo tamanho da tela)",
  );
  assert.equal(descreverQualidadeAtiva(q, {}), "Qualidade: 1080p · 30 fps");
});
