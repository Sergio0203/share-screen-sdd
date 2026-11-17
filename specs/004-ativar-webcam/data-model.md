# Data Model: T04 · Ativar a webcam

Estende o modelo da T03 ([../003-conversar-por-voz/data-model.md](../003-conversar-por-voz/data-model.md)).
Estado em memória no servidor; o vídeo em si nunca passa pelo servidor.

## Participante (alterado)

| Campo          | Tipo     | Regras                                                                  |
|----------------|----------|-------------------------------------------------------------------------|
| `cameraLigada` | booleano | **novo**; `false` ao entrar e ao ser substituído (FR-001); alterado só pela mensagem `camera` da própria conexão; independente de `microfoneLigado` (FR-009) |
| demais campos  |          | iguais à T03                                                            |

Item da lista pública (`participantes`): `{ id, nome, anfitriao, microfone, camera }`, onde
`camera = cameraLigada`.

### Estados da câmera (visão da sala)

```text
                 camera { ligada: true }
 DESLIGADA ─────────────────────────────────► LIGADA
   ▲  ▲                                          │
   │  └──── camera { ligada: false } ────────────┤
   │                                             │
   └──── conexão substituída (novo id) ◄─────────┘
         (sair remove o participante e o quadro)
```

## Registro de salas: regra nova

- `definirCamera(idSala, conexao, ligada)`: igual a `definirMicrofone` — localiza pela conexão;
  ignora conexão desconhecida ou substituída; chama `aoMudar(id)` só se o valor mudou.

## Lado do navegador (não persistido)

| Estado                    | Onde        | Descrição                                                    |
|---------------------------|-------------|--------------------------------------------------------------|
| `trilhaCamera`            | `midia.js`  | trilha de vídeo local; existe só com a câmera ligada          |
| `par.video`               | `midia.js`  | `<video muted>` com o vídeo recebido daquela pessoa           |
| `previaLocal`             | `midia.js`  | `<video muted>` com a própria imagem (espelhada por CSS)      |
| transceptores por par     | `midia.js`  | sempre dois: `audio` e `video`, `sendrecv`, localizados pelo tipo |

Nada de câmera vai para o `localStorage`.

## Quadros de vídeo (função pura)

`quadrosDeVideo(lista, idVoce, idsComFalha)` → `[{ id, nome, rotulo, ehVoce, falhou }]`:

- um item para cada participante com `camera: true`, na ordem da lista;
- `rotulo`: `nome` + `" (você)"` para a própria pessoa (FR-005);
- `falhou`: `true` se `id` está em `idsComFalha` e não é a própria pessoa (FR-013);
- quem tem `camera: false` não gera quadro (FR-006, FR-008).
