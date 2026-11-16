# Quickstart: validar T02 · Entrar na sala pelo link

## Pré-requisitos

Os mesmos da T01 ([../001-criar-sala/quickstart.md](../001-criar-sala/quickstart.md)): Node.js 22 e
um navegador de desktop. Para testar várias pessoas, use janelas anônimas ou perfis diferentes
(cada perfil é um "navegador").

```bash
npm install
npm test
npm start   # http://localhost:3000
```

## Cenários automatizados (`npm test`)

| Cenário                                                                    | Requisitos      |
|----------------------------------------------------------------------------|-----------------|
| `normalizarNome`: corta espaços; vazio, só espaços ou > 30 caracteres → inválido; emoji conta como 1 | FR-002 |
| Rótulos da lista: "(você)" e "anfitrião" corretos                           | FR-005          |
| `GET /api/salas/<id>`: 404 inexistente; `cheia` false/true                  | FR-008, FR-010  |
| `entrar` com nome → `entrou` + `participantes` para todos                   | FR-003, FR-004, FR-006 |
| Saída (fechar conexão) → lista atualizada para os demais                    | FR-006          |
| Conexão que não responde a *ping* é removida em ≤ ~2 s                      | FR-006          |
| 7º `entrar` → `sala-cheia`; 7 `entrar` simultâneos → exatamente 6 entram     | FR-009, FR-010, SC-003 |
| Mesma chave conectando de novo → substitui; antiga recebe `aberta-em-outra-aba` | edge case    |
| Anfitrião ausente por 10 s com outros presentes → papel vai ao mais antigo (relógio falso) | FR-013 |
| Anfitrião volta antes de 10 s → continua; depois → participante comum       | FR-014          |
| Herdeiro reconecta com sua chave → continua anfitrião                       | FR-015          |
| Testes da T01 atualizados (`chave` no lugar de `tokenAnfitriao`, `nome` no `entrar`) | T01 |

## Roteiro manual

1. **Criar com nome**: em `/`, apague o nome e clique em **Criar sala** → `Digite seu nome para
   continuar.`, nenhuma sala criada. Digite "Ana" e crie → dentro da sala, link copiado, lista
   `Na sala (1 de 6)` com `Ana (você) · anfitrião` (FR-011).
2. **Entrar pelo link**: abra o link numa janela anônima → tela `Entrar na sala`. Entre como
   "Bruno" → as duas janelas mostram Ana e Bruno em até 3 s (US1).
3. **Recarregar**: recarregue a janela do Bruno → volta direto para a sala, sem pedir nome (FR-007).
4. **Saída**: feche a janela do Bruno → some da lista da Ana em até 3 s.
5. **Transferência**: com Ana e Bruno na sala, feche a janela da Ana e espere ~12 s → Bruno vê
   `Bruno (você) · anfitrião` e `Você é o anfitrião desta sala` (FR-013). Recarregue o Bruno → segue
   anfitrião (FR-015). Reabra o link no navegador da Ana → entra sem o papel (FR-014).
6. **Recarregar como anfitrião**: recarregue a janela do anfitrião → continua anfitrião.
7. **Duas abas**: abra o mesmo link numa segunda aba do mesmo navegador → a aba antiga mostra
   `Esta sala foi aberta em outra aba.`; a lista não duplica a pessoa.
8. **Sala cheia**: com 6 pessoas (perfis/janelas diferentes), abra o link num 7º → `Sala cheia`,
   sem tela de nome. Feche uma das 6 e clique em **Tentar de novo** → tela de nome.
9. **Inexistente**: abra `/sala/AAAAAAAAAAAAAAAAAAAAAA` → `Esta sala não existe ou já foi
   encerrada.`; **Criar nova sala** leva a `/`.

Textos esperados: [contracts/ui.md](contracts/ui.md).
