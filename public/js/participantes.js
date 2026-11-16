import { TEXTOS } from "./textos.js";

// Monta o texto de cada item da lista de participantes ("Ana (você) · anfitrião").
export function rotularParticipantes(lista, idVoce) {
  return lista.map(({ id, nome, anfitriao }) => {
    const ehVoce = id === idVoce;
    const texto =
      nome + (ehVoce ? TEXTOS.marcaVoce : "") + (anfitriao ? TEXTOS.marcaAnfitriao : "");
    return { id, texto, ehVoce, ehAnfitriao: anfitriao };
  });
}

export function souAnfitriao(lista, idVoce) {
  return lista.some(({ id, anfitriao }) => id === idVoce && anfitriao);
}
