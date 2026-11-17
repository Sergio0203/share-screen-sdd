# Quickstart: validar T04 · Ativar a webcam

## Pré-requisitos

Os mesmos da T03 ([../003-conversar-por-voz/quickstart.md](../003-conversar-por-voz/quickstart.md)),
mais uma **webcam**. Câmera, como microfone, só funciona em `https://` ou `http://localhost`.
Várias janelas no mesmo computador podem compartilhar a mesma webcam na maioria dos navegadores.

```bash
npm install
npm test
npm start   # http://localhost:3000 — reinicie o servidor depois de atualizar o código
```

## Cenários automatizados (`npm test`)

| Cenário                                                                                   | Requisitos         |
|-------------------------------------------------------------------------------------------|--------------------|
| `quadrosDeVideo`: só quem tem `camera: true`; ordem da lista; `(você)`; `falhou` só para outros | FR-004, FR-005, FR-008, FR-013 |
| Indicador: `câmera ligada` / `câmera desligada`                                            | FR-016             |
| `classificarErroCaptura`: permissão / sem dispositivo / falha                              | FR-010, FR-011     |
| Entrar → `camera: false` na lista                                                          | FR-001, SC-003     |
| `camera { ligada: true }` → lista com `camera: true` para todos; quem entra depois já vê    | FR-006, FR-007, FR-016 |
| `camera` e `microfone` mudam independentes na lista                                        | FR-009             |
| Substituição (mesma chave) → `camera: false`                                               | FR-001             |
| `camera` antes de `entrar` ou `ligada` não booleano → `mensagem-invalida`                  | contrato           |
| Testes da T03 atualizados (renomes de `voz*` para `midia*`, `camera` nas listas)           | T03                |

## Roteiro manual

Ana (perfil 1) e Bruno (perfil 2) na mesma sala, de fone.

1. **Entrar desligado**: botão `Ligar câmera`, nenhum quadro de vídeo, 📷 desligada para os dois na
   lista, e o navegador não pediu permissão de câmera (FR-001, FR-002).
2. **Ligar e ser visto**: Ana clica `Ligar câmera` → autoriza → botão `Desligar câmera`; Ana vê o
   próprio quadro `Ana (você)` espelhado; Bruno vê o quadro `Ana` em até 3 s; 📷 ligada para Ana nas
   duas listas (US1, FR-016).
3. **Desligar**: Ana clica `Desligar câmera` → o quadro some da tela do Bruno em até 3 s; a luz da
   câmera da Ana apaga (FR-006).
4. **Independência**: Ana liga só a câmera → Bruno vê e não ouve; Ana liga o microfone → Bruno vê e
   ouve; Ana desliga a câmera → Bruno continua ouvindo (US2).
5. **Quem chega depois**: com a câmera da Ana ligada, Carla (perfil 3) entra → já vê o quadro `Ana`
   (FR-007).
6. **Recarregar**: Ana recarrega com a câmera ligada → volta com a câmera desligada; o quadro some
   para os outros (edge case).
7. **Permissão negada**: no perfil do Bruno, bloqueie a câmera para `localhost` e clique `Ligar
   câmera` → mensagem de permissão; Bruno continua vendo a Ana, ouvindo e podendo ligar o microfone;
   Ana não vê erro (US3). Libere e clique de novo → liga e a mensagem some.
8. **Sem câmera / desconectar**: desconecte uma webcam USB com a câmera ligada → mensagem de
   desconexão e o quadro some para todos em até 3 s (FR-011).
9. **Seis pessoas**: 6 perfis com câmera e microfone ligados → cada um vê os 6 quadros sem rolagem
   lateral, todos com nome, e a voz continua compreensível (FR-008, SC-006).
10. **Regressão T03**: repetir os passos 2–3 do quickstart da T03 (microfone continua funcionando).

Textos esperados: [contracts/ui.md](contracts/ui.md). Protocolo: [contracts/websocket.md](contracts/websocket.md).
