// Decide qual compartilhamento de tela fica em destaque para cada pessoa e quais viram miniaturas
// (ver specs/005-compartilhar-tela/data-model.md e FR-017/FR-018 da spec).
// `escolha` é o id que a pessoa escolheu clicando numa miniatura, ou null.
export function escolherDestaque(lista, idVoce, escolha) {
  // A própria tela nunca aparece para quem compartilha (FR-004).
  const compartilhamentos = lista
    .filter(({ id, tela }) => tela !== null && tela !== undefined && id !== idVoce)
    .map(({ id, nome, tela }) => ({ id, nome, som: tela.som, inicio: tela.inicio }))
    .sort((a, b) => b.inicio - a.inicio);

  const escolhido = compartilhamentos.find(({ id }) => id === escolha);
  // Sem escolha válida, o mais recente (maior `inicio`) vai para o destaque.
  const destaque = escolhido ?? compartilhamentos[0] ?? null;
  const miniaturas = compartilhamentos.filter((item) => item !== destaque);
  return { destaque, miniaturas };
}
