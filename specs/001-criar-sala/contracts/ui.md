# Contrato de Interface (textos em pt-BR)

Todos os textos visíveis desta tarefa (FR-012, FR-013). Implementação e testes devem usar
exatamente estes textos.

## Página inicial (`/`)

| Elemento                   | Texto                                                        |
|----------------------------|--------------------------------------------------------------|
| Botão principal            | `Criar sala`                                                 |
| Botão durante a criação    | `Criando sala…` (desabilitado; impede cliques extras, FR-011) |
| Erro ao criar              | `Não foi possível criar a sala. Verifique sua conexão e tente novamente.` |

## Sala (`/sala/<id>`)

| Elemento                         | Texto / comportamento                                       |
|----------------------------------|-------------------------------------------------------------|
| Título                           | `Sua sala`                                                  |
| Indicação de anfitrião (FR-016)  | `Você é o anfitrião desta sala` (só para o anfitrião)       |
| Link da sala                     | link completo, sempre visível e selecionável; rótulo acessível `Link da sala` |
| Botão de cópia (FR-009)          | `Copiar link` (sempre visível, sem menus nem rolagem)       |
| Confirmação de cópia (FR-006)    | `Link copiado!` — some sozinha após ~2,5 s                  |
| Cópia automática bloqueada       | sem confirmação; link visível + botão `Copiar link` em destaque |
| Cópia manual falhou              | `Não foi possível copiar o link. Selecione o link acima e copie manualmente.` (o texto do link fica selecionado) |
| Sala inexistente/expirada        | `Esta sala não existe mais.` + botão `Criar nova sala`      |
| Conexão perdida                  | `Você perdeu a conexão com a sala. Recarregue a página para tentar de novo.` |
