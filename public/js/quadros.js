import { TEXTOS } from "./textos.js";

// Decide quais quadros aparecem na grade de vídeos da sala. T09 FR-017 (altera FR-006/FR-008 da
// T04): todo participante tem quadro, na ordem da lista do servidor; com a câmera desligada, o
// quadro mostra um avatar com a inicial do nome em vez de sumir. A lista do servidor continua sendo
// a fonte de verdade: assim que ela chega com `camera: false`, a imagem dá lugar ao avatar.
export function quadrosDeVideo(lista, idVoce, idsComFalha) {
  const comFalha = new Set(idsComFalha);
  return lista.map(({ id, nome, camera }) => {
    const ehVoce = id === idVoce;
    const cameraLigada = camera === true;
    return {
      id,
      nome,
      rotulo: ehVoce ? nome + TEXTOS.marcaVoce : nome,
      ehVoce,
      cameraLigada,
      // Sem câmera não há vídeo para falhar: o avatar aparece normalmente.
      falhou: cameraLigada && !ehVoce && comFalha.has(id),
      inicial: inicialDoNome(nome),
    };
  });
}

const segmentador = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

// Primeiro caractere visível do nome, em maiúscula. Por grafema, para não partir emoji nem letra
// acentuada escrita em duas partes ("e" + acento).
export function inicialDoNome(nome) {
  const primeiro = segmentador.segment(nome).containing(0);
  return primeiro ? primeiro.segment.toLocaleUpperCase("pt-BR") : "?";
}
