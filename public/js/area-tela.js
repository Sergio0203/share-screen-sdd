import { TEXTOS } from "./textos.js";
import { retomarVideos } from "./video.js";

// Área da tela compartilhada, acima das câmeras: o compartilhamento em destaque (com tela cheia),
// as miniaturas dos demais e, para quem está compartilhando, o aviso "Você está compartilhando sua
// tela". Ver specs/005-compartilhar-tela/contracts/ui.md e research.md §7.
// `aoEscolher(id)` é chamado quando a pessoa clica numa miniatura.
export function criarAreaTela({ aoEscolher }) {
  const elemento = criarElemento("section", { id: "area-tela", hidden: true });
  const aviso = criarElemento("p", {
    className: "aviso-compartilhando",
    textContent: TEXTOS.vocEstaCompartilhando,
  });
  const destaque = criarElemento("div", { className: "destaque" });
  const legenda = criarElemento("p", { className: "legenda-tela" });
  const botaoTelaCheia = criarElemento("button", {
    className: "botao-tela-cheia",
    textContent: TEXTOS.telaCheia,
  });
  const miniaturas = criarElemento("div", { className: "miniaturas" });
  let idEmDestaque = null;

  // Tela cheia no contêiner (não só no vídeo), para manter a legenda; Esc é tratado pelo navegador.
  botaoTelaCheia.addEventListener("click", () => destaque.requestFullscreen().catch(() => {}));
  document.addEventListener("fullscreenchange", () => {
    botaoTelaCheia.hidden = document.fullscreenElement === destaque;
  });

  // `estado`: resultado de escolherDestaque + se a própria pessoa está compartilhando.
  // `telaDe(id)` devolve o <video> recebido; `idsComFalha`: pessoas cuja conexão falhou.
  function atualizar({ destaque: item, miniaturas: outros, compartilhando }, opcoes) {
    // O destaque mudou ou acabou: sair da tela cheia em vez de mostrar outra tela nela (FR-008).
    if (item?.id !== idEmDestaque && document.fullscreenElement === destaque) {
      document.exitFullscreen().catch(() => {});
    }
    idEmDestaque = item?.id ?? null;

    const partes = [];
    let videoMostrado = null;
    if (compartilhando) partes.push(aviso);
    if (item) {
      legenda.textContent = rotulo(item);
      const conteudo = conteudoDoDestaque(item, opcoes);
      if (conteudo.tagName === "VIDEO") videoMostrado = conteudo;
      const filhos = [conteudo, legenda];
      if (document.fullscreenEnabled) filhos.push(botaoTelaCheia);
      destaque.replaceChildren(...filhos);
      partes.push(destaque);
    }
    if (outros.length > 0) {
      miniaturas.replaceChildren(...outros.map((outro) => criarMiniatura(outro, aoEscolher)));
      partes.push(miniaturas);
    }

    elemento.replaceChildren(...partes);
    elemento.hidden = partes.length === 0;
    // Parar e compartilhar de novo (ou trocar o destaque e voltar): o mesmo <video> volta à página
    // pausado pelo navegador e ficaria congelado na última imagem.
    retomarVideos(videoMostrado);
  }

  return { elemento, atualizar };
}

function rotulo({ nome, som }) {
  return nome + (som ? "" : TEXTOS.marcaSemSom);
}

// O <video> vem do módulo de mídia e é reaproveitado entre atualizações, para não piscar.
function conteudoDoDestaque({ id, nome }, { telaDe, idsComFalha }) {
  const falhou = new Set(idsComFalha).has(id);
  const video = telaDe(id).video;
  if (!falhou && video) return video;
  return criarElemento("p", {
    className: "falha-video",
    textContent: falhou ? TEXTOS.naoFoiPossivelMostrarTela(nome) : "",
  });
}

// Miniatura só com ícone e nome: a imagem só chega para o compartilhamento em destaque (FR-017).
function criarMiniatura(item, aoEscolher) {
  const botao = criarElemento("button", {
    className: "miniatura",
    textContent: `🖥️ ${rotulo(item)}`,
    title: TEXTOS.verTelaDe(item.nome),
  });
  botao.setAttribute("aria-label", TEXTOS.verTelaDe(item.nome));
  botao.addEventListener("click", () => aoEscolher(item.id));
  return botao;
}

function criarElemento(tag, propriedades = {}, filhos = []) {
  const elemento = document.createElement(tag);
  Object.assign(elemento, propriedades);
  elemento.append(...filhos);
  return elemento;
}
