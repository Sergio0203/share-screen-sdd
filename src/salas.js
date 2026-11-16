import { gerarSegredo, idValido, segredosIguais } from "./ids.js";
import { normalizarNome } from "../public/js/nome.js";

// Registro das salas em memória (ver specs/002-entrar-sala-link/data-model.md).
// Ciclo de vida da sala: criada vazia → com participantes → vazia por `toleranciaMs` → expirada.
// O anfitrião é quem tem a chave `chaveAnfitriao`; ela pode passar para outra pessoa.
// `aoMudar(idSala)` avisa quem usa o registro que a lista de participantes mudou.
export function criarRegistroSalas({
  toleranciaMs = 60_000,
  capacidade = 6,
  esperaAnfitriaoMs = 10_000,
  agendar = agendarSemSegurarProcesso,
  cancelar = clearTimeout,
  aoMudar = () => {},
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
      existente.conexao = conexao;
      existente.nome = nomeNormalizado;
      aoMudar(idSala);
      return { participante: publico(existente), conexaoSubstituida };
    }

    if (sala.participantes.size >= capacidade) return { erro: "sala-cheia" };

    const participante = {
      id: gerarSegredo(),
      chave: idValido(chave) ? chave : gerarSegredo(),
      nome: nomeNormalizado,
      entradaEm: Date.now(),
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
    const participante = [...sala.participantes.values()].find((p) => p.conexao === conexao);
    // Conexão já substituída por outra aba: a pessoa continua na sala.
    if (!participante) return;

    sala.participantes.delete(participante.chave);
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
    }));
  }

  function conexoes(idSala) {
    const sala = salas.get(idSala);
    return sala ? [...sala.participantes.values()].map((p) => p.conexao) : [];
  }

  return { criar, consultar, entrar, sair, listar, conexoes };
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
