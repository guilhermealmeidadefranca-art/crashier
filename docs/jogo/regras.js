/* Regras puras do endless runner Crashier. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Regras = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BIOMAS = [
    { id: 'bairro', nome: 'BAIRRO', paleta: ['#1a1530', '#392556', '#a855f7'] },
    { id: 'rodovia', nome: 'RODOVIA', paleta: ['#111827', '#24364d', '#f97316'] },
    { id: 'parque', nome: 'PARQUE', paleta: ['#14251f', '#24533c', '#84cc16'] },
    { id: 'floresta', nome: 'FLORESTA', paleta: ['#101d20', '#1b423c', '#22c55e'] }
  ];
  const TIPOS = {
    poça: { acao: 'baixo', pontos: 50, largura: 28, altura: 8, emoji: '≈' },
    cone: { acao: 'baixo', pontos: 50, largura: 18, altura: 28, emoji: '▲' },
    carro: { acao: 'alto', pontos: 75, largura: 56, altura: 37, emoji: 'CAR' },
    caminhão: { acao: 'alto', pontos: 100, largura: 74, altura: 49, emoji: 'TRUCK' },
    cerca: { acao: 'deslizar', pontos: 75, largura: 58, altura: 37, emoji: 'FENCE' },
    mesa: { acao: 'deslizar', pontos: 75, largura: 68, altura: 43, emoji: 'TABLE' },
    galho: { acao: 'deslizar', pontos: 60, largura: 60, altura: 20, emoji: 'BRANCH' },
    caixa: { acao: 'rolar', pontos: 120, largura: 30, altura: 30, emoji: 'CRATE' }
  };
  const POR_BIOMA = {
    bairro: ['poça', 'cone', 'carro', 'mesa', 'caixa'],
    rodovia: ['cone', 'carro', 'caminhão', 'cerca', 'caixa'],
    parque: ['poça', 'cone', 'galho', 'cerca', 'caixa'],
    floresta: ['poça', 'galho', 'cerca', 'caixa', 'carro']
  };
  // Janelas mais longas deixam o tempo de resposta confortável no celular.
  const DURACAO_ACAO = { baixo: 850, alto: 1100, deslizar: 900, rolar: 850 };

  function biomaEm(distancia) {
    return BIOMAS[Math.floor(Math.max(0, distancia) / 1200) % BIOMAS.length];
  }
  function novaPartida() {
    return { distancia: 0, pontos: 0, bonus: 0, velocidade: 1, terminou: false, acao: '', acaoAte: 0, obstaculos: 0 };
  }
  function criarObstaculo(sorteio, id, distancia) {
    const aleatorio = typeof sorteio === 'function' ? sorteio : Math.random;
    const bioma = biomaEm(distancia).id;
    const lista = POR_BIOMA[bioma];
    const tipo = lista[Math.min(lista.length - 1, Math.floor(aleatorio() * lista.length))];
    return { id, tipo, bioma, x: 500, resolvido: false };
  }
  function aplicarAcao(estado, acao, agora) {
    if (estado.terminou || !DURACAO_ACAO[acao]) return estado;
    return { ...estado, acao, acaoAte: agora + DURACAO_ACAO[acao] };
  }
  function podeSuperar(estado, obstaculo, agora) {
    if (estado.terminou || !obstaculo) return false;
    const regra = TIPOS[obstaculo.tipo];
    return Boolean(regra && estado.acao === regra.acao && agora <= estado.acaoAte);
  }
  function avancar(estado, deltaMs) {
    if (estado.terminou) return estado;
    const delta = Math.max(0, Math.min(100, Number(deltaMs) || 0));
    const distancia = estado.distancia + delta * (0.012 + estado.distancia / 100000);
    return { ...estado, distancia, pontos: Math.floor(distancia) + estado.bonus, velocidade: Math.min(3, 1 + distancia / 900) };
  }
  function resolverImpacto(estado, obstaculo, agora) {
    if (estado.terminou || !obstaculo || obstaculo.resolvido) return { estado, sucesso: false, ignorado: true };
    const regra = TIPOS[obstaculo.tipo];
    if (!regra) return { estado, sucesso: false, ignorado: true };
    if (estado.acao !== regra.acao || agora > estado.acaoAte) {
      return { estado: { ...estado, terminou: true, pontos: Math.floor(estado.distancia) + estado.bonus }, sucesso: false, motivo: obstaculo.tipo };
    }
    return {
      estado: { ...estado, bonus: estado.bonus + regra.pontos, pontos: Math.floor(estado.distancia) + estado.bonus + regra.pontos, obstaculos: estado.obstaculos + 1, acao: '' },
      sucesso: true, pontos: regra.pontos, quebrou: obstaculo.tipo === 'caixa'
    };
  }
  function terminar(estado) { return estado.terminou ? estado : { ...estado, terminou: true }; }

  return { BIOMAS, TIPOS, DURACAO_ACAO, biomaEm, novaPartida, criarObstaculo, aplicarAcao, podeSuperar, avancar, resolverImpacto, terminar };
});
