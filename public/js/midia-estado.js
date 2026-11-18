// Regras puras da mídia pelo servidor (sem DOM nem LiveKit), usadas por midia.js.
// Ver specs/010-midia-por-servidor/data-model.md e research.md §6, §9.

// Nome de cada mídia no LiveKit ("fonte"), na ordem em que é publicada.
export const FONTES = {
  microfone: "microphone",
  camera: "camera",
  tela: "screen_share",
  somTela: "screen_share_audio",
};

const FONTES_DA_TELA = new Set([FONTES.tela, FONTES.somTela]);

// Vozes e câmeras de todos chegam sempre; da tela, só a de quem está no próprio destaque, para a
// internet de quem assiste receber uma tela só (T05 FR-019).
export function assinaturasDesejadas(publicacoes, assistindo) {
  return publicacoes.map((publicacao) => ({
    ...publicacao,
    assinar: !FONTES_DA_TELA.has(publicacao.fonte) || publicacao.identidade === assistindo,
  }));
}

// Ao (re)conectar, volta a transmitir o que continua capturado; o que a pessoa desligou (trilha
// parada) fica de fora (clarificação Q4).
export function trilhasParaPublicar(trilhas) {
  return Object.entries(FONTES)
    .map(([nome, fonte]) => ({ fonte, trilha: trilhas[nome] }))
    .filter(({ trilha }) => trilha?.readyState === "live");
}

// Estados da conexão com o servidor de mídia e o que faz cada um mudar (data-model.md "Conexão de
// mídia"). Evento sem transição mantém o estado; `sair` encerra de vez.
const TRANSICOES = {
  conectando: { conectou: "conectada", falhou: "indisponivel" },
  conectada: { reconectando: "reconectando", desconectou: "indisponivel" },
  reconectando: {
    reconectou: "conectada",
    passaram3s: "indisponivel",
    desconectou: "indisponivel",
  },
  indisponivel: { tentar: "conectando" },
  encerrada: {},
};

export function proximoEstadoMidia(estado, evento) {
  if (estado === "encerrada") return estado;
  if (evento === "sair") return "encerrada";
  return TRANSICOES[estado]?.[evento] ?? estado;
}

// Microfone, câmera e tela só ligam com a mídia conectada; desligar vale sempre (FR-007).
export function podeLigar(estado) {
  return estado === "conectada";
}
