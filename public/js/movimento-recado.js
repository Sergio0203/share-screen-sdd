// Quando enviar a posição do cursor de quem escreve (T08, FR-003, research §1).
// No máximo uma posição a cada 50 ms, e só se o ponto mudou: o bastante para o recado deslizar sem
// saltos nos outros navegadores (com a transição de 100 ms do CSS), sem inundar a sala.

export const INTERVALO_POSICAO_MS = 50;

// `agora`/`ultimoEnvio` em ms (`ultimoEnvio` null = nunca enviou); pontos são { x, y } ou null.
export function devoEnviarPosicao(agora, ultimoEnvio, ponto, ultimoEnviado) {
  const mesmoPonto =
    ultimoEnviado !== null && ponto.x === ultimoEnviado.x && ponto.y === ultimoEnviado.y;
  if (mesmoPonto) return false;
  return ultimoEnvio === null || agora - ultimoEnvio >= INTERVALO_POSICAO_MS;
}
