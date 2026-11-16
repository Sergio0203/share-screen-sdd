// Todos os textos visíveis da interface, em pt-BR (ver specs/002-entrar-sala-link/contracts/ui.md).
export const TEXTOS = {
  // Página inicial e tela de nome
  seuNome: "Seu nome",
  criarSala: "Criar sala",
  criandoSala: "Criando sala…",
  erroCriar: "Não foi possível criar a sala. Verifique sua conexão e tente novamente.",
  nomeVazio: "Digite seu nome para continuar.",
  nomeLongo: "O nome pode ter no máximo 30 caracteres.",
  tituloEntrar: "Entrar na sala",
  entrarNaSala: "Entrar na sala",

  // Sala
  tituloSala: "Sua sala",
  voceEAnfitriao: "Você é o anfitrião desta sala",
  rotuloLink: "Link da sala",
  copiarLink: "Copiar link",
  linkCopiado: "Link copiado!",
  erroCopiar: "Não foi possível copiar o link. Selecione o link acima e copie manualmente.",
  tituloLista: (quantidade) => `Na sala (${quantidade} de 6)`,
  marcaVoce: " (você)",
  marcaAnfitriao: " · anfitrião",

  // Telas de erro
  salaInexistente: "Esta sala não existe ou já foi encerrada.",
  criarNovaSala: "Criar nova sala",
  salaCheiaTitulo: "Sala cheia",
  salaCheiaTexto: "Esta sala já tem 6 pessoas. Tente de novo quando alguém sair.",
  tentarDeNovo: "Tentar de novo",
  abertaEmOutraAba: "Esta sala foi aberta em outra aba.",
  erroVerificarSala: "Não foi possível abrir a sala. Verifique sua conexão e tente novamente.",
  conexaoPerdida: "Você perdeu a conexão com a sala. Recarregue a página para tentar de novo.",
};
