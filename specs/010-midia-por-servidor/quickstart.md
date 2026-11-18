# Quickstart: validar a T10

## Pré-requisitos

- Node.js 22+, `npm install` feito; Docker.
- Para SC-004 e SC-007: 6 janelas em pelo menos 3 máquinas, uma delas numa internet doméstica comum
  (≥ 10 Mbit/s de upload).
- Para SC-008: um servidor com domínio público (ver "Implantação").

## Testes automatizados

```sh
npm test               # todos passam (SC-003 na parte automatizada)
npm run format:check
```

## Desenvolvimento local

```sh
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp \
  livekit/livekit-server:v1.13.11 --dev --bind 0.0.0.0 --node-ip 127.0.0.1   # terminal 1
npm start                                              # terminal 2 → http://localhost:3000
```

Sem variáveis `LIVEKIT_*`, o app usa os valores de desenvolvimento
([data-model.md](data-model.md#configuração-variáveis-de-ambiente-do-app)).

## Roteiro

1. **Uma transmissão por mídia (US1, SC-001, SC-002)**: 2 janelas na sala; na janela A, ligar
   microfone e câmera e compartilhar em "1080p · 30 fps". Em `chrome://webrtc-internals` da janela
   A, contar as entradas `outbound-rtp`: 1 de áudio (microfone), 2 de vídeo (câmera e tela) e mais 1
   de áudio se a tela tiver som. Entrar com a 3ª, 4ª, 5ª e 6ª janela e recontar: **os números não
   mudam**.
2. **Upload estável (SC-007)**: no mesmo painel, anotar a taxa de envio da tela com 2 pessoas e com
   6: diferença ≤ 20%.
3. **Sala cheia (SC-004)**: 6 pessoas, 6 câmeras e microfones ligados, tela em 1080p 30 fps, 10
   minutos. Em `webrtc-internals` de cada janela, `freezeCount` do vídeo recebido sem congelamentos
   acima de 1 s; voz sem cortes ao ouvido.
4. **Só a tela em destaque (T05 FR-019)**: 3 pessoas, duas compartilhando. Quem assiste tem só 1
   `inbound-rtp` de tela ativo; trocar o destaque pela miniatura troca a imagem em ≤ 2 s.
5. **Acesso (US2, SC-005)** — além dos testes de integração:
   - Copiar o `token` da mensagem `midia` (DevTools → Network → WS) e, depois de fechar a aba,
     tentar conectar com ele no console de outra aba
     (`const { Room } = await import("/js/livekit-client.js"); await new Room().connect(url, token)`):
     recusado (expirado) ou expulso em < 1 s.
   - Trocar o `room` de um token (sem a chave): recusado pela assinatura.
   - Pessoa sai: nas outras janelas, a câmera e a voz dela somem em ≤ 3 s.
6. **Servidor de mídia fora do ar (US3, SC-006)**: 3 pessoas, A com microfone e tela ligados, B com
   câmera. `docker stop` no LiveKit. Em ≤ 10 s, todas veem "Não foi possível conectar voz, câmera e
   tela. Tentando de novo…"; os botões de ligar ficam indisponíveis, os ligados ainda desligam.
   Mandar um recado e abrir uma 4ª janela: lista e recado funcionam. B desliga a câmera durante a
   queda. Subir o LiveKit de novo: em ≤ 10 s a mensagem some, A volta com microfone e **a mesma
   tela** sem clicar nada, B continua com a câmera desligada.
7. **Regressão (SC-003)**: refazer os quickstarts de
   [T03](../003-conversar-por-voz/quickstart.md) a [T09](../009-melhorias-visuais/quickstart.md)
   com o LiveKit ligado, conferindo os mesmos tempos.

## Implantação (servidor com domínio)

1. DNS: `telao.exemplo.com` e `turn.telao.exemplo.com` apontando para a máquina.
2. Portas liberadas: 80/tcp, 443/tcp, 7881/tcp, 7882/udp.
3. `.env` (fora do repositório) com `DOMINIO`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
4. `docker compose up -d`. Abrir `https://telao.exemplo.com` e repetir os passos 1 e 6.
5. **Rede só-HTTPS (FR-011, SC-008)**: numa máquina, bloquear tudo que sai menos TCP 443 (macOS: `pf`
   com `block out all` + `pass out proto tcp to any port 443` + DNS), ou usar uma rede corporativa.
   Entrar na sala: voz, câmera e tela funcionam; em `webrtc-internals`, o par candidato ativo é do
   tipo `relay` com protocolo `tls`; os tempos de T03–T05 aumentam no máximo 1 s.
