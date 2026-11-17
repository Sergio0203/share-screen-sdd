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
  assert.deepEqual(registro.listar(id), [
    {
      id: participante.id,
      nome: "Ana",
      anfitriao: true,
      microfone: false,
      camera: false,
      tela: null,
      assistindo: null,
    },
  ]);
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
  for (const item of lista)
    assert.deepEqual(Object.keys(item).sort(), [
      "anfitriao",
      "assistindo",
      "camera",
      "id",
      "microfone",
      "nome",
      "tela",
    ]);
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
  // Id público novo: os outros recriam a conexão de voz com a página recarregada (T03).
  assert.notEqual(segunda.participante.id, primeira.participante.id);
  const [aninha, bruno] = registro.listar(id);
  assert.equal(aninha.id, segunda.participante.id);
  assert.equal(aninha.nome, "Aninha");
  assert.equal(aninha.anfitriao, true);
  assert.equal(bruno.nome, "Bruno");
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

// ---------- Busca por id público e por conexão (T03) ----------

test("conexaoPorId devolve a conexão do participante ou null", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  assert.equal(registro.conexaoPorId(id, ana.participante.id), ana.conexao);
  assert.equal(registro.conexaoPorId(id, "x".repeat(22)), null);
  assert.equal(registro.conexaoPorId("y".repeat(22), ana.participante.id), null);

  entrar(registro, id, "Ana", chave);
  assert.equal(registro.conexaoPorId(id, ana.participante.id), null, "id antigo some");
});

test("idPorConexao devolve o id público ou null", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  assert.equal(registro.idPorConexao(id, ana.conexao), ana.participante.id);
  assert.equal(registro.idPorConexao(id, {}), null);

  const nova = entrar(registro, id, "Ana", chave);
  assert.equal(registro.idPorConexao(id, ana.conexao), null, "conexão substituída");
  assert.equal(registro.idPorConexao(id, nova.conexao), nova.participante.id);
});

// ---------- Estado do microfone (T03) ----------

test("definirMicrofone muda o estado na lista e avisa só quando muda", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  assert.equal(registro.listar(id)[0].microfone, false);

  mudancas.length = 0;
  registro.definirMicrofone(id, ana.conexao, true);
  assert.equal(registro.listar(id)[0].microfone, true);
  assert.deepEqual(mudancas, [id]);

  registro.definirMicrofone(id, ana.conexao, true);
  assert.deepEqual(mudancas, [id], "mesmo valor não avisa de novo");

  registro.definirMicrofone(id, ana.conexao, false);
  assert.equal(registro.listar(id)[0].microfone, false);
  assert.deepEqual(mudancas, [id, id]);
});

test("definirMicrofone ignora conexão desconhecida ou substituída", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const antiga = entrar(registro, id, "Ana", chave);
  entrar(registro, id, "Ana", chave);
  mudancas.length = 0;

  registro.definirMicrofone(id, antiga.conexao, true);
  registro.definirMicrofone(id, {}, true);
  registro.definirMicrofone("x".repeat(22), antiga.conexao, true);
  assert.equal(registro.listar(id)[0].microfone, false);
  assert.deepEqual(mudancas, []);
});

test("substituir a conexão desliga o microfone", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  registro.definirMicrofone(id, ana.conexao, true);
  entrar(registro, id, "Ana", chave);
  assert.equal(registro.listar(id)[0].microfone, false);
});

// ---------- Estado da câmera (T04) ----------

test("definirCamera muda o estado na lista e avisa só quando muda", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  assert.equal(registro.listar(id)[0].camera, false);

  mudancas.length = 0;
  registro.definirCamera(id, ana.conexao, true);
  assert.equal(registro.listar(id)[0].camera, true);
  assert.deepEqual(mudancas, [id]);

  registro.definirCamera(id, ana.conexao, true);
  assert.deepEqual(mudancas, [id], "mesmo valor não avisa de novo");

  registro.definirCamera(id, ana.conexao, false);
  assert.equal(registro.listar(id)[0].camera, false);
  assert.deepEqual(mudancas, [id, id]);
});

test("definirCamera ignora conexão desconhecida ou substituída", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const antiga = entrar(registro, id, "Ana", chave);
  entrar(registro, id, "Ana", chave);
  mudancas.length = 0;

  registro.definirCamera(id, antiga.conexao, true);
  registro.definirCamera(id, {}, true);
  registro.definirCamera("x".repeat(22), antiga.conexao, true);
  assert.equal(registro.listar(id)[0].camera, false);
  assert.deepEqual(mudancas, []);
});

test("substituir a conexão desliga a câmera", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  registro.definirCamera(id, ana.conexao, true);
  entrar(registro, id, "Ana", chave);
  assert.equal(registro.listar(id)[0].camera, false);
});

test("câmera e microfone não interferem um no outro", () => {
  const { registro } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  const estado = () => {
    const { camera, microfone } = registro.listar(id)[0];
    return { camera, microfone };
  };

  registro.definirCamera(id, ana.conexao, true);
  assert.deepEqual(estado(), { camera: true, microfone: false });
  registro.definirMicrofone(id, ana.conexao, true);
  assert.deepEqual(estado(), { camera: true, microfone: true });
  registro.definirCamera(id, ana.conexao, false);
  assert.deepEqual(estado(), { camera: false, microfone: true });
});

// ---------- Compartilhamento de tela (T05) ----------

test("definirTela numera os compartilhamentos e só avisa quando muda", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  const bruno = entrar(registro, id, "Bruno");
  const telaDe = (nome) => registro.listar(id).find((p) => p.nome === nome).tela;
  assert.equal(telaDe("Ana"), null);
  assert.equal(registro.listar(id)[0].assistindo, null);

  mudancas.length = 0;
  registro.definirTela(id, ana.conexao, { compartilhando: true, som: true });
  assert.deepEqual(telaDe("Ana"), { inicio: 1, som: true });
  assert.deepEqual(mudancas, [id]);

  registro.definirTela(id, bruno.conexao, { compartilhando: true, som: false });
  assert.deepEqual(telaDe("Bruno"), { inicio: 2, som: false });

  mudancas.length = 0;
  registro.definirTela(id, ana.conexao, { compartilhando: true, som: true });
  assert.deepEqual(mudancas, [], "repetir não muda nada");
  registro.definirTela(id, ana.conexao, { compartilhando: true, som: false });
  assert.deepEqual(telaDe("Ana"), { inicio: 1, som: false }, "só o som muda");
  assert.deepEqual(mudancas, [id]);

  registro.definirTela(id, ana.conexao, { compartilhando: false });
  assert.equal(telaDe("Ana"), null);
  registro.definirTela(id, ana.conexao, { compartilhando: true, som: true });
  assert.equal(telaDe("Ana").inicio, 3, "começar de novo ganha número novo");
});

test("definirAssistindo guarda o destaque e só avisa quando muda", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const ana = entrar(registro, id, "Ana", chave);
  mudancas.length = 0;

  registro.definirAssistindo(id, ana.conexao, "x");
  assert.equal(registro.listar(id)[0].assistindo, "x");
  assert.deepEqual(mudancas, [id]);
  registro.definirAssistindo(id, ana.conexao, "x");
  assert.deepEqual(mudancas, [id]);
  registro.definirAssistindo(id, ana.conexao, null);
  assert.equal(registro.listar(id)[0].assistindo, null);
});

test("tela e assistindo ignoram conexão desconhecida e zeram na substituição", () => {
  const { registro, mudancas } = novoRegistro();
  const { id, chave } = registro.criar();
  const antiga = entrar(registro, id, "Ana", chave);
  registro.definirTela(id, antiga.conexao, { compartilhando: true, som: true });
  registro.definirAssistindo(id, antiga.conexao, "x");

  entrar(registro, id, "Ana", chave);
  assert.equal(registro.listar(id)[0].tela, null);
  assert.equal(registro.listar(id)[0].assistindo, null);

  mudancas.length = 0;
  registro.definirTela(id, antiga.conexao, { compartilhando: true, som: true });
  registro.definirAssistindo(id, {}, "y");
  assert.equal(registro.listar(id)[0].tela, null);
  assert.deepEqual(mudancas, []);
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

// ---------- Recados sobre o compartilhamento (T07) ----------

// Sala com Ana compartilhando e Bruno assistindo; `mudancasRecados` registra cada aviso.
function salaComRecados() {
  const mudancasRecados = [];
  const contexto = novoRegistro({ aoMudarRecados: (id) => mudancasRecados.push(id) });
  const { registro } = contexto;
  const { id } = registro.criar();
  const ana = entrar(registro, id, "Ana");
  const bruno = entrar(registro, id, "Bruno");
  registro.definirTela(id, ana.conexao, { compartilhando: true, som: true });
  const idAna = ana.participante.id;
  const idBruno = bruno.participante.id;
  const escrever = (conexao, dados = {}) =>
    registro.escreverRecado(id, conexao, { alvo: idAna, x: 0.25, y: 0.75, texto: "oi", ...dados });
  return { ...contexto, id, ana, bruno, idAna, idBruno, mudancasRecados, escrever };
}

const RECADO_MS = 8000;
const FADE_MS = 1000;
const recadosPendentes = (relogio) => relogio.duracoesPendentes().filter((ms) => ms === RECADO_MS);

test("escrever cria um recado com o nome vindo do servidor", () => {
  const { registro, id, bruno, idAna, idBruno, mudancasRecados, escrever, relogio } =
    salaComRecados();
  escrever(bruno.conexao);
  const [recado] = registro.listarRecados(id);
  assert.match(recado.id, /^[A-Za-z0-9_-]{22}$/);
  assert.deepEqual(
    { ...recado, id: undefined },
    {
      id: undefined,
      autor: idBruno,
      nome: "Bruno",
      alvo: idAna,
      x: 0.25,
      y: 0.75,
      texto: "oi",
      apagando: false,
    },
  );
  assert.deepEqual(mudancasRecados, [id]);
  assert.deepEqual(recadosPendentes(relogio), [RECADO_MS]);
});

test("escrever de novo atualiza o mesmo recado, mantém o ponto e reinicia os 8 s", () => {
  const { registro, id, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao, { texto: "o" });
  const [antes] = registro.listarRecados(id);
  escrever(bruno.conexao, { texto: "oi!", x: 0.9, y: 0.9 });
  const lista = registro.listarRecados(id);
  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, antes.id);
  assert.equal(lista[0].texto, "oi!");
  assert.equal(lista[0].x, 0.25);
  assert.equal(lista[0].y, 0.75);
  assert.deepEqual(recadosPendentes(relogio), [RECADO_MS]);
});

test("8 s depois da última tecla o recado começa a apagar e some 1 s depois", () => {
  const { registro, id, bruno, escrever, relogio, mudancasRecados } = salaComRecados();
  escrever(bruno.conexao);
  relogio.disparar(RECADO_MS);
  assert.deepEqual(
    registro.listarRecados(id).map(({ apagando }) => apagando),
    [true],
  );
  assert.equal(mudancasRecados.length, 2);
  assert.deepEqual(
    relogio.duracoesPendentes().filter((ms) => ms === FADE_MS),
    [FADE_MS],
  );
  relogio.disparar(FADE_MS);
  assert.deepEqual(registro.listarRecados(id), []);
  assert.equal(mudancasRecados.length, 3);
});

test("apagar remove o recado na hora e cancela o prazo", () => {
  const { registro, id, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao);
  registro.apagarRecado(id, bruno.conexao);
  assert.deepEqual(registro.listarRecados(id), []);
  assert.deepEqual(recadosPendentes(relogio), []);
});

test("apagar sem recado não faz nada", () => {
  const { registro, id, bruno, mudancasRecados } = salaComRecados();
  registro.apagarRecado(id, bruno.conexao);
  assert.deepEqual(mudancasRecados, []);
});

test("não existe mais fechar recado: o recado vive enquanto o campo está aberto", () => {
  const { registro } = salaComRecados();
  assert.equal(typeof registro.fecharRecado, "undefined");
});

test("escrever sobre outro compartilhamento troca o recado", () => {
  const { registro, id, ana, bruno, idBruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao, { texto: "na tela da Ana" });
  registro.definirTela(id, bruno.conexao, { compartilhando: true, som: false });
  escrever(ana.conexao, { alvo: idBruno, texto: "da Ana" });
  escrever(bruno.conexao, { alvo: idBruno, texto: "na minha tela" });
  assert.deepEqual(
    registro.listarRecados(id).map(({ texto }) => texto),
    ["da Ana", "na minha tela"],
  );
  assert.deepEqual(recadosPendentes(relogio), [RECADO_MS, RECADO_MS]);
});

test("a lista segue a ordem da última tecla e aceita texto vazio", () => {
  const { registro, id, ana, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao, { texto: "" });
  escrever(ana.conexao, { texto: "segundo" });
  escrever(bruno.conexao, { texto: "primeiro" });
  assert.deepEqual(
    registro.listarRecados(id).map(({ nome, texto, apagando }) => ({ nome, texto, apagando })),
    [
      { nome: "Ana", texto: "segundo", apagando: false },
      { nome: "Bruno", texto: "primeiro", apagando: false },
    ],
  );
});

test("quando a tela para de ser compartilhada, os recados dela somem", () => {
  const { registro, id, ana, bruno, escrever, relogio, mudancasRecados } = salaComRecados();
  escrever(bruno.conexao);
  escrever(ana.conexao, { texto: "outro" });
  mudancasRecados.length = 0;
  registro.definirTela(id, ana.conexao, { compartilhando: false });
  assert.deepEqual(registro.listarRecados(id), []);
  assert.deepEqual(recadosPendentes(relogio), []);
  assert.deepEqual(mudancasRecados, [id]);
});

test("quando quem compartilha sai, os recados da tela dela somem", () => {
  const { registro, id, ana, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao);
  registro.sair(id, ana.conexao);
  assert.deepEqual(registro.listarRecados(id), []);
});

test("quando quem compartilha recarrega, os recados da tela antiga somem", () => {
  const { registro, id, ana, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao);
  entrar(registro, id, "Ana", ana.participante.chave);
  assert.deepEqual(registro.listarRecados(id), []);
});

test("quando quem escreve sai, o recado dela some", () => {
  const { registro, id, ana, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao, { texto: "do Bruno" });
  escrever(ana.conexao, { texto: "da Ana" });
  registro.sair(id, bruno.conexao);
  assert.deepEqual(
    registro.listarRecados(id).map(({ texto }) => texto),
    ["da Ana"],
  );
  assert.deepEqual(recadosPendentes(relogio), [RECADO_MS]);
});

// ---------- O recado segue o cursor (T08) ----------

test("mover muda só o ponto do mesmo recado, sem reiniciar o prazo", () => {
  const { registro, id, bruno, escrever, relogio, mudancasRecados } = salaComRecados();
  escrever(bruno.conexao, { x: 0.1, y: 0.1 });
  const [antes] = registro.listarRecados(id);
  const pendentesAntes = [...relogio.pendentes.keys()];
  mudancasRecados.length = 0;

  registro.moverRecado(id, bruno.conexao, { x: 0.6, y: 0.7 });
  const [depois] = registro.listarRecados(id);
  assert.deepEqual(depois, { ...antes, x: 0.6, y: 0.7 });
  assert.deepEqual(mudancasRecados, [id]);
  assert.deepEqual([...relogio.pendentes.keys()], pendentesAntes);
});

test("escrever depois de mover mantém o ponto atual", () => {
  const { registro, id, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao, { x: 0.1, y: 0.1 });
  registro.moverRecado(id, bruno.conexao, { x: 0.6, y: 0.7 });
  escrever(bruno.conexao, { texto: "oi!", x: 0.2, y: 0.2 });
  const [recado] = registro.listarRecados(id);
  assert.deepEqual(
    { x: recado.x, y: recado.y, texto: recado.texto },
    { x: 0.6, y: 0.7, texto: "oi!" },
  );
});

test("mover inválido ou sem recado é ignorado sem aviso", () => {
  const { registro, id, ana, bruno, escrever, mudancasRecados } = salaComRecados();
  registro.moverRecado(id, bruno.conexao, { x: 0.5, y: 0.5 }); // Bruno ainda não tem recado
  assert.deepEqual(mudancasRecados, []);

  escrever(bruno.conexao, { x: 0.1, y: 0.1 });
  mudancasRecados.length = 0;
  for (const ponto of [
    { x: -0.1, y: 0.5 },
    { x: 0.5, y: 1.5 },
    { x: Number.NaN, y: 0.5 },
    { x: 0.5, y: Number.POSITIVE_INFINITY },
  ]) {
    registro.moverRecado(id, bruno.conexao, ponto);
  }
  registro.moverRecado(id, { nome: "intrusa" }, { x: 0.5, y: 0.5 });
  registro.moverRecado("inexistente", bruno.conexao, { x: 0.5, y: 0.5 });
  registro.moverRecado(id, ana.conexao, { x: 0.5, y: 0.5 }); // Ana não tem recado
  const [recado] = registro.listarRecados(id);
  assert.deepEqual({ x: recado.x, y: recado.y }, { x: 0.1, y: 0.1 });
  assert.deepEqual(mudancasRecados, []);
});

test("mover o recado de uma pessoa não altera o de outra", () => {
  const { registro, id, ana, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao, { x: 0.1, y: 0.1, texto: "do Bruno" });
  escrever(ana.conexao, { x: 0.2, y: 0.2, texto: "da Ana" });
  registro.moverRecado(id, bruno.conexao, { x: 0.9, y: 0.9 });
  assert.deepEqual(
    registro.listarRecados(id).map(({ texto, x, y }) => ({ texto, x, y })),
    [
      { texto: "do Bruno", x: 0.9, y: 0.9 },
      { texto: "da Ana", x: 0.2, y: 0.2 },
    ],
  );
});

// ---------- Um recado por pessoa, vários ao mesmo tempo (T08) ----------

test("quem digitou por último fica no fim da lista (desenhado por cima)", () => {
  const { registro, id, ana, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao, { texto: "B1" });
  escrever(ana.conexao, { texto: "A1" });
  const [idBrunoRecado] = registro.listarRecados(id).map((r) => r.id);
  escrever(bruno.conexao, { texto: "B2" });
  const lista = registro.listarRecados(id);
  assert.deepEqual(
    lista.map(({ texto }) => texto),
    ["A1", "B2"],
  );
  assert.equal(lista[1].id, idBrunoRecado);

  registro.moverRecado(id, ana.conexao, { x: 0.9, y: 0.9 });
  assert.deepEqual(
    registro.listarRecados(id).map(({ texto }) => texto),
    ["A1", "B2"],
  );
});

test("uma pessoa nunca tem dois recados, nem escrevendo durante o fade", () => {
  const { registro, id, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao, { texto: "um" });
  const [{ id: idRecado }] = registro.listarRecados(id);
  escrever(bruno.conexao, { texto: "um/" });
  relogio.disparar(RECADO_MS);
  escrever(bruno.conexao, { texto: "um/dois" });
  const lista = registro.listarRecados(id);
  assert.deepEqual(
    lista.map(({ id: idDoRecado, texto }) => ({ id: idDoRecado, texto })),
    [{ id: idRecado, texto: "um/dois" }],
  );
});

test("apagar o recado de uma pessoa não altera o de outra", () => {
  const { registro, id, ana, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao, { texto: "do Bruno" });
  escrever(ana.conexao, { texto: "da Ana" });
  registro.apagarRecado(id, bruno.conexao);
  assert.deepEqual(
    registro.listarRecados(id).map(({ texto }) => texto),
    ["da Ana"],
  );
});

// ---------- O recado some aos poucos (T08) ----------

const fadesPendentes = (relogio) => relogio.duracoesPendentes().filter((ms) => ms === FADE_MS);

test("escrever durante o fade volta o recado ao normal e reinicia os 8 s", () => {
  const { registro, id, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao, { texto: "o" });
  relogio.disparar(RECADO_MS);
  escrever(bruno.conexao, { texto: "oi" });
  const [recado] = registro.listarRecados(id);
  assert.deepEqual(
    { texto: recado.texto, apagando: recado.apagando },
    { texto: "oi", apagando: false },
  );
  assert.deepEqual(fadesPendentes(relogio), []);
  assert.deepEqual(recadosPendentes(relogio), [RECADO_MS]);
  relogio.disparar(FADE_MS); // nada pendente com 1 s: o recado continua
  assert.equal(registro.listarRecados(id).length, 1);
});

test("mover durante o fade não interrompe o fade", () => {
  const { registro, id, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao);
  relogio.disparar(RECADO_MS);
  registro.moverRecado(id, bruno.conexao, { x: 0.9, y: 0.9 });
  const [recado] = registro.listarRecados(id);
  assert.deepEqual({ x: recado.x, apagando: recado.apagando }, { x: 0.9, apagando: true });
  assert.deepEqual(fadesPendentes(relogio), [FADE_MS]);
  relogio.disparar(FADE_MS);
  assert.deepEqual(registro.listarRecados(id), []);
});

test("apagar durante o fade remove na hora e cancela o prazo", () => {
  const { registro, id, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao);
  relogio.disparar(RECADO_MS);
  registro.apagarRecado(id, bruno.conexao);
  assert.deepEqual(registro.listarRecados(id), []);
  assert.deepEqual(fadesPendentes(relogio), []);
});

test("parar de compartilhar ou sair durante o fade cancela o prazo", () => {
  const { registro, id, ana, bruno, escrever, relogio } = salaComRecados();
  escrever(bruno.conexao);
  relogio.disparar(RECADO_MS);
  registro.definirTela(id, ana.conexao, { compartilhando: false });
  assert.deepEqual(registro.listarRecados(id), []);
  assert.deepEqual(fadesPendentes(relogio), []);

  registro.definirTela(id, ana.conexao, { compartilhando: true, som: true });
  escrever(bruno.conexao);
  relogio.disparar(RECADO_MS);
  registro.sair(id, bruno.conexao);
  assert.deepEqual(registro.listarRecados(id), []);
  assert.deepEqual(fadesPendentes(relogio), []);
});

test("recados inválidos são ignorados sem aviso", () => {
  const { registro, id, ana, bruno, idBruno, escrever, mudancasRecados } = salaComRecados();
  escrever(bruno.conexao, { alvo: idBruno }); // Bruno não compartilha
  escrever(bruno.conexao, { alvo: "inexistente" });
  escrever(bruno.conexao, { x: -0.1 });
  escrever(bruno.conexao, { y: 1.5 });
  escrever(bruno.conexao, { x: Number.NaN });
  escrever(bruno.conexao, { y: Number.POSITIVE_INFINITY });
  escrever(bruno.conexao, { texto: "x".repeat(101) });
  escrever({ nome: "intrusa" });
  assert.deepEqual(registro.listarRecados(id), []);
  assert.deepEqual(mudancasRecados, []);

  // Um recado aberto válido não é alterado por uma atualização inválida.
  escrever(ana.conexao, { texto: "ok" });
  escrever(ana.conexao, { texto: "y".repeat(101) });
  assert.deepEqual(
    registro.listarRecados(id).map(({ texto }) => texto),
    ["ok"],
  );
});

test("o texto é guardado normalizado: quebras de linha viram espaços", () => {
  const { registro, id, bruno, escrever } = salaComRecados();
  escrever(bruno.conexao, { texto: "a\nb" });
  assert.equal(registro.listarRecados(id)[0].texto, "a b");
});

test("listarRecados de sala inexistente devolve null", () => {
  const { registro } = novoRegistro();
  assert.equal(registro.listarRecados("naoExisteNaoExiste1234"), null);
});
