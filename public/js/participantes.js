import { TEXTOS } from "./textos.js";

// Monta o texto de cada item da lista de participantes ("Ana (você) · anfitrião") e a descrição
// do microfone usada no indicador ao lado do nome.
export function rotularParticipantes(lista, idVoce) {
  return lista.map(({ id, nome, anfitriao, microfone }) => {
    const ehVoce = id === idVoce;
    const texto =
      nome + (ehVoce ? TEXTOS.marcaVoce : "") + (anfitriao ? TEXTOS.marcaAnfitriao : "");
    const microfoneLigado = microfone === true;
    return {
      id,
      texto,
      ehVoce,
      ehAnfitriao: anfitriao,
      microfoneLigado,
      rotuloMicrofone: microfoneLigado ? TEXTOS.microfoneLigado : TEXTOS.microfoneDesligado,
    };
  });
}

export function souAnfitriao(lista, idVoce) {
  return lista.some(({ id, anfitriao }) => id === idVoce && anfitriao);
}
