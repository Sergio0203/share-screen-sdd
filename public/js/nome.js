// Regra do nome de exibição, usada pelo navegador e pelo servidor (FR-002).

export const NOME_MAXIMO = 30;

// Devolve o nome sem espaços nas pontas, ou null se for inválido.
export function normalizarNome(texto) {
  return motivoNomeInvalido(texto) === null ? texto.trim() : null;
}

// Devolve null se o nome é válido, "vazio" ou "longo" caso contrário.
export function motivoNomeInvalido(texto) {
  if (typeof texto !== "string" || texto.trim() === "") return "vazio";
  // [...texto] conta caracteres reais: um emoji conta como 1, não como 2.
  if ([...texto.trim()].length > NOME_MAXIMO) return "longo";
  return null;
}
