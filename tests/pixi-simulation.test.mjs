import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { criarSimulacao } from '../docs/jogo/src/model/simulation.mjs';

const require = createRequire(import.meta.url);
const regras = require('../docs/jogo/regras.js');

function corridaFake() {
  const sequencia = [0, .99, 0, .99, 0, .99];
  let indice = 0;
  return criarSimulacao(regras, { sorteio: () => sequencia[indice++ % sequencia.length] });
}

test('simulação mantém rotas diferentes e troca suavemente', () => {
  const corrida = corridaFake();
  assert.equal(corrida.trocarFaixa('superior', 100), true);
  assert.equal(regras.faixaEm(corrida.simulacao.estado, 200), 'inferior');
  assert.equal(regras.faixaEm(corrida.simulacao.estado, 350), 'superior');
  corrida.retomar(1000);
  assert.equal(regras.faixaEm(corrida.simulacao.estado, 1350), 'superior');
});

test('obstáculo em outra rota não causa colisão', () => {
  const corrida = corridaFake();
  corrida.simulacao.obstaculos.push({ id: 90, tipo: 'caixa', faixa: 'superior', x: 140, resolvido: false });
  assert.deepEqual(corrida.avancar(16, 500), []);
  assert.equal(corrida.simulacao.terminada, false);
});

test('rolagem correta quebra a caixa e concede os pontos uma única vez', () => {
  const corrida = corridaFake();
  corrida.simulacao.obstaculos.push({ id: 91, tipo: 'caixa', faixa: 'inferior', x: 175, resolvido: false });
  corrida.acionar('rolar', 100);
  const eventos = corrida.avancar(16, 116);
  assert.equal(eventos[0].tipo, 'caixa-quebrada');
  assert.equal(eventos[0].pontos, 120);
  assert.equal(corrida.simulacao.estado.obstaculos, 1);
  assert.deepEqual(corrida.avancar(16, 132), []);
  assert.equal(corrida.simulacao.estado.obstaculos, 1);
});

test('ação incorreta encerra corrida quando obstáculo atinge o corredor', () => {
  const corrida = corridaFake();
  corrida.simulacao.obstaculos.push({ id: 92, tipo: 'caixa', faixa: 'inferior', x: 110, resolvido: false });
  const eventos = corrida.avancar(16, 100);
  assert.equal(eventos[0].tipo, 'colisao');
  assert.equal(corrida.simulacao.terminada, true);
});

test('reiniciar limpa obstáculos, pontos e estado terminal', () => {
  const corrida = corridaFake();
  corrida.simulacao.obstaculos.push({ id: 93, tipo: 'caixa', faixa: 'inferior', x: 145, resolvido: false });
  corrida.avancar(16, 100);
  corrida.reiniciar();
  assert.equal(corrida.simulacao.terminada, false);
  assert.equal(corrida.simulacao.obstaculos.length, 0);
  assert.equal(corrida.simulacao.estado.pontos, 0);
});
