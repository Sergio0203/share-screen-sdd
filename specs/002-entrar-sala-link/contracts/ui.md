# Contrato de Interface (versão T02, textos em pt-BR)

Substitui [../../001-criar-sala/contracts/ui.md](../../001-criar-sala/contracts/ui.md). Textos
novos ou alterados marcados com **(T02)**. Todos vêm de `public/js/textos.js`.

## Página inicial (`/`)

| Elemento                            | Texto / comportamento                                               |
|-------------------------------------|---------------------------------------------------------------------|
| **(T02)** Campo de nome             | rótulo `Seu nome`; `maxlength` 30; preenchido com `nomeExibicao`    |
| Botão principal                     | `Criar sala`                                                        |
| Botão durante a criação             | `Criando sala…` (desabilitado)                                      |
| **(T02)** Nome vazio                | `Digite seu nome para continuar.` (sala não é criada; foco no campo) |
| **(T02)** Nome longo                | `O nome pode ter no máximo 30 caracteres.`                          |
| Erro ao criar                       | `Não foi possível criar a sala. Verifique sua conexão e tente novamente.` |

## Tela de nome (`/sala/<id>`, sala com vaga, sem chave guardada) **(T02)**

| Elemento         | Texto / comportamento                                                   |
|------------------|-------------------------------------------------------------------------|
| Título           | `Entrar na sala`                                                        |
| Campo de nome    | rótulo `Seu nome`; `maxlength` 30; preenchido com `nomeExibicao`; foco automático |
| Botão            | `Entrar na sala` (Enter também confirma)                                |
| Nome inválido    | mesmas mensagens da página inicial                                      |

## Sala (`/sala/<id>`, depois de entrar)

| Elemento                         | Texto / comportamento                                           |
|----------------------------------|-----------------------------------------------------------------|
| Título                           | `Sua sala`                                                      |
| Link + botão                     | igual à T01 (`Link da sala`, `Copiar link`, `Link copiado!`, erro de cópia) |
| Indicação de anfitrião           | `Você é o anfitrião desta sala` (também para quem herdou o papel) |
| **(T02)** Título da lista        | `Na sala (N de 6)`                                              |
| **(T02)** Item da lista          | `<nome>`, com sufixos ` (você)` e/ou ` · anfitrião`             |

## Telas de erro

| Situação                           | Texto / comportamento                                             |
|------------------------------------|-------------------------------------------------------------------|
| **(T02)** Sala inexistente/expirada | `Esta sala não existe ou já foi encerrada.` + botão `Criar nova sala` (vai para `/`) |
| **(T02)** Sala cheia               | título `Sala cheia` + `Esta sala já tem 6 pessoas. Tente de novo quando alguém sair.` + botão `Tentar de novo` (recarrega a verificação) |
| **(T02)** Aberta em outra aba      | `Esta sala foi aberta em outra aba.`                              |
| **(T02)** Falha ao verificar a sala | `Não foi possível abrir a sala. Verifique sua conexão e tente novamente.` + botão `Tentar de novo` |
| Conexão perdida                    | igual à T01                                                       |
