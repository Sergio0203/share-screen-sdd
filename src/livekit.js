import { criarPermissaoAdministracao } from "./permissao-midia.js";

// Configuração do servidor de mídia (LiveKit) e chamadas do app a ele
// (specs/010-midia-por-servidor/research.md §1, §4 e contracts/livekit.md).

// Valores do `livekit-server --dev`: sem variáveis de ambiente, o app funciona com ele localmente.
const PADROES_DESENVOLVIMENTO = {
  url: "ws://localhost:7880",
  urlApi: "http://localhost:7880",
  chave: "devkey",
  segredo: "secret",
};

export function lerConfiguracaoLivekit(env = process.env) {
  return {
    url: env.LIVEKIT_URL || PADROES_DESENVOLVIMENTO.url,
    urlApi: env.LIVEKIT_API_URL || PADROES_DESENVOLVIMENTO.urlApi,
    chave: env.LIVEKIT_API_KEY || PADROES_DESENVOLVIMENTO.chave,
    segredo: env.LIVEKIT_API_SECRET || PADROES_DESENVOLVIMENTO.segredo,
  };
}

// Tira uma pessoa da sala no servidor de mídia: quem saiu do app para de receber e enviar mídia
// (FR-006). "Não encontrado" é normal (a pessoa nem tinha conectado a mídia); outras falhas só vão
// para o log: nunca atrapalham a sala.
export async function removerDaMidia(configuracao, idSala, idPublico) {
  const { urlApi, chave, segredo } = configuracao;
  // Sem API configurada (servidor de testes), não há a quem avisar.
  if (!urlApi) return;
  const token = criarPermissaoAdministracao({ chave, segredo, idSala });
  try {
    const resposta = await fetch(`${urlApi}/twirp/livekit.RoomService/RemoveParticipant`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ room: idSala, identity: idPublico }),
    });
    if (!resposta.ok && resposta.status !== 404) {
      console.error(`Servidor de mídia recusou tirar alguém da sala (HTTP ${resposta.status}).`);
    }
  } catch (erro) {
    console.error("Servidor de mídia indisponível ao tirar alguém da sala:", erro.message);
  }
}
