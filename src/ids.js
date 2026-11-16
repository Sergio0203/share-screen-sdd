import crypto from "node:crypto";

const FORMATO_SEGREDO = /^[A-Za-z0-9_-]{22}$/;

// 128 bits aleatórios em base64url (22 caracteres). Usado para ids de sala e tokens de anfitrião.
export function gerarSegredo() {
  return crypto.randomBytes(16).toString("base64url");
}

export function idValido(texto) {
  return typeof texto === "string" && FORMATO_SEGREDO.test(texto);
}

// Comparação em tempo constante, para não revelar o token pelo tempo de resposta.
export function segredosIguais(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
