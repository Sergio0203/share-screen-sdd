// Regras puras de erros de captura (sem DOM nem WebRTC), usadas por app.js.

// Traduz o nome do erro de captura (microfone ou câmera) no tipo de mensagem a mostrar
// (specs/003-conversar-por-voz/research.md §6 e specs/004-ativar-webcam/research.md §7).
export function classificarErroCaptura(nomeDoErro) {
  if (nomeDoErro === "NotAllowedError" || nomeDoErro === "SecurityError") return "permissao";
  if (nomeDoErro === "NotFoundError" || nomeDoErro === "OverconstrainedError") {
    return "semDispositivo";
  }
  return "falha";
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
