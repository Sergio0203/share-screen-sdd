# Implementation Plan: T06 · Escolher a qualidade do compartilhamento

**Branch**: `006-qualidade-compartilhamento` | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/006-qualidade-compartilhamento/spec.md`

## Summary

Quem compartilha escolhe a qualidade (720p · 30 fps, 1080p · 30 fps, 1080p · 60 fps) num seletor
ao lado do botão, antes ou durante o compartilhamento; a escolha fica lembrada no navegador e a
qualidade ativa aparece junto do aviso de compartilhamento. Abordagem: a qualidade vira restrições
da captura (aplicadas com `applyConstraints` na trilha em uso, sem recapturar) **e** parâmetros de
envio do canal da tela (`maxFramerate`, `maxBitrate`, `maintain-framerate`) para quem assiste. A
tabela de qualidades e as regras ficam num módulo puro. Nenhuma mudança no servidor ou no protocolo.
Detalhes em [research.md](research.md).

## Technical Context

**Language/Version**: JavaScript (módulos ES), Node.js 22+ e navegadores modernos (igual à T05)

**Primary Dependencies**: nenhuma nova; APIs nativas `getDisplayMedia`,
`MediaStreamTrack.applyConstraints`/`getSettings`, `RTCRtpSender.getParameters`/`setParameters`

**Storage**: `localStorage["qualidadeCompartilhamento"]` no navegador; nada no servidor

**Testing**: `node:test` — unitários do módulo de qualidades e de `midia.js` com navegador falso;
roteiro manual com as estatísticas do navegador

**Target Platform**: compartilhar — Chrome, Edge ou Firefox de computador (T05)

**Project Type**: aplicação web (servidor + estáticos no mesmo projeto)

**Performance Goals**: resolução e qps recebidos conforme a qualidade (SC-001/SC-002); troca
aplicada em ≤ 5 s sem interromper a imagem; com banda limitada, qps mantidos e resolução reduzida

**Constraints**: só reduz, nunca aumenta; mantém a proporção; voz com prioridade (T05); textos de
[contracts/ui.md](contracts/ui.md)

**Scale/Scope**: 3 qualidades, 1 seletor, 1 texto de qualidade ativa, 1 mensagem de erro

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| I. Simplicidade | Sem servidor/protocolo novos; troca por `applyConstraints` + `setParameters`, sem recapturar nem renegociar; tabela fixa de 3 qualidades; `<select>` nativo | ✅ |
| II. Código legível | Valores e regras num módulo puro (`qualidades.js`); `midia.js` só aplica; `app.js` só liga o seletor | ✅ |
| III. Testes da lógica principal | Tabela, restrições, parâmetros de envio, descrição da qualidade ativa, troca sem recaptura, falha e quem assiste depois cobertos por testes; qualidade real conferida no roteiro manual | ✅ |
| IV. Erros claros em pt-BR | Falha ao aplicar a qualidade tem mensagem em [contracts/ui.md](contracts/ui.md) | ✅ |
| V. Interface em pt-BR | Textos em `textos.js`; "720p", "1080p" e "fps" são os nomes pedidos na spec | ✅ |

**Re-check pós-design**: ✅ sem violações.

**Mudanças em código da T05** (necessárias, não violações): `OPCOES_TELA` deixa de fixar 30 qps e
passa a receber as restrições da qualidade; `compartilharTela` recebe a qualidade; o envio da tela
passa a aplicar parâmetros; o aviso de compartilhamento ganha o texto da qualidade.

## Project Structure

### Documentation (this feature)

```text
specs/006-qualidade-compartilhamento/
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
├── estilos.css          # ALTERADO: seletor de qualidade, texto da qualidade ativa
└── js/
    ├── qualidades.js    # NOVO (puro): tabela, padrão, restrições, parâmetros de envio, descrição
    ├── midia.js         # ALTERADO: compartilharTela(q), mudarQualidade(q), parâmetros de envio, qualidadeAtiva()
    ├── area-tela.js     # ALTERADO: texto da qualidade ativa junto do aviso
    ├── app.js           # ALTERADO: seletor, preferência, troca durante o compartilhamento
    └── textos.js        # ALTERADO: textos de contracts/ui.md (T06)
tests/
└── unit/
    ├── qualidades.test.js      # NOVO
    └── midia.test.js           # ALTERADO: navegador falso com captura e parâmetros de envio
```

**Structure Decision**: mesmo projeto; tudo no navegador. Um módulo puro novo concentra os números
e as regras da qualidade, para que `midia.js` e `app.js` só os apliquem.

## Complexity Tracking

Nenhuma violação da constituição a justificar.
