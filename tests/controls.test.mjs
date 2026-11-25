import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { ligarControles } from '../docs/jogo/src/input/controls.mjs';

class EventosFake {
  listeners = new Map();
  addEventListener(tipo, callback) {
    const lista = this.listeners.get(tipo) || [];
    lista.push(callback);
    this.listeners.set(tipo, lista);
  }
  removeEventListener(tipo, callback) {
    this.listeners.set(tipo, (this.listeners.get(tipo) || []).filter((item) => item !== callback));
  }
  emitir(tipo, evento = {}) {
    for (const callback of this.listeners.get(tipo) || []) callback(evento);
  }
}

function montarControles() {
  const janela = new EventosFake();
  let proximoTimer = 1;
  const timers = new Map();
  janela.setTimeout = (callback) => { const id = proximoTimer++; timers.set(id, callback); return id; };
  janela.clearTimeout = (id) => timers.delete(id);
  janela.executarTimers = () => { const fila = [...timers.values()]; timers.clear(); fila.forEach((callback) => callback()); };
  const botoesAcao = ['baixo', 'alto', 'deslizar', 'rolar'].map((acao) => ({ dataset: { acao }, listeners: new EventosFake().listeners }));
  const botoesFaixa = ['inferior', 'superior'].map((faixa) => ({ dataset: { faixa }, listeners: new EventosFake().listeners }));
  for (const botao of [...botoesAcao, ...botoesFaixa]) {
    botao.addEventListener = EventosFake.prototype.addEventListener;
    botao.removeEventListener = EventosFake.prototype.removeEventListener;
    botao.emitir = EventosFake.prototype.emitir;
  }
  const documento = new EventosFake();
  documento.hidden = false;
  documento.querySelectorAll = (seletor) => seletor === '[data-acao]' ? botoesAcao : botoesFaixa;
  globalThis.window = janela;
  globalThis.document = documento;
  const canvas = new EventosFake();
  const capturas = [];
  canvas.setPointerCapture = (id) => capturas.push(id);
  const acoes = [];
  const faixas = [];
  const pausas = [];
  let tela = 'tela-inicio';
  const desligar = ligarControles({
    canvas,
    telaAtual: () => tela,
    acionar: (acao) => acoes.push(acao),
    trocarFaixa: (faixa) => faixas.push(faixa),
    alternarPausa: (...args) => pausas.push(args)
  });
  const tecla = (code, repeat = false, target = {}) => janela.emitir('keydown', { code, repeat, target, preventDefault() {} });
  return { janela, documento, canvas, capturas, acoes, faixas, pausas, botoesAcao, botoesFaixa, tecla, mudarTela: (valor) => { tela = valor; }, desligar };
}

test('controles continuam ativos em partidas repetidas sem duplicar listeners', () => {
  const c = montarControles();
  assert.equal(c.janela.listeners.get('keydown').length, 1);
  c.tecla('ArrowDown');
  assert.deepEqual(c.acoes, []);
  for (let partida = 0; partida < 3; partida++) {
    c.mudarTela('tela-jogo');
    c.tecla('ArrowDown');
    c.mudarTela(partida % 2 ? 'tela-inicio' : 'tela-fim');
    c.tecla('ArrowRight');
  }
  assert.deepEqual(c.acoes, ['deslizar', 'deslizar', 'deslizar']);
  assert.equal(c.janela.listeners.get('keydown').length, 1);
});

test('setas de ação, troca de rotas, pausa e toque chamam seus comandos corretos', () => {
  const c = montarControles();
  c.mudarTela('tela-jogo');
  c.tecla('KeyA'); c.tecla('KeyD'); c.tecla('ArrowRight'); c.tecla('Escape');
  c.botoesFaixa[0].emitir('pointerdown', { currentTarget: c.botoesFaixa[0], preventDefault() {} });
  c.botoesAcao[2].emitir('pointerdown', { currentTarget: c.botoesAcao[2], preventDefault() {} });
  c.canvas.emitir('pointerdown', { clientX: 100, clientY: 100, pointerId: 8 });
  c.canvas.emitir('pointerup', { clientX: 165, clientY: 100 });
  assert.deepEqual(c.faixas, ['inferior', 'superior', 'inferior']);
  assert.deepEqual(c.acoes, ['rolar', 'deslizar', 'rolar']);
  assert.deepEqual(c.capturas, [8]);
  assert.equal(c.pausas.length, 1);
});

test('toque duplo no alto produz salto alto; toque único produz salto baixo', () => {
  const c = montarControles();
  c.mudarTela('tela-jogo');
  c.tecla('ArrowUp'); c.tecla('ArrowUp');
  assert.deepEqual(c.acoes, ['alto']);
  c.tecla('ArrowUp'); c.janela.executarTimers();
  assert.deepEqual(c.acoes, ['alto', 'baixo']);
});

test('a tela principal registra os controles uma vez e não os remove ao terminar uma corrida', () => {
  const main = readFileSync(new URL('../docs/jogo/src/main.mjs', import.meta.url), 'utf8');
  assert.equal((main.match(/ligarControles\(/g) || []).length, 1);
  assert.doesNotMatch(main, /desligarControles/);
});
