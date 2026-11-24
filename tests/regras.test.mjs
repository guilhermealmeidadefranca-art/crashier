import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const Regras = require('../docs/jogo/regras.js');

test('a partida começa sem distância, bônus ou fim', () => {
  assert.deepEqual(Regras.novaPartida(), {
    distancia: 0, pontos: 0, bonus: 0, velocidade: 1, terminou: false, acao: '', acaoAte: 0, obstaculos: 0
  });
});

test('a distância cresce com delta e a velocidade aumenta', () => {
  const estado = Regras.avancar(Regras.novaPartida(), 100);
  assert.equal(estado.distancia, 1.2);
  assert.equal(estado.pontos, 1);
  assert.ok(estado.velocidade > 1);
});

test('delta negativo não volta a distância', () => {
  assert.equal(Regras.avancar(Regras.novaPartida(), -100).distancia, 0);
});

test('o sorteio recebido escolhe o obstáculo de modo previsível', () => {
  const obstaculo = Regras.criarObstaculo(() => 0, 7, 0);
  assert.equal(obstaculo.tipo, 'poça');
  assert.equal(obstaculo.id, 7);
  assert.equal(obstaculo.bioma, 'bairro');
});

test('a paisagem muda em ciclos de bairro, rodovia, parque e floresta', () => {
  assert.deepEqual([0, 1200, 2400, 3600, 4800].map((d) => Regras.biomaEm(d).id),
    ['bairro', 'rodovia', 'parque', 'floresta', 'bairro']);
});

test('ação correta supera o obstáculo e soma bônus de pontuação', () => {
  let estado = Regras.avancar(Regras.novaPartida(), 100);
  estado = Regras.aplicarAcao(estado, 'rolar', 1200);
  const resultado = Regras.resolverImpacto(estado, { tipo: 'caixa' }, 1300);
  assert.equal(resultado.sucesso, true);
  assert.equal(resultado.quebrou, true);
  assert.equal(resultado.estado.pontos, 121);
  assert.equal(resultado.estado.obstaculos, 1);
});

test('ação errada encerra a partida e informa o obstáculo', () => {
  const estado = Regras.aplicarAcao(Regras.novaPartida(), 'baixo', 100);
  const resultado = Regras.resolverImpacto(estado, { tipo: 'caminhão' }, 200);
  assert.equal(resultado.sucesso, false);
  assert.equal(resultado.motivo, 'caminhão');
  assert.equal(resultado.estado.terminou, true);
});

test('a ação expirada já não protege contra a colisão', () => {
  const estado = Regras.aplicarAcao(Regras.novaPartida(), 'baixo', 100);
  const resultado = Regras.resolverImpacto(estado, { tipo: 'poça' }, 1000);
  assert.equal(resultado.estado.terminou, true);
});

test('ações inválidas e obstáculos desconhecidos não alteram o jogo', () => {
  const estado = Regras.novaPartida();
  assert.equal(Regras.aplicarAcao(estado, 'voar', 0), estado);
  assert.equal(Regras.resolverImpacto(estado, { tipo: 'nada' }, 0).ignorado, true);
});

test('partida encerrada ignora novas ações e impactos', () => {
  const estado = Regras.terminar(Regras.novaPartida());
  assert.equal(Regras.aplicarAcao(estado, 'alto', 0), estado);
  assert.equal(Regras.resolverImpacto(estado, { tipo: 'carro' }, 0).ignorado, true);
});
