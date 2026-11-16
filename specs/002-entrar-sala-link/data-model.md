# Data Model: T02 · Entrar na sala pelo link

Estado em memória no servidor, estendendo a T01 ([../001-criar-sala/data-model.md](../001-criar-sala/data-model.md)).

## Sala (alterada)

| Campo               | Tipo                         | Regras                                                        |
|---------------------|------------------------------|---------------------------------------------------------------|
| `id`                | string (22 chars base64url)  | igual à T01                                                   |
| `chaveAnfitriao`    | string (22 chars base64url)  | **substitui `tokenAnfitriao`**; muda na transferência (FR-013) |
| `criadaEm`          | número (ms)                  | igual à T01                                                   |
| `participantes`     | `Map<chave, Participante>`   | ordem de inserção = ordem de entrada; tamanho ≤ **6** (FR-009) |
| `expiracao`         | temporizador ou nulo         | igual à T01: ativo só quando `participantes` está vazio (60 s) |
| `transferencia`     | temporizador ou nulo         | ativo só quando o anfitrião está ausente e há participantes (10 s) |

Constante: `CAPACIDADE = 6`. Invariante: no máximo um anfitrião (`chaveAnfitriao` é um valor só).

## Participante (novo)

| Campo        | Tipo                          | Regras                                                          |
|--------------|-------------------------------|-----------------------------------------------------------------|
| `chave`      | string (22 chars base64url)   | secreta; identifica o navegador nesta sala; nunca enviada a outros |
| `id`         | string (22 chars base64url)   | pública; gerada a cada entrada; usada na lista e para "(você)"  |
| `nome`       | string                        | `normalizarNome`: sem espaços nas pontas, 1–30 caracteres (FR-002) |
| `entradaEm`  | número (ms)                   | momento da entrada atual                                        |
| `conexao`    | conexão WebSocket             | exatamente uma por participante (ver substituição abaixo)       |

`anfitriao` não é armazenado: é `participante.chave === sala.chaveAnfitriao`.

## Regras de entrada (`entrar`)

1. Sala inexistente → `sala-inexistente`.
2. Nome inválido → `nome-invalido`.
3. Chave enviada já presente → **substitui** a conexão antiga (que recebe `aberta-em-outra-aba`);
   nome atualizado; não conta vaga nova.
4. Senão, sala com 6 participantes → `sala-cheia`.
5. Senão, cria participante (chave enviada se tiver formato válido, senão chave nova), cancela a
   expiração, reavalia o anfitrião, envia `entrou` e a lista para todos.

## Transições do anfitrião (FR-013, FR-014)

```text
           anfitrião sai e há outros na sala
 PRESENTE ─────────────────────────────────────► AUSENTE (transferência agendada: 10 s)
    ▲                                               │            │
    │  anfitrião volta (mesma chave) antes de 10 s  │            │ 10 s passam
    └───────────────────────────────────────────────┘            ▼
                                       chaveAnfitriao := chave do participante mais antigo
                                       → PRESENTE (novo anfitrião); lista enviada a todos
```

- Anfitrião ausente e sala vazia: nada é agendado; vale só a expiração de 60 s. Se alguém entra
  nesse período, a transferência de 10 s passa a correr.
- Anfitrião original que volta após a transferência entra como participante comum.

## Lado do navegador (`localStorage`)

| Chave             | Valor                    | Uso                                                     |
|-------------------|--------------------------|---------------------------------------------------------|
| `nomeExibicao`    | último nome usado        | preenche os campos de nome (FR-007, FR-011)             |
| `sala:<idSala>`   | `chave` do participante  | entrar direto ao recarregar; reconhecimento do anfitrião |

A chave `anfitriao:<idSala>` da T01 deixa de ser usada.
