import { gerarSegredo, idValido, segredosIguais } from "./ids.js";
import { normalizarNome } from "../public/js/nome.js";
import { normalizarTextoRecado, textoRecadoValido } from "../public/js/recados.js";

// Registro das salas em memória (ver specs/002-entrar-sala-link/data-model.md).
// Ciclo de vida da sala: criada vazia → com participantes → vazia por `toleranciaMs` → expirada.
// O anfitrião é quem tem a chave `chaveAnfitriao`; ela pode passar para outra pessoa.
// `aoMudar(idSala)` avisa quem usa o registro que a lista de participantes mudou.
// Recados (T07, alterados pela T08 — specs/008-recado-segue-cursor/data-model.md): no máximo um por
// pessoa, vivo enquanto o campo de quem escreve está aberto; some `duracaoRecadoMs` depois da última
// tecla; `aoMudarRecados(idSala)` avisa que a lista de recados mudou.
// `aoSair(idSala, idPublico)` avisa que um id público deixou a sala (saiu, caiu ou foi substituído
// por outra aba), para tirá-lo também do servidor de mídia (T10 research §4).
export function criarRegistroSalas({
  toleranciaMs = 60_000,
  capacidade = 6,
  esperaAnfitriaoMs = 10_000,
  agendar = agendarSemSegurarProcesso,
  cancelar = clearTimeout,
  aoMudar = () => {},
  duracaoRecadoMs = 8000,
  duracaoFadeMs = 1000,
  aoMudarRecados = () => {},
  aoSair = () => {},
} = {}) {
  const salas = new Map();

  function agendarExpiracao(sala) {
    sala.expiracao = agendar(() => salas.delete(sala.id), toleranciaMs);
  }

  function cancelarExpiracao(sala) {
    if (sala.expiracao === null) return;
    cancelar(sala.expiracao);
    sala.expiracao = null;
  }

  // Anfitrião fora da sala com outras pessoas presentes: depois de `esperaAnfitriaoMs`, o papel
  // passa para quem está há mais tempo (FR-013). Se ele volta antes, nada muda (FR-014).
  function reavaliarAnfitriao(sala) {
    const anfitriaoPresente = sala.participantes.has(sala.chaveAnfitriao);
    if (anfitriaoPresente || sala.participantes.size === 0) {
      cancelarTransferencia(sala);
      return;
    }
    if (sala.transferencia !== null) return;
    sala.transferencia = agendar(() => {
      sala.transferencia = null;
      const maisAntigo = sala.participantes.values().next().value;
      if (!maisAntigo || sala.participantes.has(sala.chaveAnfitriao)) return;
      sala.chaveAnfitriao = maisAntigo.chave;
      aoMudar(sala.id);
    }, esperaAnfitriaoMs);
  }

  function cancelarTransferencia(sala) {
    if (sala.transferencia === null) return;
    cancelar(sala.transferencia);
    sala.transferencia = null;
  }

  function criar() {
    let id = gerarSegredo();
    while (salas.has(id)) id = gerarSegredo();

    const sala = {
      id,
      chaveAnfitriao: gerarSegredo(),
      criadaEm: Date.now(),
      // Chave → participante. O Map mantém a ordem de inserção, que é a ordem de entrada.
      participantes: new Map(),
      expiracao: null,
      transferencia: null,
      // Cresce a cada compartilhamento iniciado: define qual é o mais recente (T05).
      contadorCompartilhamentos: 0,
      // Id → recado ativo, na ordem da última tecla (o último é desenhado por cima, T08 FR-010).
      recados: new Map(),
    };
    salas.set(id, sala);
    // Prazo para o criador conectar; sem isso, uma sala nunca aberta ficaria para sempre.
    agendarExpiracao(sala);
    return { id, chave: sala.chaveAnfitriao };
  }

  function entrar(idSala, { chave, nome, conexao }) {
    const sala = salas.get(idSala);
    if (!sala) return { erro: "sala-inexistente" };

    const nomeNormalizado = normalizarNome(nome);
    if (nomeNormalizado === null) return { erro: "nome-invalido" };

    // Mesma chave já presente (recarregar ou outra aba): a conexão nova assume o lugar da antiga.
    const existente = idValido(chave) ? sala.participantes.get(chave) : undefined;
    if (existente) {
      const conexaoSubstituida = existente.conexao;
      // A página antiga deixa de compartilhar e de escrever: os recados ligados a ela somem.
      removerRecadosDe(salas.get(idSala), existente.id);
      existente.conexao = conexao;
      existente.nome = nomeNormalizado;
      // O id antigo deixa de valer, inclusive no servidor de mídia.
      aoSair(idSala, existente.id);
      // Id público novo: a página nova não tem as conexões de voz antigas, e quem vê o id antigo
      // sumir e o novo aparecer refaz a conexão sozinho (T03, research §5).
      existente.id = gerarSegredo();
      // Toda entrada começa com microfone e câmera desligados, inclusive ao recarregar (FR-001).
      existente.microfoneLigado = false;
      existente.cameraLigada = false;
      existente.tela = null;
      existente.assistindo = null;
      aoMudar(idSala);
      return { participante: publico(existente), conexaoSubstituida };
    }

    if (sala.participantes.size >= capacidade) return { erro: "sala-cheia" };

    const participante = {
      id: gerarSegredo(),
      chave: idValido(chave) ? chave : gerarSegredo(),
      nome: nomeNormalizado,
      entradaEm: Date.now(),
      microfoneLigado: false,
      cameraLigada: false,
      // null ou { inicio, som } enquanto compartilha a tela.
      tela: null,
      // Id público do compartilhamento que a pessoa tem em destaque, ou null.
      assistindo: null,
      conexao,
    };
    sala.participantes.set(participante.chave, participante);
    cancelarExpiracao(sala);
    reavaliarAnfitriao(sala);
    aoMudar(idSala);
    return { participante: publico(participante), conexaoSubstituida: null };
  }

  function sair(idSala, conexao) {
    const sala = salas.get(idSala);
    if (!sala) return;
    const participante = participantePorConexao(idSala, conexao);
    // Conexão já substituída por outra aba: a pessoa continua na sala.
    if (!participante) return;

    sala.participantes.delete(participante.chave);
    removerRecadosDe(sala, participante.id);
    aoSair(idSala, participante.id);
    if (sala.participantes.size === 0) agendarExpiracao(sala);
    reavaliarAnfitriao(sala);
    aoMudar(idSala);
  }

  function consultar(idSala) {
    const sala = salas.get(idSala);
    if (!sala) return null;
    return { cheia: sala.participantes.size >= capacidade };
  }

  function listar(idSala) {
    const sala = salas.get(idSala);
    if (!sala) return null;
    return [...sala.participantes.values()].map((p) => ({
      id: p.id,
      nome: p.nome,
      anfitriao: segredosIguais(p.chave, sala.chaveAnfitriao),
      microfone: p.microfoneLigado,
      camera: p.cameraLigada,
      tela: p.tela && { inicio: p.tela.inicio, som: p.tela.som },
      assistindo: p.assistindo,
    }));
  }

  // Microfone e câmera seguem a mesma regra; `campo` é "microfoneLigado" ou "cameraLigada".
  function definirEstado(idSala, conexao, campo, valor) {
    const participante = participantePorConexao(idSala, conexao);
    // Conexão já substituída ou fora da sala: o estado de quem está na sala não muda.
    if (!participante || participante[campo] === valor) return;
    participante[campo] = valor;
    aoMudar(idSala);
  }

  function definirMicrofone(idSala, conexao, ligado) {
    definirEstado(idSala, conexao, "microfoneLigado", ligado);
  }

  function definirCamera(idSala, conexao, ligada) {
    definirEstado(idSala, conexao, "cameraLigada", ligada);
  }

  function definirAssistindo(idSala, conexao, idPublico) {
    definirEstado(idSala, conexao, "assistindo", idPublico);
  }

  // Ver specs/005-compartilhar-tela/data-model.md ("definirTela").
  function definirTela(idSala, conexao, { compartilhando, som }) {
    const participante = participantePorConexao(idSala, conexao);
    if (!participante) return;
    if (!compartilhando) {
      if (participante.tela === null) return;
      participante.tela = null;
      removerRecados(salas.get(idSala), (recado) => recado.alvo === participante.id);
    } else if (participante.tela === null) {
      const sala = salas.get(idSala);
      participante.tela = { inicio: ++sala.contadorCompartilhamentos, som };
    } else if (participante.tela.som !== som) {
      participante.tela.som = som;
    } else {
      return;
    }
    aoMudar(idSala);
  }

  // ---------- Recados (T07) ----------

  // Quem saiu (ou recarregou): somem os recados sobre a tela dela e o recado dela (T08 research §6).
  function removerRecadosDe(sala, idPublico) {
    removerRecados(sala, (recado) => recado.alvo === idPublico || recado.autor === idPublico);
  }

  function removerRecados(sala, deveSair) {
    let mudou = false;
    for (const recado of [...sala.recados.values()]) {
      if (!deveSair(recado)) continue;
      cancelar(recado.vence);
      sala.recados.delete(recado.id);
      mudou = true;
    }
    if (mudou) aoMudarRecados(sala.id);
  }

  // Duas etapas num só temporizador (T08 research §4): `duracaoRecadoMs` depois da última tecla o
  // recado passa a `apagando` (fade de 1 s em todos os navegadores ao mesmo tempo); `duracaoFadeMs`
  // depois, sai da lista.
  function reagendarRecado(sala, recado) {
    if (recado.vence !== null) cancelar(recado.vence);
    recado.vence = agendar(() => {
      recado.apagando = true;
      recado.vence = agendar(() => {
        sala.recados.delete(recado.id);
        aoMudarRecados(sala.id);
      }, duracaoFadeMs);
      aoMudarRecados(sala.id);
    }, duracaoRecadoMs);
  }

  // Cada pessoa tem no máximo um recado (T08 FR-009).
  function recadoDe(sala, idPublico) {
    return [...sala.recados.values()].find((r) => r.autor === idPublico) ?? null;
  }

  const fracaoValida = (valor) => Number.isFinite(valor) && valor >= 0 && valor <= 1;

  // Entradas inválidas são ignoradas sem erro: podem vir de uma corrida normal (a tela acabou de
  // parar) e nada inválido deve aparecer para ninguém (research §9).
  function escreverRecado(idSala, conexao, { alvo, x, y, texto }) {
    const sala = salas.get(idSala);
    const autor = participantePorConexao(idSala, conexao);
    if (!sala || !autor || !textoRecadoValido(texto)) return;
    const alvoCompartilha = [...sala.participantes.values()].some(
      (p) => p.id === alvo && p.tela !== null,
    );
    if (!alvoCompartilha) return;

    let recado = recadoDe(sala, autor.id);
    if (recado !== null && recado.alvo !== alvo) {
      removerRecados(sala, (r) => r === recado);
      recado = null;
    }
    if (recado === null) {
      if (!fracaoValida(x) || !fracaoValida(y)) return;
      // O nome é copiado agora, como na lista de participantes no momento em que o recado nasce.
      recado = {
        id: gerarSegredo(),
        autor: autor.id,
        nome: autor.nome,
        alvo,
        x,
        y,
        texto: "",
        apagando: false,
        vence: null,
      };
      sala.recados.set(recado.id, recado);
    }
    recado.texto = normalizarTextoRecado(texto);
    recado.apagando = false;
    // Reinserir leva o recado ao fim do Map: a lista fica na ordem da última tecla.
    sala.recados.delete(recado.id);
    sala.recados.set(recado.id, recado);
    reagendarRecado(sala, recado);
    aoMudarRecados(idSala);
  }

  // O cursor de quem escreve se moveu (T08): só o ponto muda; o prazo conta só as teclas (FR-006).
  function moverRecado(idSala, conexao, { x, y }) {
    const sala = salas.get(idSala);
    const autor = participantePorConexao(idSala, conexao);
    const recado = sala && autor ? recadoDe(sala, autor.id) : null;
    if (recado === null || !fracaoValida(x) || !fracaoValida(y)) return;
    recado.x = x;
    recado.y = y;
    aoMudarRecados(idSala);
  }

  // Esc: o recado some na hora para todos.
  function apagarRecado(idSala, conexao) {
    const sala = salas.get(idSala);
    const autor = participantePorConexao(idSala, conexao);
    const recado = sala && autor ? recadoDe(sala, autor.id) : null;
    if (recado === null) return;
    removerRecados(sala, (r) => r === recado);
  }

  // O nome vem do servidor (não de quem escreveu a mensagem); o prazo interno não sai daqui.
  function listarRecados(idSala) {
    const sala = salas.get(idSala);
    if (!sala) return null;
    return [...sala.recados.values()].map(({ id, autor, nome, alvo, x, y, texto, apagando }) => ({
      id,
      autor,
      nome,
      alvo,
      x,
      y,
      texto,
      apagando,
    }));
  }

  function participantePorConexao(idSala, conexao) {
    const sala = salas.get(idSala);
    if (!sala) return null;
    return [...sala.participantes.values()].find((p) => p.conexao === conexao) ?? null;
  }

  // O id público está na sala agora? (aviso de entrada no servidor de mídia, T10)
  function participanteNaSala(idSala, idPublico) {
    const sala = salas.get(idSala);
    if (!sala) return false;
    return [...sala.participantes.values()].some((p) => p.id === idPublico);
  }

  // Id público e nome atuais de quem usa a conexão; null se ela já foi substituída por outra aba.
  // Usado para emitir a permissão de mídia (T10).
  function participantePublicoPorConexao(idSala, conexao) {
    const participante = participantePorConexao(idSala, conexao);
    return participante && { id: participante.id, nome: participante.nome };
  }

  function conexoes(idSala) {
    const sala = salas.get(idSala);
    return sala ? [...sala.participantes.values()].map((p) => p.conexao) : [];
  }

  return {
    criar,
    consultar,
    entrar,
    sair,
    listar,
    conexoes,
    definirMicrofone,
    definirCamera,
    definirTela,
    definirAssistindo,
    participantePublicoPorConexao,
    participanteNaSala,
    escreverRecado,
    moverRecado,
    apagarRecado,
    listarRecados,
  };
}

function publico({ id, chave }) {
  return { id, chave };
}

// Uma expiração pendente não deve impedir o processo de encerrar (ex.: ao fim dos testes).
function agendarSemSegurarProcesso(callback, ms) {
  const temporizador = setTimeout(callback, ms);
  temporizador.unref();
  return temporizador;
}
