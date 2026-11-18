import WebSocket from "ws";
import { criarServidor } from "../../src/servidor.js";

// Sobe o servidor numa porta livre e devolve as URLs para os testes.
// Por padrão, sem servidor de mídia de verdade: os testes não dependem de um LiveKit rodando.
const LIVEKIT_DE_TESTE = {
  url: "ws://midia.teste",
  urlApi: null,
  chave: "chave-teste",
  segredo: "segredo-de-teste-com-mais-de-32-caracteres",
};

export async function subirServidor(opcoes) {
  const servidor = criarServidor({ livekit: LIVEKIT_DE_TESTE, ...opcoes });
  await new Promise((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  const { port } = servidor.address();

  return {
    url: `http://127.0.0.1:${port}`,
    urlWs: `ws://127.0.0.1:${port}/ws`,
    fechar: () =>
      new Promise((resolver) => {
        servidor.closeAllConnections();
        servidor.close(resolver);
      }),
  };
}

// Abre uma conexão WebSocket e enfileira as mensagens recebidas. As permissões de mídia (`midia`,
// T10) ficam à parte em `midias`: chegam junto com outras mensagens e não mudam os testes de T02–T08.
export async function conectarCliente(urlWs, opcoesWs = {}) {
  const ws = new WebSocket(urlWs, opcoesWs);
  const midias = [];
  const aoChegarMidia = [];
  const fila = [];
  const aguardando = [];
  ws.on("message", (dados) => {
    const mensagem = JSON.parse(dados.toString());
    if (mensagem.tipo === "midia") {
      midias.push(mensagem);
      aoChegarMidia.splice(0).forEach((resolver) => resolver());
      return;
    }
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
    midias,
    // Espera até haver `quantidade` permissões de mídia recebidas.
    async esperarMidias(quantidade) {
      while (midias.length < quantidade) {
        await new Promise((resolver) => aoChegarMidia.push(resolver));
      }
      return midias[quantidade - 1];
    },
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
