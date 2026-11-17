// Regras puras da conversa por voz (sem DOM nem WebRTC), usadas por voz.js.
// Ver specs/003-conversar-por-voz/data-model.md e research.md §4.

// Em cada par, só quem tem o id menor cria a oferta: assim os dois lados nunca ofertam ao mesmo
// tempo, sem precisar de negociação extra.
export function devoIniciar(meuId, outroId) {
  return meuId < outroId;
}

// Traduz o nome do erro de captura do navegador no tipo de mensagem a mostrar (research.md §6).
export function classificarErroMicrofone(nomeDoErro) {
  if (nomeDoErro === "NotAllowedError" || nomeDoErro === "SecurityError") return "permissao";
  if (nomeDoErro === "NotFoundError" || nomeDoErro === "OverconstrainedError") {
    return "semMicrofone";
  }
  return "falha";
}

// Compara as conexões de voz existentes com a lista de participantes recebida.
// `criar`: pessoas novas com quem eu devo iniciar a conexão.
// `fechar`: conexões de quem saiu da sala (ou recarregou e ganhou id novo).
export function compararPares(idsComPar, lista, meuId) {
  const comPar = new Set(idsComPar);
  const naLista = new Set(lista.map(({ id }) => id));

  const criar = [...naLista].filter(
    (id) => id !== meuId && !comPar.has(id) && devoIniciar(meuId, id),
  );
  const fechar = [...comPar].filter((id) => !naLista.has(id));
  return { criar, fechar };
}
