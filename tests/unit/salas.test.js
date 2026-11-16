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
    duracoesPendentes() {
      return [...pendentes.values()].map(({ ms }) => ms);
    },
    disparar(ms) {
      for (const [id, item] of [...pendentes]) {
        if (item.ms !== ms) continue;
        pendentes.delete(id);
        item.callback();
      }
    },
  };
}

function novoRegistro(opcoes = {}) {
  const relogio = criarRelogioFalso();
  const mudancas = [];
  const registro = criarRegistroSalas({
    agendar: relogio.agendar,
    cancelar: relogio.cancelar,
    aoMudar: (id) => mudancas.push(id),
    ...opcoes,
  });
  return { registro, relogio, mudancas };
}

// Atalho: entra com uma conexão nova e devolve { conexao, participante }.
function entrar(registro, id, nome, chave) {
  const conexao = { nome };
  const resultado = registro.entrar(id, { chave, nome, conexao });
  return { conexao, ...resultado };
}

// ---------- Criação e expiração (T01) ----------

test("criar devolve id e chave distintos e a sala passa a existir", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  assert.match(id, /^[A-Za-z0-9_-]{22}$/);
  assert.match(chave, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(id, chave);
  assert.deepEqual(registro.listar(id), []);
});

test("sala criada sem ninguém expira após 60 s", () => {
  const { registro, relogio } = novoRegistro();
  const { id } = registro.criar();
  assert.deepEqual(relogio.duracoesPendentes(), [60_000]);
  relogio.disparar(60_000);
  assert.equal(registro.listar(id), null);
});

test("entrar cancela a expiração", () => {
  const { registro, relogio } = novoRegistro();
  const { id, chave } = registro.criar();
  entrar(registro, id, "Ana", chave);
  assert.deepEqual(relogio.duracoesPendentes(), []);
});

test("quando a última pessoa sai, a sala expira após 60 s", () => {
  const { registro, relogio } = novoRegistro();
  const { id, chave } = registro.criar();
  const { conexao } = entrar(registro, id, "Ana", chave);
  registro.sair(id, conexao);
  assert.deepEqual(relogio.duracoesPendentes(), [60_000]);
  relogio.disparar(60_000);
  assert.equal(registro.listar(id), null);
});

// ---------- Entrada e lista ----------

test("entrar com a chave do criador torna a pessoa anfitriã", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const { participante } = entrar(registro, id, "Ana", chave);
  assert.equal(participante.chave, chave);
  assert.deepEqual(registro.listar(id), [{ id: participante.id, nome: "Ana", anfitriao: true }]);
});

test("entrar sem chave gera uma chave nova e não é anfitrião", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const { participante } = entrar(registro, id, "Bruno");
  assert.match(participante.chave, /^[A-Za-z0-9_-]{22}$/);
  assert.notEqual(participante.chave, chave);
  assert.equal(registro.listar(id)[0].anfitriao, false);
});

test("chave em formato inválido é trocada por uma nova", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  const { participante } = entrar(registro, id, "Bruno", "curta");
  assert.match(participante.chave, /^[A-Za-z0-9_-]{22}$/);
});

test("nome inválido é recusado", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  assert.deepEqual(entrar(registro, id, "   ").erro, "nome-invalido");
  assert.deepEqual(entrar(registro, id, "a".repeat(31)).erro, "nome-invalido");
  assert.deepEqual(registro.listar(id), []);
});

test("nome é guardado sem espaços nas pontas", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  entrar(registro, id, "  Ana  ");
  assert.equal(registro.listar(id)[0].nome, "Ana");
});

test("sala inexistente é recusada", () => {
  const { registro } = novoRegistro();
  assert.equal(entrar(registro, "a".repeat(22), "Ana").erro, "sala-inexistente");
});

test("listar segue a ordem de entrada e não expõe chaves", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  entrar(registro, id, "Ana", chave);
  entrar(registro, id, "Bruno");
  entrar(registro, id, "Carla");
  const lista = registro.listar(id);
  assert.deepEqual(
    lista.map((p) => p.nome),
    ["Ana", "Bruno", "Carla"],
  );
  for (const item of lista) assert.deepEqual(Object.keys(item).sort(), ["anfitriao", "id", "nome"]);
});

test("conexoes devolve as conexões dos presentes", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  const a = entrar(registro, id, "Ana");
  const b = entrar(registro, id, "Bruno");
  assert.deepEqual(registro.conexoes(id), [a.conexao, b.conexao]);
});

test("sair remove a pessoa da lista", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  const a = entrar(registro, id, "Ana");
  entrar(registro, id, "Bruno");
  registro.sair(id, a.conexao);
  assert.deepEqual(
    registro.listar(id).map((p) => p.nome),
    ["Bruno"],
  );
});

// ---------- Mesma chave (recarregar / outra aba) ----------

test("entrar com chave já presente substitui a conexão sem duplicar", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const primeira = entrar(registro, id, "Ana", chave);
  entrar(registro, id, "Bruno");
  const segunda = entrar(registro, id, "Aninha", chave);

  assert.equal(segunda.conexaoSubstituida, primeira.conexao);
  assert.equal(segunda.participante.id, primeira.participante.id);
  assert.deepEqual(
    registro.listar(id).map((p) => p.nome),
    ["Aninha", "Bruno"],
  );
  assert.deepEqual(registro.conexoes(id)[0], segunda.conexao);
});

test("sair de uma conexão já substituída não remove a pessoa", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const primeira = entrar(registro, id, "Ana", chave);
  entrar(registro, id, "Ana", chave);
  registro.sair(id, primeira.conexao);
  assert.equal(registro.listar(id).length, 1);
});

test("primeira entrada não tem conexão substituída", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  assert.equal(entrar(registro, id, "Ana").conexaoSubstituida, null);
});

// ---------- Notificações ----------

test("aoMudar é chamado após entrar e após sair", () => {
  const { registro, mudancas } = novoRegistro();
  const { id } = registro.criar();
  const a = entrar(registro, id, "Ana");
  assert.deepEqual(mudancas, [id]);
  registro.sair(id, a.conexao);
  assert.deepEqual(mudancas, [id, id]);
});

test("entrada recusada não chama aoMudar", () => {
  const { registro, mudancas } = novoRegistro();
  const { id } = registro.criar();
  entrar(registro, id, "");
  assert.deepEqual(mudancas, []);
});

// ---------- Consulta antes da tela de nome (US2) ----------

test("consultar devolve null para sala inexistente", () => {
  const { registro } = novoRegistro();
  assert.equal(registro.consultar("a".repeat(22)), null);
});

test("consultar devolve cheia: false para sala com vaga", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  assert.deepEqual(registro.consultar(id), { cheia: false });
});

test("consultar devolve null depois que a sala expira", () => {
  const { registro, relogio } = novoRegistro();
  const { id } = registro.criar();
  relogio.disparar(60_000);
  assert.equal(registro.consultar(id), null);
});

// ---------- Limite de 6 pessoas (US3) ----------

function encherSala(registro, id, quantidade = 6) {
  return Array.from({ length: quantidade }, (_, i) => entrar(registro, id, `Pessoa ${i + 1}`));
}

test("a 7ª pessoa recebe sala-cheia e a lista continua com 6", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  encherSala(registro, id);
  assert.equal(entrar(registro, id, "Sétima").erro, "sala-cheia");
  assert.equal(registro.listar(id).length, 6);
  assert.deepEqual(registro.consultar(id), { cheia: true });
});

test("quem já está na sala cheia pode reconectar com a própria chave", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  const [primeira] = encherSala(registro, id);
  const reconexao = entrar(registro, id, "Pessoa 1", primeira.participante.chave);
  assert.equal(reconexao.erro, undefined);
  assert.equal(reconexao.conexaoSubstituida, primeira.conexao);
  assert.equal(registro.listar(id).length, 6);
});

test("depois que alguém sai, a 7ª pessoa consegue entrar", () => {
  const { registro } = novoRegistro();
  const { id } = registro.criar();
  const [primeira] = encherSala(registro, id);
  registro.sair(id, primeira.conexao);
  assert.equal(entrar(registro, id, "Sétima").erro, undefined);
  assert.equal(registro.listar(id).length, 6);
});

test("a capacidade pode ser configurada", () => {
  const { registro } = novoRegistro({ capacidade: 2 });
  const { id } = registro.criar();
  encherSala(registro, id, 2);
  assert.equal(entrar(registro, id, "Terceira").erro, "sala-cheia");
});

// ---------- Transferência do anfitrião (FR-013 a FR-015) ----------

function anfitrioes(registro, id) {
  return registro
    .listar(id)
    .filter((p) => p.anfitriao)
    .map((p) => p.nome);
}

function salaComTres() {
  const contexto = novoRegistro();
  const { registro } = contexto;
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  const bruno = entrar(registro, id, "Bruno");
  const carla = entrar(registro, id, "Carla");
  return { ...contexto, id, chave, ana, bruno, carla };
}

test("anfitrião ausente por 10 s passa o papel para quem está há mais tempo", () => {
  const { registro, relogio, mudancas, id, ana } = salaComTres();
  registro.sair(id, ana.conexao);
  assert.deepEqual(relogio.duracoesPendentes(), [10_000]);
  const mudancasAntes = mudancas.length;

  relogio.disparar(10_000);
  assert.deepEqual(anfitrioes(registro, id), ["Bruno"]);
  assert.equal(mudancas.length, mudancasAntes + 1);
});

test("anfitrião que volta antes de 10 s continua anfitrião", () => {
  const { registro, relogio, id, chave, ana } = salaComTres();
  registro.sair(id, ana.conexao);
  entrar(registro, id, "Ana", chave);
  assert.deepEqual(relogio.duracoesPendentes(), []);
  assert.deepEqual(anfitrioes(registro, id), ["Ana"]);
});

test("anfitrião que volta depois da transferência entra como participante comum", () => {
  const { registro, relogio, id, chave, ana } = salaComTres();
  registro.sair(id, ana.conexao);
  relogio.disparar(10_000);
  entrar(registro, id, "Ana", chave);
  assert.deepEqual(anfitrioes(registro, id), ["Bruno"]);
});

test("quem herdou o papel continua anfitrião ao reconectar dentro de 10 s", () => {
  const { registro, relogio, id, ana, bruno } = salaComTres();
  registro.sair(id, ana.conexao);
  relogio.disparar(10_000);
  registro.sair(id, bruno.conexao);
  entrar(registro, id, "Bruno", bruno.participante.chave);
  assert.deepEqual(relogio.duracoesPendentes(), []);
  assert.deepEqual(anfitrioes(registro, id), ["Bruno"]);
});

test("anfitrião sozinho que sai não agenda transferência, só a expiração", () => {
  const { registro, relogio } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  registro.sair(id, ana.conexao);
  assert.deepEqual(relogio.duracoesPendentes(), [60_000]);
});

test("se alguém entra com o anfitrião ausente, o papel passa a essa pessoa após 10 s", () => {
  const { registro, relogio } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  registro.sair(id, ana.conexao);
  entrar(registro, id, "Davi");
  assert.deepEqual(relogio.duracoesPendentes(), [10_000]);
  relogio.disparar(10_000);
  assert.deepEqual(anfitrioes(registro, id), ["Davi"]);
});

test("sala recém-criada: quem entra antes do criador vira anfitrião só após 10 s", () => {
  const { registro, relogio } = novoRegistro();
  const { id, chave } = registro.criar();
  entrar(registro, id, "Bruno");
  assert.deepEqual(anfitrioes(registro, id), []);
  entrar(registro, id, "Ana", chave);
  assert.deepEqual(relogio.duracoesPendentes(), []);
  assert.deepEqual(anfitrioes(registro, id), ["Ana"]);
});

test("nunca há dois anfitriões", () => {
  const { registro, relogio, id, chave, ana, bruno } = salaComTres();
  registro.sair(id, ana.conexao);
  relogio.disparar(10_000);
  entrar(registro, id, "Ana", chave);
  registro.sair(id, bruno.conexao);
  relogio.disparar(10_000);
  assert.equal(anfitrioes(registro, id).length, 1);
});
