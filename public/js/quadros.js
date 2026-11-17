import { TEXTOS } from "./textos.js";

// Decide quais quadros de vídeo aparecem na sala (ver specs/004-ativar-webcam/data-model.md).
// Só quem está com a câmera ligada tem quadro; a lista do servidor é a fonte de verdade, por isso o
// quadro some para todos assim que a pessoa desliga a câmera (FR-006).
export function quadrosDeVideo(lista, idVoce, idsComFalha) {
  const comFalha = new Set(idsComFalha);
  return lista
    .filter(({ camera }) => camera === true)
    .map(({ id, nome }) => {
      const ehVoce = id === idVoce;
      return {
        id,
        nome,
        rotulo: ehVoce ? nome + TEXTOS.marcaVoce : nome,
        ehVoce,
        falhou: !ehVoce && comFalha.has(id),
      };
    });
}
