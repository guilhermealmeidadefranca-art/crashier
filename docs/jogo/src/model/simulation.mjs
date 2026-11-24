import { avaliarPassagem } from './collision.mjs';

/** Estado e regras de corrida. Não conhece PixiJS, DOM nem áudio. */
export function criarSimulacao(regras, opcoes = {}) {
  const sorteio = opcoes.sorteio || Math.random;
  const jogadorX = opcoes.jogadorX ?? 150;
  const simulacao = {
    estado: regras.novaPartida(),
    obstaculos: [],
    distanciaPista: 0,
    tempoDesdeSpawn: 350,
    intervaloSpawn: regras.intervaloSpawn(0, sorteio),
    proximoId: 0,
    terminada: false
  };

  function reiniciar() {
    simulacao.estado = regras.novaPartida();
    simulacao.obstaculos.length = 0;
    simulacao.distanciaPista = 0;
    simulacao.tempoDesdeSpawn = 350;
    simulacao.intervaloSpawn = regras.intervaloSpawn(0, sorteio);
    simulacao.proximoId = 0;
    simulacao.terminada = false;
  }

  function acionar(acao, agora) {
    if (simulacao.terminada) return false;
    simulacao.estado = regras.aplicarAcao(simulacao.estado, acao, agora);
    return true;
  }

  function trocarFaixa(faixa, agora) {
    if (simulacao.terminada) return false;
    const antes = simulacao.estado;
    simulacao.estado = regras.trocarFaixa(antes, faixa, agora);
    return simulacao.estado !== antes;
  }

  function retomar(duracaoPausa) {
    const deslocamento = Math.max(0, Number(duracaoPausa) || 0);
    const estado = simulacao.estado;
    if (estado.acao) estado.acaoAte += deslocamento;
    if (estado.trocaFaixa) {
      simulacao.estado = { ...estado, trocaFaixa: {
        ...estado.trocaFaixa,
        inicio: estado.trocaFaixa.inicio + deslocamento,
        fim: estado.trocaFaixa.fim + deslocamento
      } };
    }
  }

  function avancar(deltaMs, agora) {
    if (simulacao.terminada) return [];
    const delta = Math.max(0, Math.min(40, Number(deltaMs) || 0));
    const dt = delta / 1000;
    simulacao.estado = regras.avancar(simulacao.estado, delta);
    simulacao.estado = regras.atualizarFaixa(simulacao.estado, agora);
    const deslocamento = 190 * simulacao.estado.velocidade * dt;
    simulacao.distanciaPista += deslocamento;
    simulacao.tempoDesdeSpawn += delta;
    if (simulacao.tempoDesdeSpawn >= simulacao.intervaloSpawn) {
      simulacao.tempoDesdeSpawn = 0;
      simulacao.obstaculos.push(regras.criarObstaculo(sorteio, ++simulacao.proximoId, simulacao.estado.distancia));
      simulacao.intervaloSpawn = regras.intervaloSpawn(simulacao.estado.distancia, sorteio);
    }

    const eventos = [];
    for (const obstaculo of simulacao.obstaculos) {
      obstaculo.x -= deslocamento;
      if (obstaculo.resolvido) continue;
      const passagem = avaliarPassagem(regras, simulacao.estado, obstaculo, agora, jogadorX);
      if (passagem.tipo === 'superado') {
        // Só marcamos depois do cálculo: resolverImpacto ignora objetos já resolvidos.
        obstaculo.resolvido = true;
        simulacao.estado = passagem.impacto.estado;
        eventos.push({
          tipo: passagem.impacto.quebrou ? 'caixa-quebrada' : 'obstaculo-superado',
          id: obstaculo.id,
          obstaculo,
          pontos: passagem.impacto.pontos,
          faixa: obstaculo.faixa
        });
      } else if (passagem.tipo === 'colisao') {
        simulacao.terminada = true;
        simulacao.estado = regras.terminar(simulacao.estado);
        eventos.push({ tipo: 'colisao', motivo: passagem.motivo, faixa: obstaculo.faixa });
        return eventos;
      }
    }

    for (let i = simulacao.obstaculos.length - 1; i >= 0; i--) {
      const o = simulacao.obstaculos[i];
      if (o.x < -regras.TIPOS[o.tipo].largura - 8) simulacao.obstaculos.splice(i, 1);
    }
    return eventos;
  }

  return { simulacao, reiniciar, acionar, trocarFaixa, retomar, avancar };
}
