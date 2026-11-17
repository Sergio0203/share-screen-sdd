import { TEXTOS } from "./textos.js";

// Qualidades do compartilhamento de tela e as regras para aplicá-las
// (ver specs/006-qualidade-compartilhamento/data-model.md e research.md §1, §2, §5).
// `taxaMaxima` (bits/s) evita que o teto padrão do navegador derrube 1080p a 60 fps.
export const QUALIDADES = [
  {
    id: "720p30",
    nome: "720p · 30 fps",
    largura: 1280,
    altura: 720,
    qps: 30,
    taxaMaxima: 2_500_000,
  },
  {
    id: "1080p30",
    nome: "1080p · 30 fps",
    largura: 1920,
    altura: 1080,
    qps: 30,
    taxaMaxima: 4_000_000,
  },
  {
    id: "1080p60",
    nome: "1080p · 60 fps",
    largura: 1920,
    altura: 1080,
    qps: 60,
    taxaMaxima: 6_000_000,
  },
];

export const QUALIDADE_PADRAO = "1080p30";

// Valor guardado desconhecido (ou nenhum) cai na qualidade padrão.
export function qualidadePorId(id) {
  return (
    QUALIDADES.find((qualidade) => qualidade.id === id) ??
    QUALIDADES.find((qualidade) => qualidade.id === QUALIDADE_PADRAO)
  );
}

// Só máximos: a captura reduz telas maiores mantendo a proporção e nunca aumenta as menores.
export function restricoesDeCaptura({ largura, altura, qps }) {
  return {
    width: { max: largura },
    height: { max: altura },
    frameRate: { ideal: qps, max: qps },
  };
}

// Parâmetros do envio da tela. Com pouca banda, reduz a resolução e mantém os quadros por segundo
// (clarificação da spec). Sem `encodings` (conexão ainda negociando), não há o que limitar.
export function parametrosDeEnvio(parametrosAtuais, { qps, taxaMaxima }) {
  const encodings = (parametrosAtuais.encodings ?? []).map((encoding, posicao) =>
    posicao === 0
      ? { ...encoding, maxFramerate: qps, maxBitrate: taxaMaxima, scaleResolutionDownBy: 1 }
      : { ...encoding },
  );
  return { ...parametrosAtuais, degradationPreference: "maintain-framerate", encodings };
}

// Texto para quem compartilha. "Limitada" só quando a tela é menor nos dois sentidos: numa tela
// maior, a redução mantém a proporção e pelo menos um lado bate no máximo (ex.: ultrawide).
export function descreverQualidadeAtiva(qualidade, { largura, altura }) {
  const limitada = largura < qualidade.largura && altura < qualidade.altura;
  if (!limitada) return TEXTOS.qualidadeAtiva(qualidade.nome);
  return (
    TEXTOS.qualidadeAtiva(`${largura}×${altura} · ${qualidade.qps} fps`) + TEXTOS.limitadaPelaTela
  );
}
