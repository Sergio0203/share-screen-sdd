import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assinaturasDesejadas,
  podeLigar,
  proximoEstadoMidia,
  trilhasParaPublicar,
} from "../../public/js/midia-estado.js";

// ---------- assinaturasDesejadas (T10 research §6) ----------

const publicacoes = [
  { identidade: "ana", fonte: "microphone" },
  { identidade: "ana", fonte: "camera" },
  { identidade: "ana", fonte: "screen_share" },
  { identidade: "ana", fonte: "screen_share_audio" },
  { identidade: "bruno", fonte: "microphone" },
  { identidade: "bruno", fonte: "screen_share" },
  { identidade: "bruno", fonte: "screen_share_audio" },
];

test("vozes e câmeras são sempre assinadas; só a tela em destaque, com o som dela", () => {
  assert.deepEqual(
    assinaturasDesejadas(publicacoes, "bruno").map(({ identidade, fonte, assinar }) => [
      identidade,
      fonte,
      assinar,
    ]),
    [
      ["ana", "microphone", true],
      ["ana", "camera", true],
      ["ana", "screen_share", false],
      ["ana", "screen_share_audio", false],
      ["bruno", "microphone", true],
      ["bruno", "screen_share", true],
      ["bruno", "screen_share_audio", true],
    ],
  );
});

test("sem destaque, nenhuma tela é assinada", () => {
  const telas = assinaturasDesejadas(publicacoes, null).filter(({ fonte }) =>
    fonte.startsWith("screen_share"),
  );
  assert.ok(telas.every(({ assinar }) => assinar === false));
});

test("assinaturasDesejadas preserva os outros campos de cada publicação", () => {
  const publicacao = { identidade: "ana", fonte: "camera", extra: 1 };
  assert.deepEqual(assinaturasDesejadas([publicacao], null), [{ ...publicacao, assinar: true }]);
});

// ---------- trilhasParaPublicar (T10 research §9) ----------

const viva = (nome) => ({ nome, readyState: "live" });
const parada = (nome) => ({ nome, readyState: "ended" });

test("publica só as trilhas vivas, na ordem microfone, câmera, tela, som da tela", () => {
  assert.deepEqual(
    trilhasParaPublicar({
      somTela: viva("som"),
      tela: viva("tela"),
      camera: parada("camera"),
      microfone: viva("mic"),
    }).map(({ fonte, trilha }) => [fonte, trilha.nome]),
    [
      ["microphone", "mic"],
      ["screen_share", "tela"],
      ["screen_share_audio", "som"],
    ],
  );
});

test("sem trilhas, não há nada a publicar", () => {
  assert.deepEqual(
    trilhasParaPublicar({ microfone: null, camera: null, tela: null, somTela: null }),
    [],
  );
});

// ---------- proximoEstadoMidia (T10 data-model "Conexão de mídia") ----------

const TRANSICOES = [
  ["conectando", "conectou", "conectada"],
  ["conectando", "falhou", "indisponivel"],
  ["conectada", "reconectando", "reconectando"],
  ["reconectando", "reconectou", "conectada"],
  ["reconectando", "passaram3s", "indisponivel"],
  ["reconectando", "desconectou", "indisponivel"],
  ["conectada", "desconectou", "indisponivel"],
  ["indisponivel", "tentar", "conectando"],
];

for (const [de, evento, para] of TRANSICOES) {
  test(`${de} + ${evento} → ${para}`, () => {
    assert.equal(proximoEstadoMidia(de, evento), para);
  });
}

test("sair leva qualquer estado a encerrada, e encerrada não sai mais", () => {
  for (const estado of ["conectando", "conectada", "reconectando", "indisponivel"]) {
    assert.equal(proximoEstadoMidia(estado, "sair"), "encerrada");
  }
  for (const evento of ["conectou", "tentar", "reconectou", "falhou", "sair"]) {
    assert.equal(proximoEstadoMidia("encerrada", evento), "encerrada");
  }
});

test("eventos sem transição mantêm o estado", () => {
  assert.equal(proximoEstadoMidia("conectada", "conectou"), "conectada");
  assert.equal(proximoEstadoMidia("conectada", "passaram3s"), "conectada");
  assert.equal(proximoEstadoMidia("indisponivel", "desconectou"), "indisponivel");
  assert.equal(proximoEstadoMidia("indisponivel", "falhou"), "indisponivel");
  assert.equal(proximoEstadoMidia("conectando", "reconectou"), "conectando");
  assert.equal(proximoEstadoMidia("conectando", "evento-desconhecido"), "conectando");
});

test("só dá para ligar microfone, câmera ou tela com a mídia conectada", () => {
  assert.equal(podeLigar("conectada"), true);
  for (const estado of ["conectando", "reconectando", "indisponivel", "encerrada"]) {
    assert.equal(podeLigar(estado), false, estado);
  }
});
