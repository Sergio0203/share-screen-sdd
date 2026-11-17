# Data Model: T05 · Compartilhar a tela

Estende o modelo da T04 ([../004-ativar-webcam/data-model.md](../004-ativar-webcam/data-model.md)).
Estado em memória no servidor; a imagem e o som da tela nunca passam pelo servidor.

## Sala (alterada)

| Campo                  | Tipo   | Regras                                                              |
|------------------------|--------|---------------------------------------------------------------------|
| `contadorCompartilhamentos` | número | **novo**; começa em 0; +1 a cada compartilhamento iniciado na sala |

## Participante (alterado)

| Campo        | Tipo                              | Regras                                                         |
|--------------|-----------------------------------|----------------------------------------------------------------|
| `tela`       | `null` \| `{ inicio, som }`       | **novo**; `null` ao entrar e na substituição (FR-001); `inicio` = valor do contador da sala no momento em que começou; `som` booleano informado pelo cliente; no máximo um por participante |
| `assistindo` | `null` \| string (id público)     | **novo**; qual compartilhamento a pessoa tem em destaque; `null` ao entrar e na substituição; não é validado contra a lista (pode apontar para quem acabou de sair) |

Item da lista pública (`participantes`):
`{ id, nome, anfitriao, microfone, camera, tela, assistindo }`.

### Estados do compartilhamento (visão da sala)

```text
                  tela { compartilhando: true, som }
 SEM COMPARTILHAR ─────────────────────────────────► COMPARTILHANDO { inicio = ++contador, som }
   ▲  ▲                                                   │
   │  └──── tela { compartilhando: false } ───────────────┤
   │                                                      │
   └──── conexão substituída (novo id) ◄──────────────────┘
         (sair remove o participante)
```

Começar de novo enquanto já compartilha (`compartilhando: true` repetido) **não** muda `inicio` nem
avisa, a não ser que `som` mude.

## Registro de salas: regras novas

- `definirTela(idSala, conexao, { compartilhando, som })`: localiza pela conexão (ignora
  desconhecida/substituída). `compartilhando: false` → `tela = null`. `true` sem `tela` →
  `tela = { inicio: ++sala.contadorCompartilhamentos, som }`. `true` com `tela` → só atualiza `som`.
  `aoMudar(id)` só se algo mudou.
- `definirAssistindo(idSala, conexao, idPublico | null)`: igual ao padrão de `definirEstado`;
  `aoMudar(id)` só se mudou.

## Lado do navegador (não persistido)

| Estado               | Onde           | Descrição                                                        |
|----------------------|----------------|------------------------------------------------------------------|
| `trilhaTela`, `trilhaSomTela` | `midia.js` | trilhas da captura; existem só enquanto compartilha            |
| canais por par       | `midia.js`     | `CANAIS = ["microfone", "camera", "telaVideo", "telaAudio"]`, por posição |
| `par.tela`           | `midia.js`     | `{ video, audio }` recebidos daquela pessoa no canal da tela      |
| `escolha`            | `app.js`       | id escolhido por clique, ou `null`; esquecido quando aquele compartilhamento termina |
| destaque enviado     | `app.js`       | último `assistindo` enviado, para só reenviar quando mudar        |

### Destaque (função pura `escolherDestaque`)

`escolherDestaque(lista, idVoce, escolha)` → `{ destaque, miniaturas }`, com itens
`{ id, nome, som, inicio }`:

1. compartilhamentos = itens com `tela !== null` e `id !== idVoce`;
2. `destaque` = o de id `escolha`, se existir; senão o de maior `inicio`; `null` se não houver;
3. `miniaturas` = os demais, por `inicio` decrescente.

### Envio da tela (quem compartilha)

Para cada par `p` na lista: canal `telaVideo`/`telaAudio` recebe a trilha da tela se
`p.assistindo === meuId` e eu estou compartilhando; senão `null`.
