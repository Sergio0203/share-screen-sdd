# Quickstart: validar T03 · Conversar por voz

## Pré-requisitos

Os mesmos da T02 ([../002-entrar-sala-link/quickstart.md](../002-entrar-sala-link/quickstart.md)),
mais:

- Um microfone e **fone de ouvido** (com várias janelas no mesmo computador, caixas de som geram
  microfonia).
- O microfone só funciona em contexto seguro: use `http://localhost:3000`. Para testar entre
  computadores diferentes, sirva a aplicação por `https://`.
- Para várias pessoas, use perfis diferentes do navegador ou janela anônima (cada perfil é uma
  pessoa).

```bash
npm install
npm test
npm start   # http://localhost:3000
```

## Cenários automatizados (`npm test`)

| Cenário                                                                                  | Requisitos          |
|------------------------------------------------------------------------------------------|---------------------|
| `devoIniciar` / `compararPares`: um iniciador por par; cria só ids novos; fecha ids que saíram; ignora o próprio id | FR-004, FR-007 |
| `classificarErroMicrofone`: permissão / sem microfone / falha                              | FR-010, FR-011      |
| Rótulo do indicador: `microfone ligado` / `microfone desligado`                            | FR-008              |
| Entrar → `microfone: false` na lista                                                       | FR-001, SC-004      |
| `microfone { ligado: true }` → lista com `microfone: true` para todos; repetir o mesmo valor não reenvia | FR-009 |
| Substituição (mesma chave) → id novo, `microfone: false`, mesmo nome/posição/papel          | FR-001, research §5 |
| `sinal` → chega só ao destinatário, com `de` = id do remetente                             | FR-004              |
| `sinal` para id inexistente ou de outra sala → ignorado, conexão segue aberta              | FR-012              |
| `sinal`/`microfone` antes de `entrar`, `ligado` não booleano, `dados` não objeto → `mensagem-invalida` | contrato |
| Mensagem > 64 KiB → conexão fechada                                                        | contrato            |
| Testes da T02 de substituição atualizados (id muda)                                        | T02                 |

## Roteiro manual

Ana (perfil 1) cria a sala; Bruno (perfil 2) entra pelo link. Ambos de fone.

1. **Entrar desligado**: ao entrar, o botão mostra `Ligar microfone`, os dois aparecem com 🔇 na
   lista e o navegador **não** pediu permissão (FR-001, FR-002).
2. **Ligar e ser ouvido**: Ana clica em `Ligar microfone` → navegador pede permissão → autoriza →
   botão vira `Desligar microfone`; em até 3 s as duas janelas mostram 🎤 para Ana. Ana fala →
   Bruno ouve; Ana não ouve a si mesma (US1, FR-006).
3. **Desligar**: Ana clica em `Desligar microfone` e continua falando → Bruno para de ouvir em até
   1 s; 🔇 nas duas janelas; o indicador de microfone do navegador da Ana apaga (FR-005, FR-015).
4. **Religar sem pergunta**: Ana liga de novo → liga sem nova pergunta (US1 cenário 5).
5. **Dois falando**: Ana e Bruno ligam → cada um ouve o outro.
6. **Quem chega depois**: com Ana falando, Carla (perfil 3) entra → ouve Ana sem fazer nada; a lista
   da Carla já mostra 🎤 para Ana (FR-007, US2 cenário 3).
7. **Recarregar**: Ana recarrega com o microfone ligado → volta à sala com 🔇; se aparecer
   `Ativar som`, clicar faz Ana voltar a ouvir Bruno; Ana liga o microfone e Bruno volta a ouvi-la
   (edge case, FR-013).
8. **Permissão negada**: no perfil do Bruno, bloqueie o microfone para `localhost` nas
   configurações do site e clique em `Ligar microfone` → mensagem de permissão (contracts/ui.md),
   botão continua `Ligar microfone`, Bruno segue ouvindo Ana e vendo a lista; Ana não vê erro
   (US3). Libere a permissão e clique de novo → liga e a mensagem some.
9. **Sem microfone / desconectar**: desconecte o microfone (ou escolha um inexistente nas
   configurações) e ligue → `Não encontramos nenhum microfone…`. Com o microfone ligado, desconecte
   um microfone USB → mensagem de desconexão e 🔇 para todos em até 3 s.
10. **Seis pessoas**: com 6 perfis, todos com microfone ligado → todos se ouvem sem cortes que
    impeçam entender (SC-006).

Textos esperados: [contracts/ui.md](contracts/ui.md). Contrato do protocolo:
[contracts/websocket.md](contracts/websocket.md).
