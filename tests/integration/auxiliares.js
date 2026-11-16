import { criarServidor } from "../../src/servidor.js";

// Sobe o servidor numa porta livre e devolve as URLs para os testes.
export async function subirServidor(opcoes) {
  const servidor = criarServidor(opcoes);
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
