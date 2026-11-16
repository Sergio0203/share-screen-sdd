import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import WebSocket from "ws";
import { subirServidor } from "./auxiliares.js";

const TOLERANCIA_MS = 100;
const INTERVALO_PING_MS = 50;

let servidor;
before(async () => {
  servidor = await subirServidor({
    toleranciaMs: TOLERANCIA_MS,
    intervaloPingMs: INTERVALO_PING_MS,
  });
});
after(() => servidor.fechar());

async function criarSala() {
  const resposta = await fetch(`${servidor.url}/api/salas`, { method: "POST" });
  return resposta.json();
}

// Abre uma conexão e enfileira as mensagens recebidas.
async function conectar(opcoesWs = {}) {
  const ws = new WebSocket(servidor.urlWs, opcoesWs);
  const fila = [];
  const aguardando = [];
  ws.on("message", (dados) => {
    const mensagem = JSON.parse(dados.toString());
    const proximo = aguardando.shift();
    if (proximo) proximo(mensagem);
    else fila.push(mensagem);
  });
  const fechada = new Promise((resolver) => ws.on("close", resolver));
  await new Promise((resolver, rejeitar) => {
    ws.on("open", resolver);
    ws.on("error", rejeitar);
  });

  function proxima() {
    return fila.length
      ? Promise.resolve(fila.shift())
      : new Promise((resolver) => aguardando.push(resolver));
  }

  return {
    ws,
    enviar: (dados) => ws.send(typeof dados === "string" ? dados : JSON.stringify(dados)),
    proxima,
    // Descarta mensagens até chegar uma do tipo pedido.
    async esperarTipo(tipo) {
      for (;;) {
        const mensagem = await proxima();
        if (mensagem.tipo === tipo) return mensagem;
      }
    },
    // Espera uma lista de participantes que satisfaça a condição.
    async esperarLista(condicao) {
      for (;;) {
        const { lista } = await this.esperarTipo("participantes");
        if (condicao(lista)) return lista;
      }
    },
    fechar: () => ws.close(),
    fechada,
  };
}

// Conecta e entra; devolve o cliente já com `entrou` lido.
async function entrarNaSala(idSala, nome, chave, opcoesWs) {
  const cliente = await conectar(opcoesWs);
  cliente.enviar({ tipo: "entrar", idSala, nome, chave });
  cliente.entrou = await cliente.proxima();
  return cliente;
}

// ---------- Entrada e lista ----------

test("entrar com nome e a chave do criador devolve entrou e a lista com o anfitrião", async () => {
  const { id, chave } = await criarSala();
  const ana = await conectar();
  ana.enviar({ tipo: "entrar", idSala: id, nome: "Ana", chave });

  const entrou = await ana.proxima();
  assert.equal(entrou.tipo, "entrou");
  assert.equal(entrou.idSala, id);
  assert.equal(entrou.chave, chave);
  assert.match(entrou.voce, /^[A-Za-z0-9_-]{22}$/);

  const participantes = await ana.proxima();
  assert.deepEqual(participantes, {
    tipo: "participantes",
    lista: [{ id: entrou.voce, nome: "Ana", anfitriao: true }],
  });
  ana.fechar();
});

test("quando alguém entra, todos recebem a lista nova em ordem de entrada", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrarNaSala(id, "Ana", chave);
  await ana.esperarTipo("participantes");

  const bruno = await entrarNaSala(id, "Bruno");
  assert.equal(bruno.entrou.tipo, "entrou");
  assert.notEqual(bruno.entrou.chave, chave);

  const esperado = [
    { id: ana.entrou.voce, nome: "Ana", anfitriao: true },
    { id: bruno.entrou.voce, nome: "Bruno", anfitriao: false },
  ];
  assert.deepEqual(await ana.esperarLista((l) => l.length === 2), esperado);
  assert.deepEqual(await bruno.esperarLista((l) => l.length === 2), esperado);
  ana.fechar();
  bruno.fechar();
});

test("quando alguém sai, os demais recebem a lista sem essa pessoa", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrarNaSala(id, "Ana", chave);
  const bruno = await entrarNaSala(id, "Bruno");
  await ana.esperarLista((l) => l.length === 2);

  bruno.fechar();
  const lista = await ana.esperarLista((l) => l.length === 1);
  assert.equal(lista[0].nome, "Ana");
  ana.fechar();
});

test("queda silenciosa é detectada pelo ping e a pessoa sai da lista", async () => {
  const { id, chave } = await criarSala();
  const ana = await entrarNaSala(id, "Ana", chave);
  // autoPong: false simula uma conexão que parou de responder sem fechar.
  const bruno = await entrarNaSala(id, "Bruno", undefined, { autoPong: false });
  await ana.esperarLista((l) => l.length === 2);

  const inicio = Date.now();
  await ana.esperarLista((l) => l.length === 1);
  assert.ok(Date.now() - inicio < 500, "a queda deve ser percebida em menos de 500 ms");
  await bruno.fechada;
  ana.fechar();
});

// ---------- Erros ----------

test("entrar sem nome devolve nome-invalido e fecha", async () => {
  const { id } = await criarSala();
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: id });
  assert.deepEqual(await cliente.proxima(), { tipo: "erro", codigo: "nome-invalido" });
  await cliente.fechada;
});

test("sala inexistente devolve erro e fecha a conexão", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: "a".repeat(22), nome: "Ana" });
  assert.deepEqual(await cliente.proxima(), { tipo: "erro", codigo: "sala-inexistente" });
  await cliente.fechada;
});

test("id em formato inválido é tratado como sala inexistente", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: "../x", nome: "Ana" });
  assert.equal((await cliente.proxima()).codigo, "sala-inexistente");
  await cliente.fechada;
});

for (const [descricao, mensagem] of [
  ["JSON inválido", "{nao é json"],
  ["tipo desconhecido", { tipo: "dançar" }],
]) {
  test(`${descricao} devolve mensagem-invalida e fecha`, async () => {
    const cliente = await conectar();
    cliente.enviar(mensagem);
    assert.deepEqual(await cliente.proxima(), { tipo: "erro", codigo: "mensagem-invalida" });
    await cliente.fechada;
  });
}

test("entrar repetido devolve mensagem-invalida e fecha", async () => {
  const { id } = await criarSala();
  const cliente = await entrarNaSala(id, "Ana");
  cliente.enviar({ tipo: "entrar", idSala: id, nome: "Ana" });
  assert.equal((await cliente.esperarTipo("erro")).codigo, "mensagem-invalida");
  await cliente.fechada;
});

// ---------- Mesma chave ----------

test("mesma chave conectando de novo substitui a conexão antiga", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrarNaSala(id, "Ana", chave);
  await antiga.esperarTipo("participantes");

  const nova = await entrarNaSala(id, "Ana", chave);
  assert.equal(nova.entrou.tipo, "entrou");
  assert.equal(nova.entrou.voce, antiga.entrou.voce);
  assert.deepEqual(await antiga.esperarTipo("erro"), {
    tipo: "erro",
    codigo: "aberta-em-outra-aba",
  });
  await antiga.fechada;

  const lista = await nova.esperarTipo("participantes");
  assert.equal(lista.lista.length, 1);
  assert.equal(lista.lista[0].anfitriao, true);
  nova.fechar();
});

// ---------- Expiração (T01) ----------

test("sala expira após a tolerância quando a última pessoa sai", async () => {
  const { id } = await criarSala();
  const ana = await entrarNaSala(id, "Ana");
  ana.fechar();
  await ana.fechada;
  await esperar(TOLERANCIA_MS * 3);

  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: id, nome: "Ana" });
  assert.equal((await cliente.proxima()).codigo, "sala-inexistente");
});

test("voltar dentro da tolerância mantém a sala e o anfitrião", async () => {
  const { id, chave } = await criarSala();
  const primeira = await entrarNaSala(id, "Ana", chave);
  primeira.fechar();
  await primeira.fechada;

  const segunda = await entrarNaSala(id, "Ana", chave);
  const { lista } = await segunda.esperarTipo("participantes");
  assert.equal(lista[0].anfitriao, true);
  segunda.fechar();
});

// ---------- Limite de 6 pessoas (US3) ----------

test("a 7ª conexão recebe sala-cheia e ninguém vê 7 pessoas", async () => {
  const { id } = await criarSala();
  const presentes = [];
  for (let i = 1; i <= 6; i++) presentes.push(await entrarNaSala(id, `Pessoa ${i}`));
  await presentes[0].esperarLista((l) => l.length === 6);

  const setima = await entrarNaSala(id, "Sétima");
  assert.deepEqual(setima.entrou, { tipo: "erro", codigo: "sala-cheia" });
  await setima.fechada;

  const resposta = await fetch(`${servidor.url}/api/salas/${id}`);
  assert.deepEqual(await resposta.json(), { cheia: true });
  for (const cliente of presentes) cliente.fechar();
});

test("na corrida pela última vaga, exatamente uma pessoa entra", async () => {
  const { id } = await criarSala();
  const presentes = [];
  for (let i = 1; i <= 5; i++) presentes.push(await entrarNaSala(id, `Pessoa ${i}`));

  const concorrentes = await Promise.all([conectar(), conectar(), conectar()]);
  concorrentes.forEach((cliente, i) =>
    cliente.enviar({ tipo: "entrar", idSala: id, nome: `Concorrente ${i}` }),
  );
  const respostas = await Promise.all(concorrentes.map((cliente) => cliente.proxima()));

  assert.equal(respostas.filter((m) => m.tipo === "entrou").length, 1);
  assert.equal(respostas.filter((m) => m.codigo === "sala-cheia").length, 2);
  for (const cliente of [...presentes, ...concorrentes]) cliente.fechar();
});

// ---------- Transferência do anfitrião ----------

test("anfitrião ausente: o papel passa para quem ficou e permanece ao reconectar", async () => {
  const local = await subirServidor({ esperaAnfitriaoMs: 100, intervaloPingMs: 50 });
  try {
    const { id, chave } = await fetch(`${local.url}/api/salas`, { method: "POST" }).then((r) =>
      r.json(),
    );
    const abrir = async (nome, chaveParticipante) => {
      const ws = new WebSocket(local.urlWs);
      const mensagens = [];
      const ouvintes = [];
      ws.on("message", (d) => {
        mensagens.push(JSON.parse(d.toString()));
        for (const ouvinte of ouvintes) ouvinte();
      });
      await new Promise((resolver) => ws.on("open", resolver));
      ws.send(JSON.stringify({ tipo: "entrar", idSala: id, nome, chave: chaveParticipante }));
      const esperarMensagem = (condicao) =>
        new Promise((resolver) => {
          const verificar = () => {
            const achada = mensagens.find(condicao);
            if (achada) resolver(achada);
          };
          ouvintes.push(verificar);
          verificar();
        });
      return { ws, esperarMensagem };
    };

    const ana = await abrir("Ana", chave);
    const bruno = await abrir("Bruno");
    const entrouBruno = await bruno.esperarMensagem((m) => m.tipo === "entrou");
    await bruno.esperarMensagem((m) => m.tipo === "participantes" && m.lista.length === 2);

    ana.ws.close();
    const inicio = Date.now();
    await bruno.esperarMensagem(
      (m) => m.tipo === "participantes" && m.lista.length === 1 && m.lista[0].anfitriao,
    );
    assert.ok(Date.now() - inicio < 500);

    bruno.ws.close();
    const brunoDeNovo = await abrir("Bruno", entrouBruno.chave);
    const lista = await brunoDeNovo.esperarMensagem((m) => m.tipo === "participantes");
    assert.equal(lista.lista[0].anfitriao, true);
    brunoDeNovo.ws.close();
  } finally {
    await local.fechar();
  }
});
