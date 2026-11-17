// Regras do texto dos recados, usadas pelo navegador e pelo servidor (T07, FR-004/FR-005).
// Ver specs/007-recado-na-tela/data-model.md e research.md §6.

export const RECADO_MAXIMO = 100;

// Grafemas: o que a pessoa vê como um símbolo (um emoji composto, como 👨‍👩‍👧, conta 1).
const segmentador = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

function grafemas(texto) {
  return Array.from(segmentador.segment(texto), ({ segment }) => segment);
}

export function contarCaracteres(texto) {
  return grafemas(texto).length;
}

// O recado é de uma linha só: quebras de linha (ex.: ao colar) viram espaços.
export function normalizarTextoRecado(texto) {
  return texto.replace(/\r\n|\r|\n/g, " ");
}

export function cortarTextoRecado(texto) {
  return grafemas(normalizarTextoRecado(texto)).slice(0, RECADO_MAXIMO).join("");
}

// Vazio é válido: o campo pode ficar vazio enquanto está aberto (só não é desenhado).
export function textoRecadoValido(texto) {
  if (typeof texto !== "string") return false;
  return contarCaracteres(normalizarTextoRecado(texto)) <= RECADO_MAXIMO;
}

// Como o campo ficaria se `inserido` substituísse a seleção `inicio`–`fim`.
export function textoDepoisDaInsercao(atual, inicio, fim, inserido) {
  return atual.slice(0, inicio) + inserido + atual.slice(fim);
}

// A parte de `inserido` que cabe no limite, considerando a seleção que será substituída.
export function caberNoLimite(atual, inicio, fim, inserido) {
  const restante = atual.slice(0, inicio) + atual.slice(fim);
  const vagas = Math.max(0, RECADO_MAXIMO - contarCaracteres(restante));
  return grafemas(normalizarTextoRecado(inserido)).slice(0, vagas).join("");
}
