# Compartilhar tela

App web para compartilhar a tela entre amigos. Informe seu nome, crie uma sala sem cadastro e mande
o link: quem recebe digita o nome e entra, e todos veem quem está na sala (até 6 pessoas).
Na sala, cada pessoa liga e desliga o próprio microfone e a própria câmera: todos ouvem quem está
com o microfone ligado, veem o vídeo de quem está com a câmera ligada e veem na lista o estado de
cada um.

Qualquer pessoa pode compartilhar a tela inteira ou a janela de um app (com o som, quando o
navegador permitir). Os outros veem o compartilhamento em destaque, acima das câmeras, e podem pôr
em tela cheia; se várias pessoas compartilham ao mesmo tempo, cada um escolhe qual ver em destaque.
Antes ou durante o compartilhamento, dá para escolher a qualidade: 720p · 30 fps, 1080p · 30 fps
ou 1080p · 60 fps (a escolha fica lembrada no navegador).
Compartilhar exige Chrome, Edge ou Firefox de computador; pelo celular, dá para assistir.

Microfone, câmera e compartilhamento só funcionam quando o app é aberto por `https://` ou em
`http://localhost`.

## Pré-requisitos

- Node.js 22 ou mais recente

## Como rodar

```bash
npm install
npm start          # http://localhost:3000 (mude a porta com PORT=4000 npm start)
```

## Desenvolvimento

```bash
npm test             # testes unitários e de integração
npm run format       # formata o código com Prettier
npm run format:check # verifica a formatação
```

As especificações de cada funcionalidade ficam em `specs/`, e os princípios do projeto em
`.specify/memory/constitution.md`.
