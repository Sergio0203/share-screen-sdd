// Decide qual compartilhamento de tela fica em destaque para cada pessoa e quais viram miniaturas
// (ver specs/005-compartilhar-tela/data-model.md e FR-017/FR-018 da spec).
// T07 altera a FR-004 da T05: a própria tela entra como as outras (marcada com `propria`), para que
// quem compartilha possa apontar recados sobre ela.
// `escolha` é o id que a pessoa escolheu clicando numa miniatura, ou null.
export function escolherDestaque(lista, idVoce, escolha) {
  const compartilhamentos = lista
    .filter(({ tela }) => tela !== null && tela !== undefined)
    .map(({ id, nome, tela }) => ({
      id,
      nome,
      som: tela.som,
      inicio: tela.inicio,
      propria: id === idVoce,
    }))
    .sort((a, b) => b.inicio - a.inicio);

  const escolhido = compartilhamentos.find(({ id }) => id === escolha);
  // Sem escolha válida, o mais recente (maior `inicio`) vai para o destaque.
  const destaque = escolhido ?? compartilhamentos[0] ?? null;
  const miniaturas = compartilhamentos.filter((item) => item !== destaque);
  return { destaque, miniaturas };
}
