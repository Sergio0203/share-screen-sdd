// Todos os textos visíveis da interface, em pt-BR (ver specs/002-entrar-sala-link/contracts/ui.md e
// specs/003-conversar-por-voz/contracts/ui.md e specs/004-ativar-webcam/contracts/ui.md e
// specs/005-compartilhar-tela/contracts/ui.md e specs/006-qualidade-compartilhamento/contracts/ui.md e
// specs/007-recado-na-tela/contracts/ui.md e specs/009-melhorias-visuais/contracts/ui.md).
// O nome do site ("Telão") fica no próprio index.html, no cabeçalho e no título da aba.
export const TEXTOS = {
  // Página inicial e tela de nome
  fraseApresentacao: "Compartilhe sua tela com os amigos, com voz e câmera.",
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

  // Voz
  ligarMicrofone: "Ligar microfone",
  desligarMicrofone: "Desligar microfone",
  ligandoMicrofone: "Ligando microfone…",
  ativarSom: "Ativar som",
  microfoneLigado: "microfone ligado",
  microfoneDesligado: "microfone desligado",
  erroPermissaoMicrofone:
    "Não conseguimos usar seu microfone. Para liberar, clique no ícone de cadeado ao lado do endereço do site, permita o microfone e clique em 'Ligar microfone' de novo.",
  semMicrofone: "Não encontramos nenhum microfone. Conecte um microfone e tente de novo.",
  erroLigarMicrofone:
    "Não foi possível ligar seu microfone. Feche outros programas que possam estar usando o microfone e tente de novo.",
  microfoneDesconectado:
    "Seu microfone foi desconectado. Verifique o microfone e clique em 'Ligar microfone' de novo.",
  naoFoiPossivelOuvir: (nome) => `Não foi possível ouvir ${nome}. Verifique sua conexão.`,

  // Câmera
  ligarCamera: "Ligar câmera",
  desligarCamera: "Desligar câmera",
  ligandoCamera: "Ligando câmera…",
  cameraLigada: "câmera ligada",
  cameraDesligada: "câmera desligada",
  erroPermissaoCamera:
    "Não conseguimos usar sua câmera. Para liberar, clique no ícone de cadeado ao lado do endereço do site, permita a câmera e clique em 'Ligar câmera' de novo.",
  semCamera: "Não encontramos nenhuma câmera. Conecte uma câmera e tente de novo.",
  erroLigarCamera:
    "Não foi possível ligar sua câmera. Feche outros programas que possam estar usando a câmera e tente de novo.",
  cameraDesconectada:
    "Sua câmera foi desconectada. Verifique a câmera e clique em 'Ligar câmera' de novo.",
  naoFoiPossivelMostrarVideo: (nome) =>
    `Não foi possível mostrar o vídeo de ${nome}. Verifique sua conexão.`,

  // Compartilhamento de tela
  compartilharTela: "Compartilhar tela",
  escolhendoCompartilhamento: "Escolhendo o que compartilhar…",
  pararCompartilhamento: "Parar de compartilhar",
  vocEstaCompartilhando: "Você está compartilhando sua tela",
  semSuporteCompartilhar:
    "Seu navegador não permite compartilhar a tela. Para compartilhar, use um computador com Chrome, Edge ou Firefox. Você continua podendo assistir.",
  telaCheia: "Tela cheia",
  marcaSemSom: " · sem som",
  verTelaDe: (nome) => `Ver a tela de ${nome}`,
  naoFoiPossivelMostrarTela: (nome) =>
    `Não foi possível mostrar a tela de ${nome}. Verifique sua conexão.`,
  erroPermissaoTela:
    "Não conseguimos compartilhar sua tela. Verifique se o navegador tem permissão para gravar a tela nas configurações do computador e tente de novo.",
  erroCompartilhar: "Não foi possível compartilhar sua tela. Tente de novo.",

  // Qualidade do compartilhamento
  qualidadeDoCompartilhamento: "Qualidade do compartilhamento",
  qualidadeAtiva: (descricao) => `Qualidade: ${descricao}`,
  limitadaPelaTela: " (limitada pelo tamanho da tela)",
  erroQualidade:
    "Não foi possível usar essa qualidade. O compartilhamento continua na qualidade anterior.",

  // Recados sobre o compartilhamento
  dicaRecado: "Aperte / para escrever um recado",
  rotuloCampoRecado: "Recado",
  caracteresRestantes: (n) => (n === 1 ? "Falta 1 caractere" : `Faltam ${n} caracteres`),
  marcaVoceTela: " (você)",
  erroEnviarRecado: "Não foi possível enviar o recado. Verifique sua conexão e tente de novo.",

  // Telas de erro
  salaInexistente: "Esta sala não existe ou já foi encerrada.",
  criarNovaSala: "Criar nova sala",
  salaCheiaTitulo: "Sala cheia",
  salaCheiaTexto: "Esta sala já tem 6 pessoas. Tente de novo quando alguém sair.",
  tentarDeNovo: "Tentar de novo",
  abertaEmOutraAba: "Esta sala foi aberta em outra aba.",
  erroVerificarSala: "Não foi possível abrir a sala. Verifique sua conexão e tente novamente.",
  conexaoPerdida: "Você perdeu a conexão com a sala. Recarregue a página para tentar de novo.",
  // T10: o servidor de mídia caiu ou não responde; a sala continua e o app tenta de novo sozinho.
  midiaIndisponivel: "Não foi possível conectar voz, câmera e tela. Tentando de novo…",
};
