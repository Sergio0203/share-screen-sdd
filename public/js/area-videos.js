import { TEXTOS } from "./textos.js";
import { retomarVideos } from "./video.js";
import { criarIcone } from "./icones.js";
import { animarEntrada, ordenarFilhos, removerComAnimacao } from "./entrada-saida.js";

// Quadros de cada área de vídeos, por id do participante: { figura, legenda, conteudo, chave }.
const quadrosPorArea = new WeakMap();

// Monta os quadros das câmeras (ver specs/004-ativar-webcam/contracts/ui.md e
// specs/009-melhorias-visuais/contracts/ui.md). Os elementos <video> vêm do módulo de mídia
// (`previa()` e `videoDe(id)`) e são reaproveitados entre as atualizações da lista, para o vídeo não
// piscar nem reiniciar. T09: todo participante tem quadro (avatar com a inicial quando a câmera
// está desligada) e os quadros são reaproveitados por id, para que só quem entra ou sai seja animado.
export function mostrarQuadros(area, quadros, { previa, videoDe }) {
  if (!quadrosPorArea.has(area)) quadrosPorArea.set(area, new Map());
  const porId = quadrosPorArea.get(area);
  const videos = [];
  const desejados = [];

  for (const quadro of quadros) {
    let registro = porId.get(quadro.id);
    if (!registro) {
      const legenda = criarElemento("figcaption");
      const figura = criarElemento("figure", { className: "quadro" }, [legenda]);
      registro = { figura, legenda, conteudo: null, chave: null };
      porId.set(quadro.id, registro);
      animarEntrada(figura);
    }
    registro.legenda.textContent = quadro.rotulo;
    registro.legenda.title = quadro.rotulo;

    const video = videoDoQuadro(quadro, { previa, videoDe });
    if (video) videos.push(video);
    trocarConteudo(registro, quadro, video);
    desejados.push(registro.figura);
  }

  const presentes = new Set(quadros.map(({ id }) => id));
  for (const [id, { figura }] of porId) {
    if (presentes.has(id)) continue;
    porId.delete(id);
    removerComAnimacao(figura);
  }
  ordenarFilhos(area, desejados);
  area.hidden = quadros.length === 0;
  // Câmera desligada e ligada de novo: o mesmo <video> volta pausado pelo navegador.
  retomarVideos(...videos);
}

// O vídeo só entra no quadro com a câmera ligada: ao desligar, o <video> reaproveitado sai do
// quadro (não fica só escondido), então nenhuma imagem antiga continua visível (FR-017).
function videoDoQuadro({ id, ehVoce, cameraLigada, falhou }, { previa, videoDe }) {
  if (!cameraLigada || falhou) return null;
  const video = ehVoce ? previa() : videoDe(id);
  if (video) video.classList.toggle("espelhado", ehVoce);
  return video;
}

// Vídeo, falha ou avatar. A chave evita recriar o mesmo conteúdo a cada atualização da lista; a
// troca (ex.: vídeo ↔ avatar) entra com fade (`trocando`).
function trocarConteudo(registro, { nome, falhou, inicial }, video) {
  const tipo = video ? "video" : falhou ? "falha" : "avatar";
  const chave = tipo === "avatar" ? `avatar:${inicial}` : tipo === "falha" ? `falha:${nome}` : null;
  if (tipo === "video" ? registro.conteudo === video : registro.chave === chave) return;

  let conteudo = video;
  if (tipo === "falha") {
    conteudo = criarElemento("p", { className: "falha-video" }, [
      criarIcone("alerta"),
      criarElemento("span", { textContent: TEXTOS.naoFoiPossivelMostrarVideo(nome) }),
    ]);
  } else if (tipo === "avatar") {
    // Decorativo: o nome já está na legenda do quadro.
    conteudo = criarElemento("div", { className: "avatar" }, [
      criarElemento("span", { className: "inicial", textContent: inicial }),
    ]);
    conteudo.setAttribute("aria-hidden", "true");
  }

  // Quadro novo já entra animado inteiro; só a troca num quadro existente ganha o fade próprio.
  const eraTroca = registro.conteudo !== null;
  registro.conteudo?.remove();
  registro.figura.prepend(conteudo);
  if (eraTroca) animarEntrada(conteudo, "trocando");
  registro.conteudo = conteudo;
  registro.chave = chave;
}

function criarElemento(tag, propriedades = {}, filhos = []) {
  const elemento = document.createElement(tag);
  Object.assign(elemento, propriedades);
  elemento.append(...filhos);
  return elemento;
}
