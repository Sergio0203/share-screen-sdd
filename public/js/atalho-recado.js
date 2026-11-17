// Quando a tecla `/` abre o campo de recado (T07, FR-001/FR-002, research §5).
// O navegador só entrega teclas à aba em foco, então "a aba do Telão está em foco" já é garantido.

const TIPOS_DE_INPUT_SEM_TEXTO = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

// Elementos onde `/` deve ser escrito normalmente (ex.: o campo de nome).
export function ehCampoDeTexto(elemento) {
  if (!elemento) return false;
  if (elemento.isContentEditable) return true;
  if (elemento.tagName === "TEXTAREA" || elemento.tagName === "SELECT") return true;
  if (elemento.tagName === "INPUT") return !TIPOS_DE_INPUT_SEM_TEXTO.has(elemento.type);
  return false;
}

// `estado`: { alvoEhCampoDeTexto, temDestaque, pontoNaImagem } — o ponto é o do último ponteiro
// sobre a imagem em destaque, ou null se ele está fora dela.
// `key` (e não `code`) respeita o layout do teclado: no ABNT2, `/` fica em outra tecla.
export function deveAbrirCampo(evento, { alvoEhCampoDeTexto, temDestaque, pontoNaImagem }) {
  if (evento.key !== "/") return false;
  if (evento.ctrlKey || evento.altKey || evento.metaKey || evento.repeat) return false;
  return !alvoEhCampoDeTexto && temDestaque && pontoNaImagem !== null;
}
