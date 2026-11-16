import { gerarSegredo, segredosIguais } from "./ids.js";

// Registro das salas em memória. Ciclo de vida (ver specs/001-criar-sala/data-model.md):
// criada vazia → ativa enquanto houver conexões → vazia por `toleranciaMs` → expirada.
export function criarRegistroSalas({
  toleranciaMs = 60_000,
  agendar = agendarSemSegurarProcesso,
  cancelar = clearTimeout,
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

  function criar() {
    let id = gerarSegredo();
    while (salas.has(id)) id = gerarSegredo();

    const sala = {
      id,
      tokenAnfitriao: gerarSegredo(),
      criadaEm: Date.now(),
      conexoes: new Set(),
      expiracao: null,
    };
    salas.set(id, sala);
    // Prazo para o criador conectar; sem isso, uma sala nunca aberta ficaria para sempre.
    agendarExpiracao(sala);
    return { id, tokenAnfitriao: sala.tokenAnfitriao };
  }

  function existe(id) {
    return salas.has(id);
  }

  function entrar(id, conexao, token) {
    const sala = salas.get(id);
    if (!sala) return null;
    cancelarExpiracao(sala);
    sala.conexoes.add(conexao);
    return { anfitriao: segredosIguais(token, sala.tokenAnfitriao) };
  }

  function sair(id, conexao) {
    const sala = salas.get(id);
    if (!sala) return;
    sala.conexoes.delete(conexao);
    if (sala.conexoes.size === 0) agendarExpiracao(sala);
  }

  return { criar, existe, entrar, sair };
}

// Uma expiração pendente não deve impedir o processo de encerrar (ex.: ao fim dos testes).
function agendarSemSegurarProcesso(callback, ms) {
  const temporizador = setTimeout(callback, ms);
  temporizador.unref();
  return temporizador;
}
