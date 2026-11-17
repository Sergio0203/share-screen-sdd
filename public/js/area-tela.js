import { TEXTOS } from "./textos.js";
import { criarIcone } from "./icones.js";
import { retomarVideos } from "./video.js";
import { acaoDaTecla, ehCampoDeTexto } from "./atalho-recado.js";
import { INTERVALO_POSICAO_MS, devoEnviarPosicao } from "./movimento-recado.js";
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
// T08: o campo segue o ponteiro e fica aberto enquanto o próprio recado existe (Enter e clicar fora
// não o fecham); fecha quando o recado some da lista ou com Esc. Os recados dos outros deslizam até
// cada posição e somem com fade. Ver specs/008-recado-segue-cursor/contracts/ui.md e research.md
// §2–§5.
// `aoEscolher(id)` é chamado quando a pessoa clica numa miniatura. `aoEscreverRecado(dados)` devolve
// false se não foi possível enviar; `aoApagarRecado()` avisa o Esc; `aoMoverRecado({ x, y })` leva a
// posição do cursor de quem escreve.
export function criarAreaTela({ aoEscolher, aoEscreverRecado, aoApagarRecado, aoMoverRecado }) {
  const elemento = criarElemento("section", { id: "area-tela", hidden: true });
  const aviso = criarElemento("p", { className: "aviso-compartilhando" }, [
    criarIcone("monitor"),
    criarElemento("span", { textContent: TEXTOS.vocEstaCompartilhando }),
  ]);
  const textoQualidade = criarElemento("p", { className: "qualidade-ativa" });
  const destaque = criarElemento("div", { className: "destaque" });
  const legenda = criarElemento("p", { className: "legenda-tela" });
  // T09: só ícone; o nome fica no `aria-label`, que também é a dica.
  const botaoTelaCheia = criarElemento("button", { className: "controle botao-tela-cheia" }, [
    criarIcone("tela-cheia"),
  ]);
  botaoTelaCheia.setAttribute("aria-label", TEXTOS.telaCheia);
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
  // Id → elemento desenhado: reaproveitar o elemento mantém as transições de movimento e de fade.
  const elementosRecados = new Map();
  let idVoce = null;
  // Campo aberto: { alvo, x, y, caixa, entrada, contador, enviou, confirmado, prazo, ultimoEnvio,
  // ultimoEnviado, envioPendente } ou null. `x`/`y` seguem o ponteiro sobre a imagem (T08).
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
    seguirPonteiro();
  });
  destaque.addEventListener("pointerleave", () => (ultimoPonteiro = null));
  // Com o campo aberto, clicar na imagem não tira o foco dele (T08 FR-007). É no `mousedown` que o
  // navegador move o foco; o `click` (botão "Tela cheia") continua funcionando.
  destaque.addEventListener("mousedown", (evento) => {
    if (campo !== null && !campo.caixa.contains(evento.target)) evento.preventDefault();
  });
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
    const meuRecado = lista.find((r) => r.autor === idVoce) ?? null;
    if (campo?.enviou && meuRecado !== null) campo.confirmado = true;
    // O servidor tirou o recado (fim do prazo, ou o compartilhamento acabou): o campo fecha.
    if (campo?.confirmado && meuRecado === null) fecharCampo("descartar");
    // O próprio campo some aos poucos junto com o recado e volta com uma tecla (T08 contracts/ui.md).
    campo?.caixa.classList.toggle("apagando", meuRecado?.apagando ?? false);
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
        r.alvo === idEmDestaque && r.texto.trim() !== "" && !(campo !== null && r.autor === idVoce),
    );
    const idsVisiveis = new Set(visiveis.map((r) => r.id));
    for (const [id, elementoRecado] of elementosRecados) {
      if (idsVisiveis.has(id)) continue;
      elementoRecado.remove();
      elementosRecados.delete(id);
    }
    const novos = new Set();
    const elementos = visiveis.map((recado) => {
      let elementoRecado = elementosRecados.get(recado.id);
      if (elementoRecado === undefined) {
        elementoRecado = criarRecado(recado);
        elementosRecados.set(recado.id, elementoRecado);
        novos.add(elementoRecado);
      } else {
        atualizarTextoRecado(elementoRecado, recado);
      }
      elementoRecado.classList.toggle("apagando", recado.apagando);
      return elementoRecado;
    });
    // A ordem da lista é a de desenho: o último fica por cima.
    substituirFilhosSeMudou(grupoRecados, elementos);
    // Posicionar depois de inseridos: a largura e a altura de cada caixa só existem na página.
    // Um recado que acabou de aparecer nasce no lugar, sem deslizar a partir do canto.
    visiveis.forEach((recado, indice) => {
      const elementoRecado = elementos[indice];
      if (novos.has(elementoRecado)) {
        semTransicao(elementoRecado, () => posicionar(elementoRecado, recado, area));
      } else {
        posicionar(elementoRecado, recado, area);
      }
    });
    if (campo !== null) posicionar(campo.caixa, campo, area);
  }

  // O canto da caixa fica no ponto; se passar da borda, a caixa é empurrada para dentro (FR-007).
  function posicionar(caixa, { x, y }, area) {
    const { esquerda, topo } = pixelNaArea(area, x, y);
    const encaixada = encaixarNaArea(
      { esquerda, topo, largura: caixa.offsetWidth, altura: caixa.offsetHeight },
      area,
    );
    // `transform` (e não left/top) para que a transição de movimento do CSS funcione (T08 research §2).
    caixa.style.transform = `translate(${encaixada.esquerda}px, ${encaixada.topo}px)`;
  }

  // O campo acompanha o ponteiro na hora; fora da imagem fica no último ponto (T08 FR-001/FR-004).
  function seguirPonteiro() {
    if (campo === null || campo.alvo !== idEmDestaque) return;
    const ponto = pontoSobAImagem();
    if (ponto === null) return;
    campo.x = ponto.x;
    campo.y = ponto.y;
    const area = areaAtual();
    if (area !== null) posicionar(campo.caixa, campo, area);
    enviarPosicao();
  }

  // Envia a posição atual no máximo a cada 50 ms; o último ponto de uma sequência nunca se perde,
  // porque um envio fica agendado para o fim do intervalo (research §1).
  function enviarPosicao() {
    if (campo === null || !campo.enviou) return;
    const ponto = { x: campo.x, y: campo.y };
    const agora = performance.now();
    if (devoEnviarPosicao(agora, campo.ultimoEnvio, ponto, campo.ultimoEnviado)) {
      clearTimeout(campo.envioPendente);
      campo.envioPendente = null;
      campo.ultimoEnvio = agora;
      campo.ultimoEnviado = ponto;
      aoMoverRecado(ponto);
      return;
    }
    const mesmoPonto =
      campo.ultimoEnviado !== null &&
      ponto.x === campo.ultimoEnviado.x &&
      ponto.y === campo.ultimoEnviado.y;
    if (mesmoPonto || campo.envioPendente !== null) return;
    const espera = Math.max(0, INTERVALO_POSICAO_MS - (agora - campo.ultimoEnvio));
    campo.envioPendente = setTimeout(() => {
      if (campo === null) return;
      campo.envioPendente = null;
      enviarPosicao();
    }, espera);
  }

  function aoApertarTecla(evento) {
    // A sala foi fechada (ex.: a pessoa saiu): este ouvinte não vale mais.
    if (!elemento.isConnected) {
      document.removeEventListener("keydown", aoApertarTecla);
      return;
    }
    const ponto = pontoSobAImagem();
    const acao = acaoDaTecla(evento, {
      alvoEhCampoDeTexto: ehCampoDeTexto(evento.target),
      campoAberto: campo !== null,
      temDestaque: idEmDestaque !== null,
      pontoNaImagem: ponto,
    });
    if (acao === "abrir") {
      evento.preventDefault();
      abrirCampo(ponto);
    } else if (acao === "voltarAoCampo") {
      // Sem preventDefault: com o foco de volta no campo antes de a tecla ser inserida, o navegador
      // a escreve no recado, no fim do texto (T08 research §5).
      const fim = campo.entrada.value.length;
      campo.entrada.focus();
      campo.entrada.setSelectionRange(fim, fim);
    } else if (acao === "apagar") {
      evento.preventDefault();
      fecharCampo("apagar");
    }
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
      ultimoEnvio: null,
      ultimoEnviado: null,
      envioPendente: null,
    };
    campo.prazo = setTimeout(() => fecharCampo("descartar"), PRAZO_CAMPO_VAZIO_MS);

    entrada.addEventListener("beforeinput", bloquearAcimaDoLimite);
    entrada.addEventListener("input", aoMudarTexto);
    entrada.addEventListener("keydown", (evento) => {
      // T08: Enter não faz nada; o campo fica aberto enquanto o recado aparece.
      if (evento.key === "Enter") {
        evento.preventDefault();
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        fecharCampo("apagar");
      }
    });
    // T08: clicar fora ou trocar de aba não fecha o campo (research §5).

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
    if (!campo.enviou) {
      // O primeiro `escrever` cria o recado no ponto atual: conta como a primeira posição enviada.
      campo.ultimoEnvio = performance.now();
      campo.ultimoEnviado = { x: campo.x, y: campo.y };
    }
    campo.enviou = true;
    desenharRecados();
  }

  // `acao`: "apagar" (Esc, sair da tela cheia, trocar o destaque) ou "descartar" (sem avisar o
  // servidor: o recado já sumiu ou não pôde ser enviado).
  function fecharCampo(acao) {
    if (campo === null) return;
    const fechado = campo;
    campo = null;
    clearTimeout(fechado.prazo);
    clearTimeout(fechado.envioPendente);
    fechado.caixa.remove();
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

function atualizarTextoRecado(elementoRecado, { texto }) {
  const span = elementoRecado.querySelector(".texto-recado");
  if (span.textContent !== texto.trim()) span.textContent = texto.trim();
}

// Aplica uma mudança de estilo sem animar: a transição volta a valer só depois do próximo cálculo.
function semTransicao(elemento, mudar) {
  elemento.style.transition = "none";
  mudar();
  void elemento.offsetWidth;
  elemento.style.transition = "";
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
  const botao = criarElemento(
    "button",
    { className: "miniatura", title: TEXTOS.verTelaDe(item.nome) },
    [criarIcone("monitor"), criarElemento("span", { textContent: rotulo(item) })],
  );
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
