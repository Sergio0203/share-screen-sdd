import { test } from "node:test";
import assert from "node:assert/strict";
import { criarRegistroSalas } from "../../src/salas.js";

// Relógio falso: guarda os agendamentos para que o teste os dispare manualmente.
function criarRelogioFalso() {
  const pendentes = new Map();
  let proximo = 1;
  return {
    agendar(callback, ms) {
      const id = proximo++;
      pendentes.set(id, { callback, ms });
      return id;
    },
    cancelar(id) {
      pendentes.delete(id);
    },
    pendentes,
    dispararTudo() {
      const atuais = [...pendentes.values()];
      pendentes.clear();
      for (const { callback } of atuais) callback();
    },
  };
}

function novoRegistro() {
  const relogio = criarRelogioFalso();
  const registro = criarRegistroSalas({
    agendar: relogio.agendar,
    cancelar: relogio.cancelar,
  });
  return { registro, relogio };
}

test("criar devolve id e token distintos e a sala passa a existir", () => {
  const { registro } = novoRegistro();
  const { id, tokenAnfitriao } = registro.criar();
  assert.notEqual(id, tokenAnfitriao);
  assert.equal(registro.existe(id), true);
});

test("salas criadas em sequência têm ids diferentes", () => {
  const { registro } = novoRegistro();
  assert.notEqual(registro.criar().id, registro.criar().id);
});

test("sala criada sem ninguém expira após 60 s", () => {
  const { registro, relogio } = novoRegistro();
  const { id } = registro.criar();
  assert.equal([...relogio.pendentes.values()][0].ms, 60_000);
  relogio.dispararTudo();
  assert.equal(registro.existe(id), false);
});

test("entrar com o token correto reconhece o anfitrião", () => {
  const { registro } = novoRegistro();
  const { id, tokenAnfitriao } = registro.criar();
  assert.deepEqual(registro.entrar(id, {}, tokenAnfitriao), { anfitriao: true });
});

test("entrar sem token ou com token errado não é anfitrião", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  assert.deepEqual(registro.entrar(id, {}), { anfitriao: false });
  assert.deepEqual(registro.entrar(id, {}, "x".repeat(22)), { anfitriao: false });
});

test("entrar em sala inexistente devolve null", () => {
  const { registro } = novoRegistro();
  assert.equal(registro.entrar("a".repeat(22), {}), null);
});

test("entrar cancela a expiração", () => {
  const { registro, relogio } = novoRegistro();
  const { id } = registro.criar();
  registro.entrar(id, {});
  assert.equal(relogio.pendentes.size, 0);
  relogio.dispararTudo();
  assert.equal(registro.existe(id), true);
});

test("quando a última pessoa sai, a sala expira após 60 s", () => {
  const { registro, relogio } = novoRegistro();
  const { id } = registro.criar();
  const conexao = {};
  registro.entrar(id, conexao);
  registro.sair(id, conexao);
  assert.equal(registro.existe(id), true);
  assert.equal([...relogio.pendentes.values()][0].ms, 60_000);
  relogio.dispararTudo();
  assert.equal(registro.existe(id), false);
});

test("voltar durante a tolerância mantém a sala e o anfitrião", () => {
  const { registro, relogio } = novoRegistro();
  const { id, tokenAnfitriao } = registro.criar();
  const primeira = {};
  registro.entrar(id, primeira, tokenAnfitriao);
  registro.sair(id, primeira);
  assert.deepEqual(registro.entrar(id, {}, tokenAnfitriao), { anfitriao: true });
  relogio.dispararTudo();
  assert.equal(registro.existe(id), true);
});

test("sair com outra pessoa ainda presente não agenda expiração", () => {
  const { registro, relogio } = novoRegistro();
  const { id } = registro.criar();
  const a = {};
  const b = {};
  registro.entrar(id, a);
  registro.entrar(id, b);
  registro.sair(id, a);
  assert.equal(relogio.pendentes.size, 0);
});
