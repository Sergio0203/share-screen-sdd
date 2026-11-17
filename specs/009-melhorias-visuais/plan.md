# Implementation Plan: T09 · Melhorias visuais (vermelho e preto)

**Branch**: `009-melhorias-visuais` | **Date**: 2026-11-17 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/009-melhorias-visuais/spec.md`

## Summary

O site ganha identidade visual escura com brilho vinho e destaques em vermelho, um conjunto único
de ícones, animações curtas e um layout de sala organizado, sem mudar comportamento nem textos de
T01–T08 — com duas exceções pedidas nas Clarifications: o **avatar** no lugar da câmera desligada
(FR-017, altera a T04) e o **cabeçalho "Telão"** com frase de apresentação (FR-018).

Abordagem: reescrever `estilos.css` sobre variáveis de cor e de movimento (research §1, §5); um
módulo novo `icones.js` com os desenhos do conjunto Lucide como dados e `criarIcone(nome)` (§2);
cabeçalho e logo estáticos em `index.html` (§3); controles da sala só com ícone, nome em
`aria-label` e dica CSS (§4); grade de quadros e lista de participantes reaproveitando elementos por
`id` para animar entrada e saída (§5); `quadrosDeVideo` devolvendo todos os participantes e
`inicialDoNome` para o avatar (§7); mensagens como aviso flutuante com ícone de erro/sucesso (§9).
Animações só em CSS, só `opacity`/`transform`, com `prefers-reduced-motion`. Detalhes em
[research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos; CSS sem
pré-processador (igual a T01–T08)

**Primary Dependencies**: nenhuma nova. Desenhos de ícone copiados do Lucide (licença ISC) para
`icones.js`, sem pacote; fontes do sistema (`system-ui`), sem fonte externa

**Storage**: N/A (nada novo; a qualidade e o nome continuam no `localStorage` como antes)

**Testing**: `node:test` — unitários de `icones.js`, `inicialDoNome` e `quadrosDeVideo` (regra
nova); integração de estáticos (cabeçalho na página); roteiro visual manual em
[quickstart.md](quickstart.md)

**Target Platform**: navegadores modernos de computador (Chrome, Edge, Firefox, Safari), janelas de
360 px a 1920 px de largura

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto); só a parte `public/` muda

**Performance Goals**: animações só de `opacity`/`transform`, sem travar com compartilhamento, voz
e 6 câmeras (SC-005); durações de 150–400 ms (SC-004)

**Constraints**: contraste ≥ 4,5:1 (texto) e ≥ 3:1 (ícones/texto grande) (FR-003); nenhum serviço
externo; sem `backdrop-filter` sobre vídeo; nenhum texto existente muda (FR-016); comportamento dos
recados (T08) intacto

**Scale/Scope**: 1 folha de estilos reescrita, 1 módulo novo (`icones.js`), 1 função pura nova
(`inicialDoNome`), ~17 ícones, 2 textos novos (`fraseApresentacao` e "Telão" no HTML), 1 regra de
sala alterada (quem tem quadro)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Sem dependência nova, sem pré-processador, sem biblioteca de ícones/animações; animações só em CSS; ícones como dados num módulo; cabeçalho estático; servidor sem mudança | ✅ |
| II. Código legível | Cores e durações em variáveis CSS nomeadas em pt-BR; ícones por nome (`criarIcone("microfone-desligado")`); reaproveitamento por id segue o padrão já usado nos recados (T08) | ✅ |
| III. Testes da lógica principal | A única regra de sala alterada (todos têm quadro, FR-017) e a inicial do avatar são testadas; `icones.js` testado (todo nome usado existe); estilos dispensados de teste (permitido) e cobertos pelo quickstart | ✅ |
| IV. Erros claros em pt-BR | Mensagens de erro inalteradas; ganham ícone e aparência de erro, distintas de sucesso | ✅ |
| V. Interface em pt-BR | Textos atuais mantidos; novos: "Telão" e "Compartilhe sua tela com os amigos, com voz e câmera."; dicas dos ícones usam os textos atuais de `TEXTOS` | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código de tarefas anteriores** (necessárias, não violações):

- T04: `quadrosDeVideo` deixa de filtrar por câmera ligada (FR-017); `quadros.test.js` atualizado.
- T03/T04/T05: `criarBotaoDispositivo` passa a mostrar ícone por estado e a usar `aria-label` em vez
  de `textContent` (textos iguais).
- T05: miniaturas trocam o emoji 🖥️ pelo ícone `monitor`; botão "Tela cheia" vira só ícone.
- T06: o `<select>` de qualidade ganha invólucro com ícone; lógica inalterada.
- T02: `#mensagem` vira aviso flutuante com tipo erro/sucesso; chamadas inalteradas.

## Project Structure

### Documentation (this feature)

```text
specs/009-melhorias-visuais/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ui.md
├── checklists/requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
public/
├── index.html           # ALTERADO: <header> com logo SVG + "Telão", <title>, ícone da aba (data:), color-scheme
├── estilos.css          # REESCRITO: tokens de cor/movimento, layout em grid, barra de controles,
│                        #   dicas, aviso flutuante, avatar, keyframes, prefers-reduced-motion
└── js/
    ├── icones.js        # NOVO: ICONES (dados Lucide, ISC) + criarIcone(nome)
    ├── entrada-saida.js # NOVO: animarEntrada, removerComAnimacao, ordenarFilhos, reiniciarAnimacao
    ├── quadros.js       # ALTERADO: todos os participantes, campo cameraLigada; inicialDoNome(nome)
    ├── area-videos.js   # ALTERADO: quadros por id, avatar, entrada/saída animadas, cross-fade
    ├── area-tela.js     # ALTERADO: tela cheia só ícone; miniaturas com ícone `monitor`
    ├── textos.js        # ALTERADO: + fraseApresentacao
    └── app.js           # ALTERADO: botões com ícone/aria-label/carregando; invólucro da qualidade;
                         #   lista por id com ícones; mensagem com tipo; frase na página inicial;
                         #   estrutura de áreas da sala (topo, palco, lateral, barra)
tests/
├── unit/
│   ├── icones.test.js   # NOVO
│   ├── quadros.test.js  # ALTERADO: todos têm quadro; inicialDoNome
│   └── reproducao-video.test.js # ALTERADO: DOM falso com SVG/classList; câmera desligada = avatar
└── integration/
    └── estaticos.test.js # ALTERADO: página com cabeçalho "Telão"
```

**Structure Decision**: mesmo projeto e mesma divisão de T01–T08. Servidor (`src/`) não muda. A
aparência fica toda em `estilos.css`; o JS só monta a estrutura (áreas, ícones, classes de estado) e
reaproveita elementos para que as animações de entrada rodem uma vez.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
