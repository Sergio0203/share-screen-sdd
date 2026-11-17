# Quickstart: validar T05 · Compartilhar a tela

## Pré-requisitos

Os mesmos da T04 ([../004-ativar-webcam/quickstart.md](../004-ativar-webcam/quickstart.md)), mais:

- Chrome, Edge ou Firefox de computador; um app com janela e som (ex.: um jogo ou um player de
  vídeo).
- No macOS: permissão de **Gravação de Tela** para o navegador (Ajustes do Sistema → Privacidade e
  Segurança).
- Um celular na mesma rede, ou o modo de dispositivo móvel das ferramentas do navegador, para o
  caso "sem suporte" (no celular, o app precisa estar em `https://`).

```bash
npm install
npm test
npm start   # reinicie o servidor depois de atualizar o código
```

## Cenários automatizados (`npm test`)

| Cenário                                                                                  | Requisitos              |
|------------------------------------------------------------------------------------------|-------------------------|
| `escolherDestaque`: exclui a própria pessoa; mais recente; escolha mantida; escolha que terminou → mais recente; miniaturas por `inicio` decrescente; sem compartilhamentos → `null` | FR-004, FR-017, FR-018 |
| `classificarErroCompartilhamento`: sistema → permissão; cancelar → cancelado; outros → falha | FR-011               |
| Entrar → `tela: null`, `assistindo: null`                                                 | FR-001                  |
| `tela { compartilhando: true, som }` → lista para todos; segundo compartilhamento tem `inicio` maior; repetir não muda `inicio` | FR-003, FR-018 |
| `tela { compartilhando: false }` → `tela: null` para todos                                | FR-005                  |
| `assistindo { id }` → lista para todos                                                   | FR-017                  |
| Substituição → `tela: null`, `assistindo: null`                                          | FR-001, FR-015          |
| Validações (`compartilhando`/`som`/`id` inválidos, antes de `entrar`) → `mensagem-invalida` | contrato             |
| Testes da T04 atualizados (`tela`/`assistindo` nas listas, canais por posição)            | T04                     |

## Roteiro manual

Ana (perfil 1, computador) compartilha; Bruno (perfil 2) assiste. Ambos de fone.

1. **Janela de app**: Ana clica `Compartilhar tela` → escolhe a janela do jogo → em até 5 s Bruno vê
   o jogo em destaque com `Ana`, acima das câmeras e maior que elas. Ana vê `Parar de compartilhar`,
   `Você está compartilhando sua tela` e não vê a própria tela em destaque (US1, FR-003, FR-004,
   FR-006).
2. **Parar pelo app**: Ana clica `Parar de compartilhar` → some do Bruno em até 3 s (FR-005).
3. **Parar pelo navegador**: Ana compartilha a tela inteira e para pelo botão do navegador → some
   do Bruno em até 3 s; o botão da Ana volta a `Compartilhar tela` (FR-005).
4. **Cancelar**: Ana abre a escolha e cancela → nenhuma mensagem (FR-011).
5. **Tela cheia**: Bruno clica `Tela cheia` → ocupa a tela, proporção original; Esc volta. Em tela
   cheia, Ana para → a tela cheia do Bruno termina em até 3 s (US2, FR-007, FR-008).
6. **Quem chega depois**: com Ana compartilhando, Carla entra → vê em destaque em até 5 s (FR-009).
7. **Dois compartilhando**: Bruno também compartilha → Carla vê o do Bruno em destaque (mais
   recente) e `🖥️ Ana` em miniatura, sem imagem; clica na miniatura → a tela da Ana aparece em até
   2 s; Bruno para e volta a compartilhar → o destaque da Carla continua na Ana (escolha mantida)
   (FR-017, FR-018).
8. **Som**: no Windows (Chrome/Edge), Ana compartilha a tela inteira marcando "compartilhar áudio" →
   Bruno ouve o som; Ana compartilha só uma janela no macOS → Bruno vê `Ana · sem som` e nenhum
   erro aparece (FR-003, FR-019). Com dois compartilhamentos com som, Carla ouve só o do destaque.
9. **Eco**: com Ana compartilhando a tela inteira com som e Bruno falando, Bruno **não** deve ouvir a
   própria voz de volta (research §5). Registrar o navegador se ouvir.
10. **Permissão do macOS**: tire a permissão de Gravação de Tela do navegador e tente compartilhar →
    mensagem de permissão; Ana continua vendo, ouvindo e falando (US3).
11. **Celular**: abra a sala no celular → botão desabilitado com a explicação; o compartilhamento da
    Ana aparece normalmente (FR-010).
12. **Independência**: compartilhar não muda microfone nem câmera; voz e câmeras continuam (FR-013).
13. **Recarregar / sair**: Ana recarrega compartilhando → some para todos em até 3 s e ela volta sem
    compartilhar (FR-001, FR-015).

Textos esperados: [contracts/ui.md](contracts/ui.md). Protocolo: [contracts/websocket.md](contracts/websocket.md).
