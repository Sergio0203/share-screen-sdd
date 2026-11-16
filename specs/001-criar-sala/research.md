# Research: T01 · Criar uma sala

Todas as decisões seguem o Princípio I (a solução mais simples que cumpre os critérios de aceite).

## 1. Stack da aplicação

- **Decision**: Node.js 22 LTS no servidor, usando `node:http` (sem framework web) e a biblioteca
  `ws` para WebSocket. Front-end em HTML, CSS e JavaScript puros (módulos ES), servido como arquivos
  estáticos, sem etapa de build.
- **Rationale**: uma única linguagem nos dois lados; zero build; apenas uma dependência de produção.
  O WebSocket é necessário já nesta tarefa para saber quem está na sala (FR-014) e será reaproveitado
  para a sinalização do compartilhamento de tela nas próximas tarefas.
- **Alternatives considered**: Express/Fastify (desnecessários para 3 rotas); React/Vue com bundler
  (complexidade sem ganho para 2 telas); Socket.IO (mais pesado que `ws`; reconexão automática não é
  exigida); detectar presença por polling HTTP (mais código e mais impreciso que o fechamento do
  WebSocket).

## 2. Armazenamento das salas

- **Decision**: em memória, num `Map` dentro do processo do servidor.
- **Rationale**: salas só existem enquanto há gente nelas, mais ~1 minuto (FR-014); não há nada a
  preservar a longo prazo. Grupos pequenos de amigos cabem folgadamente num único processo.
- **Alternatives considered**: Redis/banco de dados (só seriam necessários com vários processos ou
  persistência, o que a spec não pede). Consequência aceita: reiniciar o servidor encerra as salas.

## 3. Identificador e link da sala (FR-003, FR-004)

- **Decision**: 16 bytes de `crypto.randomBytes` codificados em base64url (22 caracteres). Link:
  `<origem>/sala/<id>`.
- **Rationale**: 128 bits aleatórios → chance de acertar uma sala específica por tentativa ≈ 3×10⁻³⁹,
  bem abaixo do limite de 10⁻³⁰; colisão entre salas é praticamente impossível (SC-003). Ainda
  assim, o registro verifica se o id já existe antes de usá-lo.
- **Alternatives considered**: UUID v4 (122 bits, link mais longo); ids curtos legíveis (fáceis de
  adivinhar, violam FR-004); ids sequenciais (proibidos pela spec).

## 4. Reconhecimento do anfitrião sem cadastro (FR-015)

- **Decision**: ao criar a sala, o servidor gera um segundo segredo aleatório (`tokenAnfitriao`,
  16 bytes base64url) e o devolve apenas para quem criou. O navegador o guarda no `localStorage`
  com a chave `anfitriao:<idSala>`. Ao entrar na sala, o cliente envia o token; o servidor compara e
  responde se a pessoa é anfitriã.
- **Rationale**: atende "mesmo navegador, inclusive após recarregar" sem conta nem cookie de
  sessão. Quem só tem o link não tem o token, logo não vira anfitrião.
- **Alternatives considered**: cookie HTTP (funciona, mas exige parsing de cookies no servidor e
  cuidado com o caminho); `sessionStorage` (perde o papel ao fechar a aba e voltar, contrariando
  FR-015); considerar anfitrião "o primeiro que conectar" (qualquer pessoa com o link poderia chegar
  primeiro).

## 5. Cópia automática do link (FR-005 a FR-008)

- **Decision**: a página é uma SPA mínima. A sala é criada e exibida no mesmo documento (troca de
  tela + `history.pushState` para `/sala/<id>`), sem recarregar a página. Dentro do handler do
  clique, chama-se **sincronamente** `navigator.clipboard.write([new ClipboardItem({ "text/plain":
  promessaDoLink })])`, onde `promessaDoLink` resolve quando o servidor responde. Se `ClipboardItem`
  não existir, usa-se `navigator.clipboard.writeText(link)` assim que o link chega. Qualquer
  rejeição = cópia bloqueada → mostra link visível + botão "Copiar link".
- **Rationale**: navegadores só permitem escrever na área de transferência durante (ou logo após) um
  gesto do usuário. Navegar para outra página perderia esse gesto. Passar uma promessa ao
  `ClipboardItem` é o padrão aceito pelo Safari, que é o mais restritivo; Chrome e Firefox recentes
  também aceitam.
- **Alternatives considered**: navegar para `/sala/<id>` e copiar lá (o gesto já se perdeu; a cópia
  falharia quase sempre); `document.execCommand("copy")` (obsoleto); copiar apenas no clique de
  "Copiar link" (não atende FR-005).
- **Falha também na cópia manual**: mostrar a mensagem de FR-012 e selecionar o texto do link para
  facilitar Ctrl/Cmd+C.

## 6. Presença e expiração (FR-014)

- **Decision**: cada pessoa na sala mantém uma conexão WebSocket. O registro de salas conta conexões
  por sala. Ao chegar a 0, agenda a expiração em 60 s; se alguém entrar antes, cancela. Uma sala
  recém-criada começa vazia, com o mesmo prazo de 60 s para a primeira conexão.
- **Rationale**: o fechamento da conexão (inclusive ao fechar a aba ou recarregar) é o sinal mais
  simples e confiável de saída. O relógio/temporizador é injetado no registro para permitir testes
  sem esperar 60 s reais.
- **Alternatives considered**: heartbeat HTTP periódico (mais código); expirar apenas por tempo fixo
  (rejeitado na clarificação).

## 7. Testes

- **Decision**: executor nativo `node:test` + `node:assert`. Testes unitários para o registro de
  salas (ids, anfitrião, contagem, expiração) e para a lógica de cópia com área de transferência
  falsa; testes de integração que sobem o servidor em porta aleatória e exercitam HTTP + WebSocket.
  Verificação de interface e cópia real no navegador via roteiro manual do `quickstart.md`.
- **Rationale**: zero dependência de teste; cobre toda a lógica principal (Princípio III). A
  interação real com a área de transferência depende do navegador e é validada manualmente.
- **Alternatives considered**: Jest/Vitest (dependência extra sem ganho); Playwright (útil, mas
  pesado para esta tarefa; pode entrar quando o compartilhamento de tela existir).

## 8. Formatação

- **Decision**: Prettier como dependência de desenvolvimento, com `npm run format` e
  `npm run format:check`.
- **Rationale**: a constituição (Princípio II) exige formatador automático; Prettier funciona sem
  configuração para JS, HTML e CSS.
- **Alternatives considered**: ESLint (pode ser adicionado depois; não é exigido para cumprir a
  constituição).
