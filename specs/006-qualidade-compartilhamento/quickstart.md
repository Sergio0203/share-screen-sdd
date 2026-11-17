# Quickstart: validar T06 · Escolher a qualidade do compartilhamento

## Pré-requisitos

Os mesmos da T05 ([../005-compartilhar-tela/quickstart.md](../005-compartilhar-tela/quickstart.md)),
mais:

- Um monitor de **1080p ou maior** e algo em movimento contínuo para compartilhar (ex.: um vídeo em
  tela cheia ou um jogo).
- Estatísticas do navegador de quem assiste: `chrome://webrtc-internals` (Chrome/Edge) ou
  `about:webrtc` (Firefox). Procure o vídeo **recebido** (`inbound-rtp`, `kind: video`) da conexão
  com quem compartilha e observe `frameWidth`, `frameHeight` e `framesPerSecond`.
- Para a SC-007: limitação de banda nas ferramentas do navegador de quem compartilha (aba Rede →
  limitação personalizada, ex.: 1,5 Mbit/s de upload).

```bash
npm install
npm test
npm start   # reinicie o servidor depois de atualizar o código
```

## Cenários automatizados (`npm test`)

| Cenário                                                                                   | Requisitos     |
|-------------------------------------------------------------------------------------------|----------------|
| Tabela de qualidades: ids, nomes, resolução, qps, taxa; padrão `1080p30`; id desconhecido → padrão | FR-001, FR-003 |
| `restricoesDeCaptura`: máximos de largura/altura e qps (só reduz)                         | FR-004, FR-005 |
| `parametrosDeEnvio`: `maxFramerate`, `maxBitrate`, `scaleResolutionDownBy: 1`, `maintain-framerate`; sem `encodings` não muda | FR-004, clarificação |
| `descreverQualidadeAtiva`: normal; ultrawide (um lado no máximo) → normal; tela menor nos dois lados → limitada | FR-007 |
| `compartilharTela(q)` captura com as restrições de `q`                                    | FR-004         |
| `mudarQualidade(q)` aplica restrições na trilha em uso, sem nova captura, e atualiza o envio de quem assiste | FR-006 |
| `mudarQualidade` com `applyConstraints` falhando rejeita e mantém a qualidade anterior    | FR-008         |
| Quem passa a assistir depois de uma troca recebe os parâmetros da qualidade atual        | FR-006         |
| Testes da T05 continuam passando (captura sem qualidade explícita = padrão)              | T05            |

## Roteiro manual

Ana compartilha (monitor 1080p, vídeo em movimento); Bruno assiste com as estatísticas abertas.

1. **Padrão e lembrança**: abra a sala pela primeira vez → seletor em `1080p · 30 fps`. Escolha
   `720p · 30 fps`, recarregue → continua `720p · 30 fps` (FR-003).
2. **720p**: Ana compartilha em `720p · 30 fps` → Ana vê `Qualidade: 720p · 30 fps`; Bruno vê
   ~1280×720 e 25–30 qps (US1, SC-001, SC-002).
3. **1080p 30**: Ana para, escolhe `1080p · 30 fps` e compartilha → ~1920×1080 e 25–30 qps.
4. **1080p 60**: idem com `1080p · 60 fps` → ~1920×1080 e acima de 50 qps (num computador capaz).
5. **Troca durante**: com Ana em `1080p · 60 fps`, troque para `720p · 30 fps` sem parar → a tela
   do Bruno não some nem fica preta; em até 5 s as estatísticas mostram ~1280×720 e ~30 qps; o texto
   da Ana muda. Troque de volta e confira (US2, FR-006, SC-003).
6. **Tela menor**: Ana compartilha uma janela pequena (ex.: 800×600) em `1080p · 30 fps` → texto
   `Qualidade: 800×600 · 30 fps (limitada pelo tamanho da tela)`; nas estatísticas, 800×600 (sem
   aumentar) (FR-005, FR-007).
7. **Internet fraca**: com upload limitado a ~1,5 Mbit/s na Ana, em `1080p · 60 fps` → nas
   estatísticas do Bruno, a resolução cai e os quadros por segundo continuam acima de 50 (SC-007).
8. **Quem chega depois**: com Ana compartilhando, troque a qualidade e só então Carla entra e
   assiste → Carla recebe na qualidade atual.
9. **Celular**: abra a sala no celular → sem seletor de qualidade (FR-010).
10. **Independência**: trocar a qualidade não muda câmera, microfone nem o compartilhamento de
    outra pessoa (FR-009).

Textos esperados: [contracts/ui.md](contracts/ui.md).
