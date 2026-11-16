# Data Model: T01 · Criar uma sala

Todo o estado vive em memória no servidor (ver [research.md](research.md) §2). Não há persistência.

## Sala

| Campo            | Tipo                      | Regras                                                                 |
|------------------|---------------------------|------------------------------------------------------------------------|
| `id`             | string (22 chars base64url) | 128 bits aleatórios; único entre as salas existentes (FR-003, FR-004) |
| `tokenAnfitriao` | string (22 chars base64url) | 128 bits aleatórios; nunca enviado a quem não criou a sala (FR-015)  |
| `criadaEm`       | número (ms desde epoch)    | definido na criação                                                   |
| `conexoes`       | conjunto de conexões       | quem está na sala agora; o tamanho é o número de pessoas presentes   |
| `expiracao`      | temporizador ou nulo       | ativo somente quando `conexoes` está vazio                             |

O link da sala é derivado, não armazenado: `<origem>/sala/<id>`.

Cada sala tem exatamente um anfitrião, identificado pela posse do `tokenAnfitriao`.

## Estados e transições (FR-014)

```text
            criar
  (nada) ─────────► VAZIA ──(60 s sem ninguém)──► EXPIRADA (removida do registro)
                     │  ▲
     1ª pessoa entra │  │ última pessoa sai
                     ▼  │
                    ATIVA
```

- **criar** → estado `VAZIA` com expiração agendada para 60 s (prazo para o criador conectar).
- **VAZIA → ATIVA**: uma conexão entra; a expiração é cancelada.
- **ATIVA → ATIVA**: entradas e saídas enquanto restar ao menos 1 pessoa.
- **ATIVA → VAZIA**: a última conexão fecha; a expiração é agendada para 60 s.
- **VAZIA → EXPIRADA**: o prazo vence; a sala é removida e o id deixa de ser reconhecido.

## Lado do navegador

| Chave no `localStorage`    | Valor            | Uso                                                 |
|----------------------------|------------------|-----------------------------------------------------|
| `anfitriao:<idSala>`       | `tokenAnfitriao` | enviado ao entrar na sala para ser reconhecido como anfitrião |

## Validações

- `id` recebido em rotas/mensagens deve casar com `^[A-Za-z0-9_-]{22}$`; fora disso, tratado como sala
  inexistente.
- Comparação de `tokenAnfitriao` em tempo constante (`crypto.timingSafeEqual`).
