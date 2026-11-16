// Lógica de cópia do link para a área de transferência (ver specs/001-criar-sala/research.md §5).
// As dependências do navegador são injetáveis para permitir testes sem navegador.

// Deve ser chamada SINCRONAMENTE dentro do handler do clique: os navegadores só permitem escrever
// na área de transferência durante o gesto do usuário. Com ClipboardItem, a escrita começa já,
// recebendo o link como promessa que resolve quando o servidor responder.
// Devolve Promise<boolean>: true se copiou; false se bloqueado ou indisponível. Nunca rejeita.
export async function copiarAoCriar(
  promessaLink,
  { clipboard = globalThis.navigator?.clipboard, ClipboardItemCls = globalThis.ClipboardItem } = {},
) {
  try {
    if (!clipboard) return false;
    if (ClipboardItemCls && clipboard.write) {
      const promessaBlob = promessaLink.then((link) => new Blob([link], { type: "text/plain" }));
      await clipboard.write([new ClipboardItemCls({ "text/plain": promessaBlob })]);
      return true;
    }
    if (!clipboard.writeText) return false;
    await clipboard.writeText(await promessaLink);
    return true;
  } catch {
    return false;
  }
}

// Cópia acionada pelo botão "Copiar link". Devolve Promise<boolean>; nunca rejeita.
export async function copiarLink(link, { clipboard = globalThis.navigator?.clipboard } = {}) {
  try {
    if (!clipboard?.writeText) return false;
    await clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}
