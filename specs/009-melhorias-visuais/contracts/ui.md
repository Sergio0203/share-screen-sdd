# Contrato de Interface (versão T09)

Altera a aparência de todas as telas de
[../../008-recado-segue-cursor/contracts/ui.md](../../008-recado-segue-cursor/contracts/ui.md) e
anteriores. **Nenhum texto existente muda.** Comportamentos não citados aqui continuam iguais.

## Textos novos

| Onde | Texto |
|------|-------|
| Cabeçalho (todas as telas) e título da aba | `Telão` |
| Página inicial, acima do campo de nome | `Compartilhe sua tela com os amigos, com voz e câmera.` |

## Cabeçalho

| Elemento | Comportamento |
|----------|---------------|
| Logo + "Telão" | Topo de todas as telas, alinhado à esquerda, altura ≤ 3,5 rem; não é clicável |
| Tela cheia | Não aparece (só a imagem e os recados) |

## Controles da sala (barra fixa no rodapé, centralizada)

Só ícone. O nome é o `aria-label` do controle e aparece numa dica acima dele ao passar o mouse ou
focar com teclado.

| Controle | Ícone desligado → ligado | Nome (dica / leitor de tela) | Aparência ligado |
|----------|--------------------------|------------------------------|------------------|
| Microfone | `microfone-desligado` → `microfone` | `Ligar microfone` / `Desligar microfone` | fundo `--vermelho` |
| Câmera | `camera-desligada` → `camera` | `Ligar câmera` / `Desligar câmera` | fundo `--vermelho` |
| Compartilhar | `monitor` → `monitor-parar` | `Compartilhar tela` / `Parar de compartilhar` | fundo `--vermelho` |
| Qualidade | `qualidade` | `Qualidade do compartilhamento` | — (abre o menu nativo) |
| Ativar som | `som` + texto `Ativar som` visível | `Ativar som` | fundo `--vermelho`, pulso suave enquanto visível |

| Estado | Aparência |
|--------|-----------|
| Esperando (pedido do navegador) | ícone `carregando` girando; nome = `Ligando microfone…` / `Ligando câmera…` / `Escolhendo o que compartilhar…` |
| Indisponível (sem suporte a compartilhar) | ícone a 40% de opacidade, cursor "não permitido", aviso `semSuporteCompartilhar` continua visível |
| Hover / foco / clique | fundo mais claro (desligado) ou `--vermelho-forte` (ligado); anel de foco branco; `scale(.96)` no clique |

## Outros botões (ícone + texto)

| Botão | Ícone | Estilo |
|-------|-------|--------|
| Criar sala / Entrar na sala | `seta-direita` (depois do texto) | principal (`--degrade-principal`) |
| Criar nova sala / Tentar de novo | `recarregar` | principal |
| Copiar link | `copiar` | secundário; com `.destaque` (cópia automática falhou) vira principal com pulso |
| Tela cheia (sobre a imagem) | `tela-cheia`, **só ícone**, dica `Tela cheia` | secundário translúcido escuro |
| Miniatura "Ver a tela de X" | `monitor` + rótulo | secundário |

Criando sala: ícone `carregando` antes do texto `Criando sala…`.

## Sala — áreas

| Largura | Disposição |
|---------|------------|
| ≥ 1024 px | topo (título, anfitrião, link) · palco (destaque, miniaturas, qualidade ativa) à esquerda · lateral 20 rem (câmeras em 1 coluna, lista) |
| 480–1023 px | empilhado: topo, palco, câmeras (2 colunas), lista |
| < 480 px | empilhado, câmeras em 1 coluna |

Sempre: barra de controles fixa no rodapé; conteúdo com espaço inferior para não ficar atrás dela;
sem rolagem horizontal.

## Quadros de vídeo (altera a T04)

| Situação | Conteúdo |
|----------|----------|
| Câmera ligada | vídeo (próprio espelhado, como hoje) |
| Câmera desligada | avatar: círculo com a inicial sobre `--degrade-principal`, centralizado |
| Falha | mensagem atual, com ícone `alerta` |

Legenda com o nome (e "(você)") em todos os casos. Entrada/saída e troca vídeo ↔ avatar animadas.

## Lista de participantes

Cada item: ícones de microfone e câmera (estado), nome com `coroa` para o anfitrião e `monitor`
para quem compartilha. Nomes e rótulos para leitor de tela inalterados.

## Mensagens

Aviso flutuante no topo central, sobre o conteúdo (não empurra a página).

| Tipo | Quando | Aparência |
|------|--------|-----------|
| sucesso | mensagens temporárias (ex.: `Link copiado!`) | ícone `sucesso`, borda `--sucesso` |
| erro | demais mensagens | ícone `alerta`, borda `--vermelho` |

## Recados (T07/T08)

| Elemento | Muda |
|----------|------|
| Balão | fundo `--superficie` a 92% de opacidade, borda `--borda`, cantos 0,6 rem, sombra |
| Nome do autor | cor `--vermelho-claro` |
| Campo de quem escreve | fundo `--superficie-alta`, borda `--vermelho` no foco |
| Movimento, fade, limites, ordem | **inalterados** (T08) |

## Movimento

Durações e curvas: [research.md §5](../research.md#5-animações-e-fluidez). Com
`prefers-reduced-motion: reduce`: sem deslocamento nem escala; só mudanças de opacidade ≤ 150 ms
(o fade de 1 s do recado continua).
