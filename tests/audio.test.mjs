import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const codigo = readFileSync(new URL('../docs/jogo/audio.js', import.meta.url), 'utf8');

function criarAudioFalso() {
  let contextos = 0;
  let osciladores = 0;
  let proximoTimer = 1;
  const timers = new Set();
  const campos = new Map();
  class Campo {
    constructor(id) { this.id = id; this.listeners = {}; this.checked = false; this.value = '0'; }
    addEventListener(nome, funcao) { this.listeners[nome] = funcao; }
    emitir(nome) { this.listeners[nome](); }
  }
  ['musica-ligada', 'efeitos-ligados', 'volume-musica', 'volume-efeitos'].forEach((id) => campos.set(id, new Campo(id)));
  class ContextoAudio {
    constructor() { contextos++; this.state = 'running'; this.currentTime = 1; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      osciladores++;
      return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} };
    }
    createGain() {
      return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
    }
  }
  const localStorage = { valor: null, getItem() { return this.valor; }, setItem(_, valor) { this.valor = valor; } };
  const contexto = vm.createContext({
    window: null, document: { getElementById: (id) => campos.get(id) }, localStorage, AudioContext: ContextoAudio,
    Promise, JSON, Number, Math, Object,
    setTimeout, clearTimeout
  });
  contexto.window = contexto;
  contexto.AudioContext = ContextoAudio;
  contexto.setInterval = () => { const id = proximoTimer++; timers.add(id); return id; };
  contexto.clearInterval = (id) => timers.delete(id);
  vm.runInContext(codigo, contexto);
  return {
    audio: contexto.CrashierAudio, campos, timers,
    get contextos() { return contextos; },
    get osciladores() { return osciladores; }
  };
}

test('áudio aguarda interação, tem volumes separados e a música pode pausar e retomar', () => {
  const app = criarAudioFalso();
  assert.equal(app.contextos, 0, 'não cria ou reproduz áudio ao carregar a página');
  app.audio.controles();
  app.audio.preparar();
  assert.equal(app.contextos, 1);

  app.audio.efeito('salto-baixo');
  const depoisDoEfeito = app.osciladores;
  assert.ok(depoisDoEfeito > 0);
  app.campos.get('efeitos-ligados').checked = false;
  app.campos.get('efeitos-ligados').emitir('change');
  app.audio.efeito('salto-alto');
  assert.equal(app.osciladores, depoisDoEfeito, 'desativar efeitos silencia ações');

  app.audio.tocarMusica();
  assert.equal(app.timers.size, 1);
  app.campos.get('musica-ligada').checked = false;
  app.campos.get('musica-ligada').emitir('change');
  assert.equal(app.timers.size, 0, 'música para sem desligar os efeitos');
  app.campos.get('musica-ligada').checked = true;
  app.campos.get('musica-ligada').emitir('change');
  assert.equal(app.timers.size, 1, 'música retoma quando ativada');
  app.campos.get('volume-musica').value = '0';
  app.campos.get('volume-musica').emitir('input');
  assert.equal(app.timers.size, 0, 'volume zero interrompe o relógio da música');
  app.audio.pararMusica();
  assert.equal(app.timers.size, 0);
});
