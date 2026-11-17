// Animações de entrada e saída de elementos reaproveitados por id: quadros de vídeo e itens da lista
// de participantes (T09 research §5). Os elementos que continuam na tela não são recriados, então a
// animação de entrada roda uma vez só, quando a pessoa aparece.

// Tempo de segurança: se a animação não rodar (ex.: área escondida), o elemento sai mesmo assim.
const SEGURANCA_SAIDA_MS = 400;

export function animarEntrada(elemento, classe = "entrando") {
  elemento.classList.add(classe);
  elemento.addEventListener("animationend", function aoTerminar(evento) {
    // Animações dos filhos (ex.: ícone girando) também chegam aqui: só a do próprio elemento conta.
    if (evento.target !== elemento) return;
    elemento.classList.remove(classe);
    elemento.removeEventListener("animationend", aoTerminar);
  });
}

export function removerComAnimacao(elemento) {
  if (elemento.classList.contains("saindo")) return;
  elemento.classList.add("saindo");
  const remover = () => elemento.remove();
  elemento.addEventListener("animationend", (evento) => {
    if (evento.target === elemento) remover();
  });
  setTimeout(remover, SEGURANCA_SAIDA_MS);
}

// Deixa os filhos de `conteiner` na ordem de `desejados`, mexendo no mínimo: mover um <video> no
// documento o pausa, então elementos já na ordem certa ficam onde estão e os novos entram no fim.
// Elementos `saindo` ficam onde estão até terminar a animação.
export function ordenarFilhos(conteiner, desejados) {
  const atuais = [...conteiner.children].filter((filho) => !filho.classList.contains("saindo"));
  const ordemMantida = atuais.every((filho, indice) => filho === desejados[indice]);
  conteiner.append(...(ordemMantida ? desejados.slice(atuais.length) : desejados));
}

// Reinicia a animação de entrada de uma tela cujo conteúdo acabou de ser trocado.
export function reiniciarAnimacao(elemento, classe = "aparecendo") {
  elemento.classList.remove(classe);
  void elemento.offsetWidth; // força o navegador a notar a remoção antes de adicionar de novo
  elemento.classList.add(classe);
}
