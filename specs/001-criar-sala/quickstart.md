# Quickstart: validar T01 · Criar uma sala

## Pré-requisitos

- Node.js 22 LTS
- Um navegador de desktop atualizado (Chrome, Firefox ou Safari)

## Preparar e rodar

```bash
npm install
npm test            # testes unitários + integração (node:test)
npm run format:check
npm start           # sobe em http://localhost:3000 (porta via PORT)
```

## Cenários automatizados (`npm test`)

| Cenário                                                         | Requisitos           |
|-----------------------------------------------------------------|----------------------|
| `POST /api/salas` devolve 201 com `id`, `link`, `tokenAnfitriao` | FR-002               |
| 10.000 salas criadas → nenhum id repetido; ids com 22 chars      | FR-003, FR-004, SC-003 |
| `entrar` com token correto → `anfitriao: true`; sem token ou errado → `false` | FR-015 |
| `entrar` em id inexistente → `erro: sala-inexistente`            | contrato WebSocket   |
| Última conexão fecha → sala existe até 60 s, depois expira (relógio falso) | FR-014 |
| Reconectar dentro de 60 s → mesma sala, anfitrião preservado     | FR-010, FR-014, FR-015 |
| Lógica de cópia: sucesso → "Link copiado!"; rejeição → modo bloqueado | FR-005–FR-008 |

## Roteiro manual no navegador

1. Abra `http://localhost:3000` e clique em **Criar sala**.
   - Esperado: em menos de 3 s você está em `/sala/<id>`, vê `Você é o anfitrião desta sala` e
     `Link copiado!`. Cole num editor de texto: o conteúdo é o link exibido (SC-001, SC-002).
2. Clique em **Copiar link** de novo → `Link copiado!` reaparece (US3).
3. Recarregue a página → mesma sala, mesmo link, ainda anfitrião (FR-010).
4. Abra o link numa janela anônima → entra na sala **sem** a indicação de anfitrião (FR-015).
5. Feche todas as abas da sala, espere ~70 s e abra o link → `Esta sala não existe mais.` (FR-014).
6. Cópia bloqueada: no Firefox/Chrome, negue a permissão de área de transferência para
   `localhost` (ou simule rejeição pelo console) e crie uma sala → sem confirmação, link visível e
   botão **Copiar link** funcionando (US2).
7. Pare o servidor e clique em **Criar sala** → mensagem de erro em pt-BR; botão volta a ficar
   disponível.
8. Clique várias vezes rápido em **Criar sala** → apenas uma sala é criada (FR-011).

Textos esperados: [contracts/ui.md](contracts/ui.md).
