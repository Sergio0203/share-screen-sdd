# Research: T02 · Entrar na sala pelo link

Parte da base da T01 ([../001-criar-sala/research.md](../001-criar-sala/research.md)): Node.js 22,
`node:http` + `ws`, salas em memória, front-end em JS puro, `node:test`. Nenhuma dependência nova.

## 1. Identidade do participante e do anfitrião

- **Decision**: cada navegador recebe, por sala, uma **chave de participante** secreta (128 bits,
  igual aos ids da T01), guardada no `localStorage` em `sala:<idSala>`. A sala guarda
  `chaveAnfitriao`. Quem se conecta com a chave igual a `chaveAnfitriao` é o anfitrião. A chave do
  criador é gerada em `POST /api/salas` (substitui o `tokenAnfitriao` da T01); as demais são geradas
  pelo servidor no primeiro `entrar` e devolvidas ao cliente.
- **Rationale**: transferir o papel (FR-013) vira só trocar `chaveAnfitriao` pela chave de outro
  participante, que já está guardada no navegador dele, então ele é reconhecido ao recarregar
  (FR-015) sem nenhum mecanismo extra. Mantém "sem cadastro".
- **Alternatives considered**: manter o `tokenAnfitriao` da T01 e emitir um token novo ao herdeiro
  (dois conceitos para a mesma coisa); chave em `sessionStorage` (perde a identidade ao fechar a aba,
  contrariando T01 FR-015); id público como identidade (qualquer participante veria o id do
  anfitrião e poderia se passar por ele).

## 2. Mesma chave conectada duas vezes (recarregar / duas abas)

- **Decision**: se chega um `entrar` com uma chave que já tem conexão ativa, a conexão nova
  **substitui** a antiga: a antiga recebe `erro: aberta-em-outra-aba` e é fechada; a vaga e o papel
  continuam com a mesma pessoa.
- **Rationale**: ao recarregar, a página nova pode conectar antes de o servidor perceber que a
  antiga fechou. Sem substituição, o anfitrião viraria "outra pessoa" ou a sala cheia recusaria quem
  só recarregou. Ajuste correspondente feito no edge case "Mesma pessoa em duas abas" da spec.
- **Alternatives considered**: contar cada aba como uma pessoa (exige chave por aba e quebra o
  reconhecimento do anfitrião ao reabrir o link); recusar a conexão nova (quem recarrega ficaria
  preso fora da sala até o servidor notar a queda).

## 3. Detectar saída em até 3 s (FR-006)

- **Decision**: fechar a aba ou recarregar fecha o WebSocket na hora. Para quedas de rede sem
  fechamento, o servidor envia *ping* do protocolo WebSocket a cada 1 s e encerra conexões que não
  responderam ao *ping* anterior. Intervalo injetável para testes.
- **Rationale**: sem *heartbeat*, uma conexão morta pode levar minutos para ser percebida. Com 1 s,
  a pior detecção é ~2 s, mais o envio da lista: dentro de 3 s. Navegadores respondem a *ping*
  automaticamente; não precisa de código no cliente. Custo irrelevante para 6 pessoas por sala.
- **Alternatives considered**: *heartbeat* em mensagens JSON (código nos dois lados sem ganho);
  intervalo de 2,5 s (estoura os 3 s na pior hipótese).

## 4. Atualização da lista

- **Decision**: a cada entrada, saída ou troca de anfitrião, o servidor envia a lista completa
  (`participantes`) para todas as conexões da sala.
- **Rationale**: no máximo 6 itens; mandar a lista inteira é mais simples e à prova de
  dessincronização do que mandar diferenças.
- **Alternatives considered**: eventos `entrou`/`saiu` incrementais (mais estados no cliente);
  polling HTTP (não atende 3 s sem tráfego constante).

## 5. Transferência do anfitrião (FR-013, FR-014)

- **Decision**: o registro reavalia o anfitrião a cada entrada/saída: se o anfitrião não está
  presente e há alguém na sala, agenda a transferência para 10 s (se ainda não agendada); se o
  anfitrião volta, cancela. Ao disparar, `chaveAnfitriao` passa para o participante presente com
  `entradaEm` mais antigo (ordem de inserção do `Map`, que desempata). Usa o mesmo relógio
  injetável da T01.
- **Rationale**: uma única regra cobre "anfitrião sai com gente na sala" e "anfitrião sozinho sai e
  depois alguém entra". Sala vazia continua seguindo só a expiração de 60 s da T01.
- **Alternatives considered**: transferir na hora (recarregar tiraria o papel); guardar uma fila de
  herdeiros (desnecessário: a ordem de entrada já é a fila).

## 6. Verificação antes da tela de nome (FR-008, FR-010)

- **Decision**: `GET /api/salas/<id>` responde 404 (inexistente) ou 200 `{ cheia }`. O cliente só
  chama quando **não** tem chave guardada para a sala; quem já tem chave e nome entra direto pelo
  WebSocket (FR-007), e o servidor decide (inclusive "sala cheia").
- **Rationale**: mostra "Sala cheia"/"não existe" antes de pedir o nome, sem abrir WebSocket só
  para consultar. A verificação definitiva continua no `entrar` (corrida pela última vaga, SC-003).
- **Alternatives considered**: mensagem `consultar` pelo WebSocket (conexão extra só para ler um
  estado); só verificar no `entrar` (a pessoa digitaria o nome à toa).

## 7. Validação do nome compartilhada

- **Decision**: `public/js/nome.js` exporta `normalizarNome(texto)` → nome sem espaços nas pontas ou
  `null` se vazio/maior que 30 caracteres (contando caracteres reais, não unidades UTF-16). Usado
  pelo navegador e importado pelo servidor.
- **Rationale**: uma regra só nos dois lados (Princípio II); o servidor não confia no cliente.
- **Alternatives considered**: duplicar a regra (risco de divergência).

## 8. Organização do front-end

- **Decision**: `app.js` passa a ter as telas início, nome, sala, sala cheia e inexistente. A
  lógica pura de montar os rótulos da lista ("(você)", "anfitrião") vai para
  `public/js/participantes.js`, testável no Node.
- **Rationale**: mantém `app.js` só com DOM e fluxo; o que tem regra fica testável (Princípio III).
- **Alternatives considered**: framework de UI (contra o Princípio I).
