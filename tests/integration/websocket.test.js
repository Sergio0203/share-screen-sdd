import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { setTimeout as esperar } from "node:timers/promises";
import WebSocket from "ws";
import { subirServidor } from "./auxiliares.js";

const TOLERANCIA_MS = 100;
const INTERVALO_PING_MS = 50;
// Curto para o teste de "some sozinho", longo o bastante para os outros testes de recado.
const DURACAO_RECADO_MS = 1000;

let servidor;
before(async () => {
  servidor = await subirServidor({
    toleranciaMs: TOLERANCIA_MS,
    intervaloPingMs: INTERVALO_PING_MS,
    duracaoRecadoMs: DURACAO_RECADO_MS,
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
    lista: [
      {
        id: entrou.voce,
        nome: "Ana",
        anfitriao: true,
        microfone: false,
        camera: false,
        tela: null,
        assistindo: null,
      },
    ],
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
    {
      id: ana.entrou.voce,
      nome: "Ana",
      anfitriao: true,
      microfone: false,
      camera: false,
      tela: null,
      assistindo: null,
    },
    {
      id: bruno.entrou.voce,
      nome: "Bruno",
      anfitriao: false,
      microfone: false,
      camera: false,
      tela: null,
      assistindo: null,
    },
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

test("tipo desconhecido depois de entrar devolve mensagem-invalida e fecha", async () => {
  const { id } = await criarSala();
  const cliente = await entrarNaSala(id, "Ana");
  cliente.enviar({ tipo: "xyz" });
  assert.equal((await cliente.esperarTipo("erro")).codigo, "mensagem-invalida");
  await cliente.fechada;
});

test("mensagem maior que 64 KiB fecha a conexão", async () => {
  const { id } = await criarSala();
  const cliente = await conectar();
  cliente.enviar({ tipo: "entrar", idSala: id, nome: "a".repeat(70_000) });
  // 1009 = mensagem grande demais: fechada pelo limite, não pela validação do nome.
  assert.equal(await cliente.fechada, 1009);
});

// ---------- Mesma chave ----------

test("mesma chave conectando de novo substitui a conexão antiga", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrarNaSala(id, "Ana", chave);
  await antiga.esperarTipo("participantes");

  const nova = await entrarNaSala(id, "Ana", chave);
  assert.equal(nova.entrou.tipo, "entrou");
  // Id público novo para que os outros refaçam a conexão de voz (T03).
  assert.notEqual(nova.entrou.voce, antiga.entrou.voce);
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

// ---------- Sinal de voz (T03) ----------

// Ana e Bruno na mesma sala, com as listas iniciais já consumidas.
async function salaComAnaEBruno() {
  const { id, chave } = await criarSala();
  const ana = await entrarNaSala(id, "Ana", chave);
  const bruno = await entrarNaSala(id, "Bruno");
  await ana.esperarLista((l) => l.length === 2);
  await bruno.esperarLista((l) => l.length === 2);
  return { id, ana, bruno };
}

test("sinal chega só ao destinatário, com o remetente em `de`", async () => {
  const { ana, bruno } = await salaComAnaEBruno();
  const dados = { descricao: { type: "offer", sdp: "x" } };
  ana.enviar({ tipo: "sinal", para: bruno.entrou.voce, dados });

  assert.deepEqual(await bruno.proxima(), { tipo: "sinal", de: ana.entrou.voce, dados });
  // Ana não recebe nada: a próxima mensagem dela é a lista após o Bruno sair.
  bruno.fechar();
  assert.equal((await ana.proxima()).tipo, "participantes");
  ana.fechar();
});

test("sinal para id inexistente é ignorado e a conexão continua", async () => {
  const { ana, bruno } = await salaComAnaEBruno();
  ana.enviar({ tipo: "sinal", para: "x".repeat(22), dados: {} });
  ana.enviar({ tipo: "sinal", para: bruno.entrou.voce, dados: { candidato: {} } });
  assert.equal((await bruno.proxima()).tipo, "sinal");
  ana.fechar();
  bruno.fechar();
});

test("sinal para alguém de outra sala não é entregue", async () => {
  const { ana, bruno } = await salaComAnaEBruno();
  const outra = await criarSala();
  const carla = await entrarNaSala(outra.id, "Carla", outra.chave);
  await carla.esperarTipo("participantes");

  ana.enviar({ tipo: "sinal", para: carla.entrou.voce, dados: {} });
  ana.enviar({ tipo: "sinal", para: bruno.entrou.voce, dados: { marca: 1 } });
  assert.deepEqual((await bruno.proxima()).dados, { marca: 1 });

  carla.enviar({ tipo: "sinal", para: "x".repeat(22), dados: { marca: 2 } });
  carla.fechar();
  await carla.fechada;
  // Se Carla tivesse recebido o sinal da Ana, a fila dela não estaria vazia.
  assert.equal(await Promise.race([carla.proxima(), esperar(50, "nada")]), "nada");
  ana.fechar();
  bruno.fechar();
});

test("sinal antes de entrar devolve mensagem-invalida", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "sinal", para: "x".repeat(22), dados: {} });
  assert.equal((await cliente.proxima()).codigo, "mensagem-invalida");
  await cliente.fechada;
});

for (const [descricao, campos] of [
  ["para não texto", { para: 1, dados: {} }],
  ["dados ausentes", { para: "x" }],
  ["dados nulos", { para: "x", dados: null }],
  ["dados em lista", { para: "x", dados: [] }],
  ["dados texto", { para: "x", dados: "oi" }],
]) {
  test(`sinal com ${descricao} devolve mensagem-invalida`, async () => {
    const { id } = await criarSala();
    const cliente = await entrarNaSala(id, "Ana");
    cliente.enviar({ tipo: "sinal", ...campos });
    assert.equal((await cliente.esperarTipo("erro")).codigo, "mensagem-invalida");
    await cliente.fechada;
  });
}

// ---------- Estado do microfone (T03) ----------

const microfoneDaAna = (lista) => lista.find((p) => p.nome === "Ana").microfone;

test("ligar e desligar o microfone atualiza a lista de todos", async () => {
  const { id, ana, bruno } = await salaComAnaEBruno();

  ana.enviar({ tipo: "microfone", ligado: true });
  await ana.esperarLista((l) => microfoneDaAna(l) === true);
  await bruno.esperarLista((l) => microfoneDaAna(l) === true);

  // Quem entra depois já recebe o estado atual.
  const carla = await entrarNaSala(id, "Carla");
  const listaDaCarla = await carla.esperarLista((l) => l.length === 3);
  assert.equal(microfoneDaAna(listaDaCarla), true);
  assert.equal(listaDaCarla[2].microfone, false);

  ana.enviar({ tipo: "microfone", ligado: false });
  await bruno.esperarLista((l) => microfoneDaAna(l) === false);
  for (const cliente of [ana, bruno, carla]) cliente.fechar();
});

test("reconectar com a mesma chave volta com o microfone desligado", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrarNaSala(id, "Ana", chave);
  antiga.enviar({ tipo: "microfone", ligado: true });
  await antiga.esperarLista((l) => l[0].microfone === true);

  const nova = await entrarNaSala(id, "Ana", chave);
  const { lista } = await nova.esperarTipo("participantes");
  assert.equal(lista[0].microfone, false);
  nova.fechar();
});

test("microfone antes de entrar devolve mensagem-invalida", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "microfone", ligado: true });
  assert.equal((await cliente.proxima()).codigo, "mensagem-invalida");
  await cliente.fechada;
});

for (const ligado of ["sim", 1, null, undefined]) {
  test(`microfone com ligado = ${JSON.stringify(ligado)} devolve mensagem-invalida`, async () => {
    const { id } = await criarSala();
    const cliente = await entrarNaSala(id, "Ana");
    cliente.enviar({ tipo: "microfone", ligado });
    assert.equal((await cliente.esperarTipo("erro")).codigo, "mensagem-invalida");
    await cliente.fechada;
  });
}

// ---------- Estado da câmera (T04) ----------

const daAna = (lista) => lista.find((p) => p.nome === "Ana");

test("ligar e desligar a câmera atualiza a lista de todos", async () => {
  const { id, ana, bruno } = await salaComAnaEBruno();

  ana.enviar({ tipo: "camera", ligada: true });
  await ana.esperarLista((l) => daAna(l).camera === true);
  await bruno.esperarLista((l) => daAna(l).camera === true);

  // Quem entra depois já recebe o estado atual.
  const carla = await entrarNaSala(id, "Carla");
  const listaDaCarla = await carla.esperarLista((l) => l.length === 3);
  assert.equal(daAna(listaDaCarla).camera, true);
  assert.equal(listaDaCarla[2].camera, false);

  ana.enviar({ tipo: "camera", ligada: false });
  await bruno.esperarLista((l) => daAna(l).camera === false);
  await carla.esperarLista((l) => daAna(l).camera === false);
  for (const cliente of [ana, bruno, carla]) cliente.fechar();
});

test("reconectar com a mesma chave volta com a câmera desligada", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrarNaSala(id, "Ana", chave);
  antiga.enviar({ tipo: "camera", ligada: true });
  await antiga.esperarLista((l) => l[0].camera === true);

  const nova = await entrarNaSala(id, "Ana", chave);
  const { lista } = await nova.esperarTipo("participantes");
  assert.equal(lista[0].camera, false);
  nova.fechar();
});

test("camera antes de entrar devolve mensagem-invalida", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "camera", ligada: true });
  assert.equal((await cliente.proxima()).codigo, "mensagem-invalida");
  await cliente.fechada;
});

for (const ligada of ["sim", 1, null, undefined]) {
  test(`camera com ligada = ${JSON.stringify(ligada)} devolve mensagem-invalida`, async () => {
    const { id } = await criarSala();
    const cliente = await entrarNaSala(id, "Ana");
    cliente.enviar({ tipo: "camera", ligada });
    assert.equal((await cliente.esperarTipo("erro")).codigo, "mensagem-invalida");
    await cliente.fechada;
  });
}

test("câmera e microfone mudam de forma independente na lista", async () => {
  const { ana, bruno } = await salaComAnaEBruno();
  const estado = (l) => [daAna(l).camera, daAna(l).microfone];

  ana.enviar({ tipo: "camera", ligada: true });
  assert.deepEqual(estado(await bruno.esperarLista((l) => daAna(l).camera)), [true, false]);

  ana.enviar({ tipo: "microfone", ligado: true });
  assert.deepEqual(estado(await bruno.esperarLista((l) => daAna(l).microfone)), [true, true]);

  ana.enviar({ tipo: "camera", ligada: false });
  assert.deepEqual(estado(await bruno.esperarLista((l) => !daAna(l).camera)), [false, true]);
  ana.fechar();
  bruno.fechar();
});

// ---------- Compartilhamento de tela (T05) ----------

const dePessoa = (lista, nome) => lista.find((p) => p.nome === nome);

test("compartilhar e assistir atualizam a lista de todos", async () => {
  const { id, ana, bruno } = await salaComAnaEBruno();

  ana.enviar({ tipo: "tela", compartilhando: true, som: false });
  const listaAna = await bruno.esperarLista((l) => dePessoa(l, "Ana").tela !== null);
  const telaAna = dePessoa(listaAna, "Ana").tela;
  assert.equal(telaAna.som, false);

  bruno.enviar({ tipo: "tela", compartilhando: true, som: true });
  const listaBruno = await ana.esperarLista((l) => dePessoa(l, "Bruno").tela !== null);
  assert.ok(dePessoa(listaBruno, "Bruno").tela.inicio > telaAna.inicio);

  bruno.enviar({ tipo: "assistindo", id: ana.entrou.voce });
  await ana.esperarLista((l) => dePessoa(l, "Bruno").assistindo === ana.entrou.voce);

  // Quem entra depois recebe os dois estados.
  const carla = await entrarNaSala(id, "Carla");
  const listaCarla = await carla.esperarLista((l) => l.length === 3);
  assert.deepEqual(dePessoa(listaCarla, "Ana").tela, telaAna);
  assert.equal(dePessoa(listaCarla, "Bruno").assistindo, ana.entrou.voce);

  ana.enviar({ tipo: "tela", compartilhando: false });
  await carla.esperarLista((l) => dePessoa(l, "Ana").tela === null);
  bruno.enviar({ tipo: "assistindo", id: null });
  await carla.esperarLista((l) => dePessoa(l, "Bruno").assistindo === null);
  for (const cliente of [ana, bruno, carla]) cliente.fechar();
});

test("reconectar com a mesma chave para o compartilhamento", async () => {
  const { id, chave } = await criarSala();
  const antiga = await entrarNaSala(id, "Ana", chave);
  antiga.enviar({ tipo: "tela", compartilhando: true, som: true });
  antiga.enviar({ tipo: "assistindo", id: "x" });
  await antiga.esperarLista((l) => l[0].tela !== null && l[0].assistindo === "x");

  const nova = await entrarNaSala(id, "Ana", chave);
  const { lista } = await nova.esperarTipo("participantes");
  assert.equal(lista[0].tela, null);
  assert.equal(lista[0].assistindo, null);
  nova.fechar();
});

for (const tipo of ["tela", "assistindo"]) {
  test(`${tipo} antes de entrar devolve mensagem-invalida`, async () => {
    const cliente = await conectar();
    cliente.enviar({ tipo, compartilhando: false, id: null });
    assert.equal((await cliente.proxima()).codigo, "mensagem-invalida");
    await cliente.fechada;
  });
}

for (const [descricao, mensagem] of [
  ["compartilhando não booleano", { tipo: "tela", compartilhando: "sim" }],
  ["som ausente ao compartilhar", { tipo: "tela", compartilhando: true }],
  ["som não booleano", { tipo: "tela", compartilhando: true, som: 1 }],
  ["assistindo com id número", { tipo: "assistindo", id: 1 }],
  ["assistindo com id objeto", { tipo: "assistindo", id: {} }],
  ["assistindo sem id", { tipo: "assistindo" }],
]) {
  test(`${descricao} devolve mensagem-invalida`, async () => {
    const { id } = await criarSala();
    const cliente = await entrarNaSala(id, "Ana");
    cliente.enviar(mensagem);
    assert.equal((await cliente.esperarTipo("erro")).codigo, "mensagem-invalida");
    await cliente.fechada;
  });
}

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

// ---------- Recados sobre o compartilhamento (T07) ----------

// Ana compartilhando, Bruno assistindo; listas de participantes já consumidas.
async function salaComAnaCompartilhando() {
  const sala = await salaComAnaEBruno();
  sala.ana.enviar({ tipo: "tela", compartilhando: true, som: false });
  await sala.ana.esperarLista((l) => dePessoa(l, "Ana").tela !== null);
  await sala.bruno.esperarLista((l) => dePessoa(l, "Ana").tela !== null);
  sala.escrever = (dados = {}) =>
    sala.bruno.enviar({
      tipo: "recado",
      acao: "escrever",
      alvo: sala.ana.entrou.voce,
      x: 0.5,
      y: 0.5,
      texto: "oi",
      ...dados,
    });
  return sala;
}

const esperarRecados = (cliente) => cliente.esperarTipo("recados").then(({ lista }) => lista);
const semId = (lista) => lista.map(({ id, ...resto }) => resto);

test("recado escrito chega a todos da sala, ao vivo, e fechar/apagar atualizam a lista", async () => {
  const { ana, bruno, escrever } = await salaComAnaCompartilhando();
  escrever();
  const esperado = {
    autor: bruno.entrou.voce,
    nome: "Bruno",
    alvo: ana.entrou.voce,
    x: 0.5,
    y: 0.5,
    texto: "oi",
    aberto: true,
  };
  assert.deepEqual(semId(await esperarRecados(ana)), [esperado]);
  const [recado] = await esperarRecados(bruno);
  assert.match(recado.id, /^[A-Za-z0-9_-]{22}$/);

  bruno.enviar({ tipo: "recado", acao: "fechar" });
  assert.deepEqual(semId(await esperarRecados(ana)), [{ ...esperado, aberto: false }]);

  escrever({ texto: "outro" });
  await esperarRecados(ana);
  bruno.enviar({ tipo: "recado", acao: "apagar" });
  assert.deepEqual(semId(await esperarRecados(ana)), [{ ...esperado, aberto: false }]);
  ana.fechar();
  bruno.fechar();
});

test("quem entra depois recebe os recados ativos logo após entrou", async () => {
  const { id, ana, bruno, escrever } = await salaComAnaCompartilhando();
  escrever();
  await esperarRecados(ana);
  const carla = await entrarNaSala(id, "Carla");
  assert.equal(carla.entrou.tipo, "entrou");
  assert.deepEqual(
    (await esperarRecados(carla)).map(({ texto }) => texto),
    ["oi"],
  );
  for (const cliente of [ana, bruno, carla]) cliente.fechar();
});

test("o recado some sozinho depois do prazo", async () => {
  const { ana, bruno, escrever } = await salaComAnaCompartilhando();
  escrever();
  assert.equal((await esperarRecados(ana)).length, 1);
  assert.deepEqual(await esperarRecados(ana), []);
  ana.fechar();
  bruno.fechar();
});

test("quando a tela para de ser compartilhada, os recados somem", async () => {
  const { ana, bruno, escrever } = await salaComAnaCompartilhando();
  escrever();
  await esperarRecados(bruno);
  ana.enviar({ tipo: "tela", compartilhando: false });
  assert.deepEqual(await esperarRecados(bruno), []);
  ana.fechar();
  bruno.fechar();
});

test("recado com formato errado é recusado com mensagem-invalida", async () => {
  const formatos = [
    { tipo: "recado", acao: "xyz" },
    { tipo: "recado", acao: "escrever", alvo: "a", x: 0, y: 0, texto: 5 },
    { tipo: "recado", acao: "escrever", alvo: "a", x: "0", y: 0, texto: "oi" },
    { tipo: "recado", acao: "escrever", alvo: null, x: 0, y: 0, texto: "oi" },
  ];
  for (const mensagem of formatos) {
    const { ana, bruno } = await salaComAnaCompartilhando();
    bruno.enviar(mensagem);
    assert.deepEqual(await bruno.esperarTipo("erro"), {
      tipo: "erro",
      codigo: "mensagem-invalida",
    });
    await bruno.fechada;
    ana.fechar();
  }
});

test("recado antes de entrar é recusado", async () => {
  const cliente = await conectar();
  cliente.enviar({ tipo: "recado", acao: "fechar" });
  assert.deepEqual(await cliente.proxima(), { tipo: "erro", codigo: "mensagem-invalida" });
  await cliente.fechada;
});

test("recado sobre quem não compartilha é ignorado e a conexão continua", async () => {
  const { ana, bruno, escrever } = await salaComAnaCompartilhando();
  escrever({ alvo: bruno.entrou.voce });
  escrever({ texto: "valido" });
  assert.deepEqual(
    (await esperarRecados(ana)).map(({ texto }) => texto),
    ["valido"],
  );
  ana.fechar();
  bruno.fechar();
});

test("recado acima de 100 caracteres é ignorado; 100 emojis cabem; o texto não é alterado", async () => {
  const { ana, bruno, escrever } = await salaComAnaCompartilhando();
  escrever({ texto: "x".repeat(101) });
  escrever({ texto: "👍".repeat(100) });
  assert.deepEqual(
    (await esperarRecados(ana)).map(({ texto }) => texto),
    ["👍".repeat(100)],
  );
  escrever({ texto: "<b>oi</b>" });
  assert.deepEqual(
    (await esperarRecados(ana)).map(({ texto }) => texto),
    ["<b>oi</b>"],
  );
  escrever({ texto: "a\nb" });
  assert.deepEqual(
    (await esperarRecados(ana)).map(({ texto }) => texto),
    ["a b"],
  );
  ana.fechar();
  bruno.fechar();
});
