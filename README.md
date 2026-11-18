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
Para apontar algo na tela compartilhada, aperte `/` com o mouse sobre a imagem e escreva um recado
de até 100 caracteres: ele aparece ao vivo para todos, com o seu nome, e acompanha o seu cursor
enquanto estiver na tela. 8 s depois que você para de digitar, ele some aos poucos (voltar a digitar
antes disso o mantém; Esc apaga na hora). Cada pessoa tem um recado por vez. Quem compartilha também vê a própria
tela na sala e pode escrever sobre ela.
Compartilhar exige Chrome, Edge ou Firefox de computador; pelo celular, dá para assistir.

Voz, câmera e tela passam por um servidor de mídia ([LiveKit](https://livekit.io), código aberto),
que repassa para os outros: cada pessoa envia uma cópia só de cada coisa, por maior que seja a sala.
Se o servidor de mídia cair, a sala continua (lista e recados) e a mídia volta sozinha quando ele
voltar.

Microfone, câmera e compartilhamento só funcionam quando o app é aberto por `https://` ou em
`http://localhost`.

## Pré-requisitos

- Node.js 22 ou mais recente
- Docker (para o servidor de mídia)

## Como rodar

```bash
npm install

# Terminal 1: servidor de mídia de desenvolvimento (chave "devkey", segredo "secret")
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server:v1.13.11 --dev --bind 0.0.0.0 --node-ip 127.0.0.1

# Terminal 2: o app
npm start          # http://localhost:3000 (mude a porta com PORT=4000 npm start)
```

Sem as variáveis `LIVEKIT_URL`, `LIVEKIT_API_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`, o app
usa esse servidor de desenvolvimento.

## Implantação

Num servidor Linux com Docker e um domínio próprio:

1. DNS: o domínio (ex.: `telao.exemplo.com`) e `turn.` + domínio (ex.: `turn.telao.exemplo.com`)
   apontando para o servidor.
2. Portas liberadas: 80/tcp e 443/tcp (site e certificado), 7881/tcp e 7882/udp (mídia).
3. Copie `.env.exemplo` para `.env` e preencha `DOMINIO`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`
   (gere o segredo com `openssl rand -base64 32`). O `.env` não vai para o repositório.
4. `docker compose up -d`.

O Caddy obtém o certificado HTTPS sozinho e divide a porta 443 entre o site e o servidor de mídia,
para a voz e o vídeo funcionarem também em redes que só liberam navegação (empresa, faculdade). Cada
sala cheia (6 pessoas, tela em 1080p e 6 câmeras) usa cerca de 60 Mbit/s de saída no servidor.

## Desenvolvimento

```bash
npm test             # testes unitários e de integração
npm run format       # formata o código com Prettier
npm run format:check # verifica a formatação
```

As especificações de cada funcionalidade ficam em `specs/`, e os princípios do projeto em
`.specify/memory/constitution.md`.
