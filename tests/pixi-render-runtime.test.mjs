import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// A fake browser surface lets Node exercise the real PixiJS scene graph without a GPU.
Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Chrome/120' }, configurable: true });
globalThis.window = globalThis;
globalThis.document = {
  createElement() {
    return { style: {}, getContext: () => null, setAttribute() {}, addEventListener() {}, removeEventListener() {} };
  }
};

const pixi = await import('../docs/jogo/vendor/pixi.min.mjs');
const { criarMundo } = await import('../docs/jogo/src/pixi/world.mjs');
const require = createRequire(import.meta.url);
const regras = require('../docs/jogo/regras.js');

test('Pixi scene graph desenha bioma, corredor, faixa e obstáculo sem API inválida', () => {
  const stage = new pixi.Container();
  const mundo = criarMundo({ stage, renderer: { render() {} } }, regras);
  const simulacao = {
    estado: regras.novaPartida(), distanciaPista: 900,
    obstaculos: [{ id: 1, tipo: 'caixa', faixa: 'inferior', x: 230, resolvido: false }]
  };
  simulacao.estado = regras.trocarFaixa(simulacao.estado, 'superior', 100);
  simulacao.estado = regras.aplicarAcao(simulacao.estado, 'rolar', 100);
  mundo.renderizar(simulacao, 300, .016);
  assert.equal(stage.children.length, 1);
  assert.ok(mundo.corredor.raiz.y < regras.FAIXAS.inferior.chao);
});

test('quebra gera fragmentos de madeira e os remove depois da animação', () => {
  const stage = new pixi.Container();
  const mundo = criarMundo({ stage, renderer: { render() {} } }, regras);
  const caixa = { id: 2, tipo: 'caixa', faixa: 'inferior', x: 190, resolvido: true, quebraInicio: 100 };
  const simulacao = { estado: regras.novaPartida(), distanciaPista: 0, obstaculos: [caixa] };
  mundo.evento({ tipo: 'caixa-quebrada', obstaculo: caixa, agora: 100 });
  mundo.renderizar(simulacao, 100, .016);
  assert.ok(mundo.efeitos.particulas.filter((p) => p.madeira).length >= 20);
  mundo.renderizar({ ...simulacao, obstaculos: [] }, 2_000, 1.8);
  assert.equal(mundo.efeitos.particulas.length, 0);
  assert.equal(mundo.obstaculos.raiz.children.length, 0);
  mundo.evento({ tipo: 'colisao', faixa: 'inferior' });
  mundo.limpar();
  assert.equal(mundo.efeitos.particulas.length, 0);
  assert.equal(mundo.corredor.raiz.rotation, 0);
});
