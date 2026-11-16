<!--
Sync Impact Report
==================
Version change: (template, sem versão) → 1.0.0
Princípios definidos (primeira ratificação):
  - [PRINCIPLE_1_NAME] → I. Simplicidade Primeiro
  - [PRINCIPLE_2_NAME] → II. Código Legível
  - [PRINCIPLE_3_NAME] → III. Testes para a Lógica Principal
  - [PRINCIPLE_4_NAME] → IV. Mensagens de Erro Claras em pt-BR
  - [PRINCIPLE_5_NAME] → V. Interface em pt-BR
Seções adicionadas:
  - Restrições do Projeto (SECTION_2)
  - Fluxo de Desenvolvimento (SECTION_3)
  - Governança (preenchida)
Seções removidas: nenhuma
Templates dependentes: não modificados por este comando (leem a constituição em tempo de execução).
TODOs pendentes: nenhum.
-->

# Share Screen Constitution

## Core Principles

### I. Simplicidade Primeiro

Toda funcionalidade MUST ser implementada com a solução mais simples que cumpra seus critérios de
aceite.

- Nenhuma dependência, camada, abstração ou serviço MAY ser adicionado sem que um critério de
  aceite concreto o exija.
- Funcionalidades "para o futuro" (YAGNI) MUST NOT ser implementadas antes de serem especificadas.
- Quando houver duas soluções que atendem aos critérios, a com menos partes móveis MUST ser
  escolhida; qualquer exceção MUST ser justificada na seção de complexidade do plano.

**Racional**: o público é um grupo pequeno de amigos; complexidade extra aumenta o custo de
manutenção sem trazer valor perceptível.

### II. Código Legível

O código MUST ser escrito para ser lido por outra pessoa sem explicação oral.

- Nomes de variáveis, funções e arquivos MUST descrever sua intenção; abreviações obscuras MUST NOT
  ser usadas.
- Funções MUST ter uma responsabilidade clara; lógica aninhada profunda SHOULD ser extraída em
  funções nomeadas.
- Comentários MUST explicar o "porquê" quando não for óbvio, não repetir o "o quê".
- Formatação MUST seguir um formatador/linter automático configurado no projeto.

**Racional**: código legível reduz erros e torna as revisões e evoluções rápidas.

### III. Testes para a Lógica Principal

A lógica principal da aplicação MUST ter testes automatizados.

- Considera-se lógica principal: criação e entrada em sessões de compartilhamento, sinalização e
  gerenciamento de conexões, controle de participantes e tratamento de erros dessas operações.
- Todo critério de aceite ligado à lógica principal MUST ser coberto por ao menos um teste.
- Todos os testes MUST passar antes de uma mudança ser integrada à branch principal.
- Código puramente de apresentação (estilos, layout) MAY dispensar testes automatizados.

**Racional**: concentrar testes onde as falhas mais prejudicam o uso mantém a confiança sem
sacrificar a simplicidade.

### IV. Mensagens de Erro Claras em pt-BR

Toda mensagem de erro exibida ao usuário MUST estar em português do Brasil e ser compreensível por
uma pessoa sem conhecimento técnico.

- A mensagem MUST dizer o que aconteceu e, quando possível, o que o usuário pode fazer a seguir
  (ex.: "Não foi possível acessar sua tela. Verifique a permissão do navegador e tente novamente.").
- Códigos de erro, stack traces e termos técnicos internos MUST NOT ser exibidos ao usuário.
- Falhas MUST NOT ser silenciosas: todo erro que impede uma ação do usuário MUST gerar uma mensagem
  visível.

**Racional**: os usuários são amigos, não técnicos; erros claros evitam frustração e pedidos de
suporte.

### V. Interface em pt-BR

Todo texto visível na interface MUST estar em português do Brasil.

- Rótulos, botões, títulos, dicas, estados vazios e notificações MUST usar pt-BR com linguagem
  simples e consistente.
- Datas, horas e números exibidos MUST seguir as convenções brasileiras.
- Textos em outros idiomas MUST NOT aparecer na interface, exceto nomes próprios e textos gerados
  pelo próprio navegador fora do controle da aplicação.

**Racional**: o público-alvo fala português; uma interface consistente no idioma reduz atrito.

## Restrições do Projeto

- O produto é uma aplicação web acessada pelo navegador; o usuário MUST NOT precisar instalar
  software adicional para compartilhar ou assistir a uma tela.
- O escopo é o compartilhamento de tela entre amigos (grupos pequenos); requisitos de escala
  corporativa MUST NOT ser assumidos sem especificação explícita.
- Escolhas de tecnologia MUST ser registradas e justificadas no plano de cada funcionalidade,
  respeitando o Princípio I.

## Fluxo de Desenvolvimento

- Cada funcionalidade MUST seguir o fluxo Spec Kit: especificação → plano → tarefas →
  implementação.
- Toda especificação MUST conter critérios de aceite verificáveis; eles são a referência para o
  Princípio I (simplicidade) e o Princípio III (testes).
- O plano de cada funcionalidade MUST conter uma verificação explícita de conformidade com esta
  constituição antes da implementação.
- Revisões de código MUST verificar: simplicidade, legibilidade, testes da lógica principal e
  textos/mensagens em pt-BR.

## Governance

- Esta constituição prevalece sobre quaisquer outras práticas do projeto. Em caso de conflito, ela
  MUST ser seguida ou formalmente emendada.
- Emendas MUST ser feitas via `/speckit-constitution`, documentando a mudança e o motivo.
- Versionamento semântico:
  - MAJOR: remoção ou redefinição incompatível de princípios ou regras de governança.
  - MINOR: novo princípio ou seção, ou ampliação material de orientações.
  - PATCH: esclarecimentos, ajustes de redação e correções sem mudança de significado.
- A conformidade MUST ser verificada no plano de cada funcionalidade e em cada revisão de código;
  qualquer violação MUST ser justificada explicitamente ou corrigida.

**Version**: 1.0.0 | **Ratified**: 2026-11-16 | **Last Amended**: 2026-11-16
