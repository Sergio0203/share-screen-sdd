// Conversão entre a posição do ponteiro na tela e o ponto da imagem compartilhada (T07, FR-007).
// O ponto é guardado como fração (0–1) da área onde a imagem aparece de fato, descontando as faixas
// vazias de `object-fit: contain`; assim é o mesmo para todos, em qualquer tamanho de janela.
// Ver specs/007-recado-na-tela/research.md §3. Caixas: { left, top, width, height } em pixels.

// Retângulo (em pixels, nas mesmas coordenadas de `caixa`) onde a imagem do vídeo aparece.
export function areaDaImagem(caixa, larguraVideo, alturaVideo) {
  if (!(larguraVideo > 0 && alturaVideo > 0)) return null;
  const escala = Math.min(caixa.width / larguraVideo, caixa.height / alturaVideo);
  const width = larguraVideo * escala;
  const height = alturaVideo * escala;
  return {
    left: caixa.left + (caixa.width - width) / 2,
    top: caixa.top + (caixa.height - height) / 2,
    width,
    height,
  };
}

// Fração da imagem sob o ponteiro, ou null se o ponteiro está fora da imagem.
export function pontoNaImagem(caixa, larguraVideo, alturaVideo, clienteX, clienteY) {
  const area = areaDaImagem(caixa, larguraVideo, alturaVideo);
  if (area === null) return null;
  const x = (clienteX - area.left) / area.width;
  const y = (clienteY - area.top) / area.height;
  if (!dentroComFolga(x) || !dentroComFolga(y)) return null;
  return { x: limitar(x), y: limitar(y) };
}

// A borda exata da imagem conta como dentro, apesar dos arredondamentos de ponto flutuante.
const FOLGA = 1e-9;
const dentroComFolga = (fracao) => fracao >= -FOLGA && fracao <= 1 + FOLGA;
const limitar = (fracao) => Math.min(1, Math.max(0, fracao));

// Posição em pixels, relativa ao canto da área da imagem, de um ponto (x, y) da imagem.
export function pixelNaArea(area, x, y) {
  return { esquerda: x * area.width, topo: y * area.height };
}

// Empurra uma caixa (relativa à área) para que fique inteira dentro da área, sem sair pela esquerda
// ou por cima mesmo se for maior que ela.
export function encaixarNaArea({ esquerda, topo, largura, altura }, area) {
  return {
    esquerda: Math.max(0, Math.min(esquerda, area.width - largura)),
    topo: Math.max(0, Math.min(topo, area.height - altura)),
  };
}
