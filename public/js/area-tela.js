import { TEXTOS } from "./textos.js";
import { retomarVideos } from "./video.js";
import { deveAbrirCampo, ehCampoDeTexto } from "./atalho-recado.js";
import { areaDaImagem, encaixarNaArea, pixelNaArea, pontoNaImagem } from "./posicao-recado.js";
import {
  RECADO_MAXIMO,
  caberNoLimite,
  contarCaracteres,
  cortarTextoRecado,
  normalizarTextoRecado,
  textoDepoisDaInsercao,
} from "./recados.js";

// Campo que nunca chegou a enviar nada fecha sozinho depois desse tempo, como um recado vazio (T07).
const PRAZO_CAMPO_VAZIO_MS = 8000;

// Tipos de `beforeinput` que acrescentam texto ao campo (os demais apagam ou movem o cursor).
const INSERCOES_DIGITADAS = new Set(["insertText", "insertReplacementText"]);
const INSERCOES_COLADAS = new Set(["insertFromPaste", "insertFromDrop"]);

// Área da tela compartilhada, acima das câmeras: o compartilhamento em destaque (com tela cheia),
// as miniaturas dos demais e, para quem está compartilhando, o aviso "Você está compartilhando sua
// tela". Ver specs/005-compartilhar-tela/contracts/ui.md e research.md §7.
// Recados (T07): camada sobre a imagem em destaque e campo aberto com `/`. Ver
// specs/007-recado-na-tela/contracts/ui.md e research.md §3–§7.
// `aoEscolher(id)` é chamado quando a pessoa clica numa miniatura. `aoEscreverRecado(dados)` devolve
// false se não foi possível enviar; `aoFecharRecado()`/`aoApagarRecado()` avisam Enter/Esc.
export function criarAreaTela({ aoEscolher, aoEscreverRecado, aoFecharRecado, aoApagarRecado }) {
  const elemento = criarElemento("section", { id: "area-tela", hidden: true });
  const aviso = criarElemento("p", {
    className: "aviso-compartilhando",
    textContent: TEXTOS.vocEstaCompartilhando,
  });
  const textoQualidade = criarElemento("p", { className: "qualidade-ativa" });
  const destaque = criarElemento("div", { className: "destaque" });
  const legenda = criarElemento("p", { className: "legenda-tela" });
  const botaoTelaCheia = criarElemento("button", {
    className: "botao-tela-cheia",
    textContent: TEXTOS.telaCheia,
  });
  const miniaturas = criarElemento("div", { className: "miniaturas" });
  // Camada sobre a área real da imagem: os recados ficam num grupo próprio para que redesenhá-los
  // não tire o campo (com o foco) do lugar.
  const camada = criarElemento("div", { className: "camada-recados" });
  const grupoRecados = criarElemento("div", { className: "grupo-recados" });
  camada.append(grupoRecados);
  const dica = criarElemento("p", { className: "dica-recado", textContent: TEXTOS.dicaRecado });
  // Sem mouse/trackpad (ex.: celular) não há como apertar `/` sobre a imagem.
  const temPonteiroFino = globalThis.matchMedia?.("(pointer: fine)").matches ?? false;

  let idEmDestaque = null;
  let videoAtual = null;
  let ultimoPonteiro = null;
  let recadosAtuais = [];
  let idVoce = null;
  // Campo aberto: { alvo, x, y, caixa, entrada, contador, enviou, confirmado, prazo } ou null.
  let campo = null;

  // Tela cheia no contêiner (não só no vídeo), para manter a legenda e os recados; Esc é tratado
  // pelo navegador.
  botaoTelaCheia.addEventListener("click", () => destaque.requestFullscreen().catch(() => {}));
  document.addEventListener("fullscreenchange", () => {
    botaoTelaCheia.hidden = document.fullscreenElement === destaque;
    // Em tela cheia, o Esc pode sair da tela cheia sem chegar à página: vale como Esc (research §7).
    if (document.fullscreenElement === null && campo !== null) fecharCampo("apagar");
    desenharRecados();
  });

  destaque.addEventListener("pointermove", (evento) => {
    ultimoPonteiro = { x: evento.clientX, y: evento.clientY };
  });
  destaque.addEventListener("pointerleave", () => (ultimoPonteiro = null));
  document.addEventListener("keydown", aoApertarTecla);
  // O tamanho da imagem na tela muda com a janela, a tela cheia e a resolução recebida (FR-007).
  new ResizeObserver(() => desenharRecados()).observe(destaque);

  // `estado`: resultado de escolherDestaque + se a própria pessoa está compartilhando e, nesse caso,
  // o texto da qualidade ativa (T06).
  // `telaDe(id)` devolve o <video> recebido; `idsComFalha`: pessoas cuja conexão falhou.
  function atualizar({ destaque: item, miniaturas: outros, compartilhando, qualidade }, opcoes) {
    // O destaque mudou ou acabou: sair da tela cheia em vez de mostrar outra tela nela (FR-008).
    if (item?.id !== idEmDestaque && document.fullscreenElement === destaque) {
      document.exitFullscreen().catch(() => {});
    }
    // O recado pertence ao compartilhamento em que foi escrito: trocar o destaque o apaga.
    if (item?.id !== idEmDestaque && campo !== null) fecharCampo("apagar");
    idEmDestaque = item?.id ?? null;

    const partes = [];
    let videoMostrado = null;
    if (compartilhando) partes.push(aviso);
    if (compartilhando && qualidade) {
      textoQualidade.textContent = qualidade;
      partes.push(textoQualidade);
    }
    if (item) {
      legenda.textContent = rotulo(item);
      const conteudo = conteudoDoDestaque(item, opcoes);
      if (conteudo.tagName === "VIDEO") videoMostrado = conteudo;
      const filhos = [conteudo, camada, legenda];
      if (temPonteiroFino && videoMostrado) filhos.push(dica);
      if (document.fullscreenEnabled) filhos.push(botaoTelaCheia);
      substituirFilhosSeMudou(destaque, filhos);
      partes.push(destaque);
    }
    if (outros.length > 0) {
      miniaturas.replaceChildren(...outros.map((outro) => criarMiniatura(outro, aoEscolher)));
      partes.push(miniaturas);
    }

    substituirFilhosSeMudou(elemento, partes);
    elemento.hidden = partes.length === 0;
    trocarVideoObservado(videoMostrado);
    // Parar e compartilhar de novo (ou trocar o destaque e voltar): o mesmo <video> volta à página
    // pausado pelo navegador e ficaria congelado na última imagem.
    retomarVideos(videoMostrado);
    desenharRecados();
  }

  // A resolução recebida pode mudar (T06) e as dimensões só chegam depois dos metadados.
  function trocarVideoObservado(video) {
    if (video === videoAtual) return;
    videoAtual?.removeEventListener("resize", desenharRecados);
    videoAtual?.removeEventListener("loadedmetadata", desenharRecados);
    videoAtual = video;
    videoAtual?.addEventListener("resize", desenharRecados);
    videoAtual?.addEventListener("loadedmetadata", desenharRecados);
  }

  // ---------- Recados ----------

  // `lista`: a última mensagem `recados` do servidor; `id`: o próprio id público.
  function mostrarRecados(lista, id) {
    recadosAtuais = lista;
    idVoce = id;
    const meuAberto = lista.some((r) => r.autor === idVoce && r.aberto);
    if (campo?.enviou && meuAberto) campo.confirmado = true;
    // O servidor tirou o recado (8 s sem digitar, ou o compartilhamento acabou): o campo fecha.
    if (campo?.confirmado && !meuAberto) fecharCampo("descartar");
    desenharRecados();
  }

  // Área da imagem em pixels, relativa ao contêiner do destaque, ou null se não há imagem.
  function areaAtual() {
    if (!videoAtual || !destaque.isConnected) return null;
    const caixaDestaque = destaque.getBoundingClientRect();
    const caixaVideo = videoAtual.getBoundingClientRect();
    return areaDaImagem(
      {
        left: caixaVideo.left - caixaDestaque.left,
        top: caixaVideo.top - caixaDestaque.top,
        width: caixaVideo.width,
        height: caixaVideo.height,
      },
      videoAtual.videoWidth,
      videoAtual.videoHeight,
    );
  }

  function desenharRecados() {
    const area = areaAtual();
    camada.hidden = area === null;
    if (area === null) return;
    Object.assign(camada.style, {
      left: `${area.left}px`,
      top: `${area.top}px`,
      width: `${area.width}px`,
      height: `${area.height}px`,
    });

    // Enquanto o campo está aberto, o próprio texto aparece nele, não repetido como recado.
    const visiveis = recadosAtuais.filter(
      (r) =>
        r.alvo === idEmDestaque &&
        r.texto.trim() !== "" &&
        !(campo !== null && r.autor === idVoce && r.aberto),
    );
    grupoRecados.replaceChildren(...visiveis.map(criarRecado));
    // Posicionar depois de inseridos: a largura e a altura de cada caixa só existem na página.
    visiveis.forEach((recado, indice) => posicionar(grupoRecados.children[indice], recado, area));
    if (campo !== null) posicionar(campo.caixa, campo, area);
  }

  // O canto da caixa fica no ponto; se passar da borda, a caixa é empurrada para dentro (FR-007).
  function posicionar(caixa, { x, y }, area) {
    const { esquerda, topo } = pixelNaArea(area, x, y);
    const encaixada = encaixarNaArea(
      { esquerda, topo, largura: caixa.offsetWidth, altura: caixa.offsetHeight },
      area,
    );
    caixa.style.left = `${encaixada.esquerda}px`;
    caixa.style.top = `${encaixada.topo}px`;
  }

  function aoApertarTecla(evento) {
    // A sala foi fechada (ex.: a pessoa saiu): este ouvinte não vale mais.
    if (!elemento.isConnected) {
      document.removeEventListener("keydown", aoApertarTecla);
      return;
    }
    const ponto = pontoSobAImagem();
    const abrir = deveAbrirCampo(evento, {
      alvoEhCampoDeTexto: ehCampoDeTexto(evento.target),
      temDestaque: idEmDestaque !== null && campo === null,
      pontoNaImagem: ponto,
    });
    if (!abrir) return;
    evento.preventDefault();
    abrirCampo(ponto);
  }

  function pontoSobAImagem() {
    if (!ultimoPonteiro || !videoAtual) return null;
    const caixa = videoAtual.getBoundingClientRect();
    return pontoNaImagem(
      caixa,
      videoAtual.videoWidth,
      videoAtual.videoHeight,
      ultimoPonteiro.x,
      ultimoPonteiro.y,
    );
  }

  function abrirCampo({ x, y }) {
    const entrada = criarElemento("input", {
      type: "text",
      className: "campo-recado",
      autocomplete: "off",
      spellcheck: false,
    });
    entrada.setAttribute("aria-label", TEXTOS.rotuloCampoRecado);
    const contador = criarElemento("span", {
      className: "contador-recado",
      textContent: TEXTOS.caracteresRestantes(RECADO_MAXIMO),
    });
    const caixa = criarElemento("div", { className: "caixa-campo-recado" }, [entrada, contador]);
    campo = {
      alvo: idEmDestaque,
      x,
      y,
      caixa,
      entrada,
      contador,
      enviou: false,
      confirmado: false,
    };
    campo.prazo = setTimeout(() => fecharCampo("descartar"), PRAZO_CAMPO_VAZIO_MS);

    entrada.addEventListener("beforeinput", bloquearAcimaDoLimite);
    entrada.addEventListener("input", aoMudarTexto);
    entrada.addEventListener("keydown", (evento) => {
      if (evento.key === "Enter") {
        evento.preventDefault();
        fecharCampo("fechar");
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        fecharCampo("apagar");
      }
    });
    // Clicar fora ou trocar de aba (ex.: voltar ao jogo): fecha como o Enter, o recado fica.
    entrada.addEventListener("blur", () => fecharCampo("fechar"));

    camada.append(caixa);
    desenharRecados();
    entrada.focus();
  }

  // O limite de 100 vale antes de o texto entrar: o 101º caractere nem aparece (research §6).
  function bloquearAcimaDoLimite(evento) {
    // Composição (acentos, IME) nem sempre pode ser cancelada: o corte no `input` cuida dela.
    if (evento.isComposing) return;
    const entrada = evento.target;
    const inicio = entrada.selectionStart ?? entrada.value.length;
    const fim = entrada.selectionEnd ?? inicio;
    if (evento.inputType === "insertLineBreak") {
      evento.preventDefault();
      return;
    }
    if (INSERCOES_COLADAS.has(evento.inputType)) {
      evento.preventDefault();
      const colado = evento.dataTransfer?.getData("text/plain") ?? evento.data ?? "";
      const parte = caberNoLimite(entrada.value, inicio, fim, colado);
      if (parte === "") return;
      entrada.setRangeText(parte, inicio, fim, "end");
      aoMudarTexto();
      return;
    }
    if (!INSERCOES_DIGITADAS.has(evento.inputType)) return;
    const depois = textoDepoisDaInsercao(entrada.value, inicio, fim, evento.data ?? "");
    if (contarCaracteres(normalizarTextoRecado(depois)) > RECADO_MAXIMO) evento.preventDefault();
  }

  function aoMudarTexto() {
    if (campo === null) return;
    const { entrada } = campo;
    // Salvaguarda: se algo passou do limite mesmo assim, corta mantendo o cursor.
    const cortado = cortarTextoRecado(entrada.value);
    if (cortado !== entrada.value) {
      const cursor = Math.min(entrada.selectionStart ?? cortado.length, cortado.length);
      entrada.value = cortado;
      entrada.setSelectionRange(cursor, cursor);
    }
    campo.contador.textContent = TEXTOS.caracteresRestantes(
      RECADO_MAXIMO - contarCaracteres(entrada.value),
    );
    const enviado = aoEscreverRecado({
      alvo: campo.alvo,
      x: campo.x,
      y: campo.y,
      texto: entrada.value,
    });
    if (enviado === false) {
      fecharCampo("descartar");
      return;
    }
    // Daqui em diante, o prazo de 8 s é controlado pelo servidor.
    clearTimeout(campo.prazo);
    campo.enviou = true;
    desenharRecados();
  }

  // `acao`: "fechar" (Enter, clicar fora), "apagar" (Esc) ou "descartar" (sem avisar o servidor).
  function fecharCampo(acao) {
    if (campo === null) return;
    const fechado = campo;
    // Anular antes de remover: tirar o campo da página dispara `blur`, que não deve agir de novo.
    campo = null;
    clearTimeout(fechado.prazo);
    fechado.caixa.remove();
    if (fechado.enviou && acao === "fechar") aoFecharRecado();
    if (fechado.enviou && acao === "apagar") aoApagarRecado();
    desenharRecados();
  }

  return { elemento, atualizar, mostrarRecados };
}

// Nome e texto sempre por `textContent`: qualquer marcação aparece literalmente (FR-008).
function criarRecado({ nome, texto }) {
  return criarElemento("div", { className: "recado" }, [
    criarElemento("strong", { className: "nome-recado", textContent: nome }),
    criarElemento("span", { className: "texto-recado", textContent: texto.trim() }),
  ]);
}

// Trocar os filhos tira e recoloca cada elemento na página, o que tira o foco do campo de recado:
// só troca quando algo mudou de fato.
function substituirFilhosSeMudou(pai, filhos) {
  const atuais = [...pai.children];
  const iguais = atuais.length === filhos.length && atuais.every((filho, i) => filho === filhos[i]);
  if (!iguais) pai.replaceChildren(...filhos);
}

function rotulo({ nome, som, propria }) {
  return nome + (propria ? TEXTOS.marcaVoceTela : "") + (som ? "" : TEXTOS.marcaSemSom);
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
