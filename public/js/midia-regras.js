// Regras puras de voz e vídeo (sem DOM nem WebRTC), usadas por midia.js.
// Ver specs/003-conversar-por-voz/data-model.md e research.md §4.

// Em cada par, só quem tem o id menor cria a oferta: assim os dois lados nunca ofertam ao mesmo
// tempo, sem precisar de negociação extra.
export function devoIniciar(meuId, outroId) {
  return meuId < outroId;
}

// Traduz o nome do erro de captura (microfone ou câmera) no tipo de mensagem a mostrar
// (specs/003-conversar-por-voz/research.md §6 e specs/004-ativar-webcam/research.md §7).
export function classificarErroCaptura(nomeDoErro) {
  if (nomeDoErro === "NotAllowedError" || nomeDoErro === "SecurityError") return "permissao";
  if (nomeDoErro === "NotFoundError" || nomeDoErro === "OverconstrainedError") {
    return "semDispositivo";
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

// Erros ao começar a compartilhar a tela (specs/005-compartilhar-tela/research.md §6). Os
// navegadores usam NotAllowedError tanto para "cancelou a escolha" quanto para "negado"; só a
// negação pelo sistema (ex.: macOS sem "Gravação de Tela") cita o sistema na mensagem e precisa
// de instrução. O resto é tratado como cancelamento, que não mostra erro (FR-011).
export function classificarErroCompartilhamento(nomeDoErro, mensagem = "") {
  if (nomeDoErro === "NotAllowedError") {
    return /system/i.test(mensagem ?? "") ? "permissao" : "cancelado";
  }
  if (nomeDoErro === "AbortError") return "cancelado";
  return "falha";
}
