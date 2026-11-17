import { TEXTOS } from "./textos.js";
import { retomarVideos } from "./video.js";

// Monta os quadros das câmeras (ver specs/004-ativar-webcam/contracts/ui.md). Os elementos <video>
// vêm do módulo de mídia (`previa()` e `videoDe(id)`) e são reaproveitados entre as atualizações
// da lista, para o vídeo não piscar nem reiniciar.
export function mostrarQuadros(area, quadros, { previa, videoDe }) {
  const videos = [];
  area.replaceChildren(
    ...quadros.map(({ id, nome, rotulo, ehVoce, falhou }) => {
      const video = ehVoce ? previa() : videoDe(id);
      if (video) video.classList.toggle("espelhado", ehVoce);
      let conteudo = video;
      if (falhou || !video) {
        conteudo = criarElemento("p", {
          className: "falha-video",
          textContent: falhou ? TEXTOS.naoFoiPossivelMostrarVideo(nome) : "",
        });
      } else {
        videos.push(video);
      }
      const legenda = criarElemento("figcaption", { textContent: rotulo, title: rotulo });
      return criarElemento("figure", { className: "quadro" }, [conteudo, legenda]);
    }),
  );
  area.hidden = quadros.length === 0;
  // Câmera desligada e ligada de novo: o mesmo <video> volta pausado pelo navegador.
  retomarVideos(...videos);
}

function criarElemento(tag, propriedades = {}, filhos = []) {
  const elemento = document.createElement(tag);
  Object.assign(elemento, propriedades);
  elemento.append(...filhos);
  return elemento;
}
