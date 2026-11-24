import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const Regras = require('../docs/jogo/regras.js');
const codigo = readFileSync(new URL('../docs/jogo/jogo.js', import.meta.url), 'utf8');

function criarAplicacao(sorteio = Math.random) {
  let agora = 0;
  let proximoId = 1;
  const quadros = new Map();
  const timers = new Map();
  const elementos = new Map();
  const eventosJanela = new Map();
  const mensagens = [];
  const coresRenderizadas = new Set();
  const quadrosSpriteRenderizados = new Set();
  const audio = { controles() {}, preparar() {}, tocarMusica() {}, pararMusica() {}, efeito() {} };
  const operacoesCanvas = ['fillRect', 'strokeRect', 'drawImage', 'fillText', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'save', 'restore', 'translate', 'rotate', 'ellipse', 'fill', 'clearRect', 'rect', 'clip'];
  const contextoCanvas = Object.fromEntries(operacoesCanvas.map((nome) => [nome, () => {}]));
  contextoCanvas.fillRect = function () { if (this.fillStyle) coresRenderizadas.add(this.fillStyle); };
  contextoCanvas.drawImage = function (...argumentos) {
    if (argumentos[0]?.width === 512 && argumentos.length === 9) quadrosSpriteRenderizados.add(argumentos[1] / 64);
  };
  contextoCanvas.createLinearGradient = () => ({ addColorStop() {} });
  contextoCanvas.measureText = (texto) => ({ width: texto.length * 7 });
  contextoCanvas.imageSmoothingEnabled = false;

  class Elemento {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.hidden = false; this.textContent = ''; this.dataset = {};
      this.listeners = new Map(); this.style = { setProperty() {} };
      this.classList = { toggle() {}, add() {}, remove() {} };
    }
    addEventListener(nome, funcao) {
      if (!this.listeners.has(nome)) this.listeners.set(nome, []);
      this.listeners.get(nome).push(funcao);
    }
    emitir(nome, evento = {}) { for (const f of this.listeners.get(nome) || []) f({ preventDefault() {}, target: this, ...evento }); }
    getContext() { return contextoCanvas; }
  }
  const canvas = new Elemento('canvas'); canvas.width = 640; canvas.height = 360;
  elementos.set('pista', canvas);
  const documento = {
    hidden: false,
    body: new Elemento('body'),
    documentElement: new Elemento('html'),
    getElementById(id) { if (!elementos.has(id)) elementos.set(id, new Elemento()); return elementos.get(id); },
    querySelector() { return { setAttribute() {} }; },
    querySelectorAll(seletor) {
      if (seletor === '[data-faixa]') return ['superior', 'inferior'].map((faixa) => {
        const e = new Elemento('button'); e.dataset.faixa = faixa; return e;
      });
      return ['baixo', 'alto', 'deslizar', 'rolar'].map((acao) => {
        const e = new Elemento('button'); e.dataset.acao = acao; return e;
      });
    },
    createElement(tag) { return new Elemento(tag); },
    addEventListener(nome, funcao) { if (nome === 'visibilitychange') eventosJanela.set('visibilitychange', funcao); }
  };
  let partidasSalvas = 0;
  const placar = {
    iniciar: async () => ({ melhor: 0 }),
    aoMudar() {},
    progresso: () => ({ melhor: 0 }),
    modo: () => 'local',
    registrarPartida: async () => { partidasSalvas++; return { salvoNaNuvem: false }; }
  };
  const matematica = Object.create(Math); matematica.random = sorteio;
  const impactos = [];
  const regrasRuntime = { ...Regras, resolverImpacto(...argumentos) {
    const resultado = Regras.resolverImpacto(...argumentos);
    impactos.push({ tipo: argumentos[1]?.tipo, acao: argumentos[0]?.acao, pontos: resultado.pontos, quebrou: resultado.quebrou });
    return resultado;
  } };
  const contexto = vm.createContext({
    window: null, document: documento, Regras: regrasRuntime, Placar: placar,
    PlacarUI: { montar() {} }, CrashierAudio: audio,
    JOGO_CONFIG: { nome: 'Crashier', cor: '#A855F7' },
    Math: matematica, Number, String, Array, Map, Object, Promise, JSON,
    performance: { now: () => agora },
    console: { warn() {}, error() {} }
  });
  contexto.window = contexto;
  contexto.addEventListener = (nome, funcao) => {
    if (!eventosJanela.has(nome)) eventosJanela.set(nome, []);
    eventosJanela.get(nome).push(funcao);
  };
  contexto.requestAnimationFrame = (funcao) => { const id = proximoId++; quadros.set(id, funcao); return id; };
  contexto.cancelAnimationFrame = (id) => quadros.delete(id);
  contexto.setTimeout = (funcao) => { const id = proximoId++; timers.set(id, funcao); return id; };
  contexto.clearTimeout = (id) => timers.delete(id);
  contexto.addEventListener;
  vm.runInContext(codigo, contexto);

  return {
    documento, elementos, quadros, eventosJanela, timers,
    mensagens, impactos, coresRenderizadas, quadrosSpriteRenderizados,
    get sorteioAtual() { return vm.runInContext('Math.random()', contexto); },
    get partidasSalvas() { return partidasSalvas; },
    async preparar() { await Promise.resolve(); await Promise.resolve(); },
    pressionar(id) { elementos.get(id).emitir('click'); },
    tecla(code, repeat = false) {
      for (const f of eventosJanela.get('keydown') || []) f({ code, repeat, target: { tagName: 'BODY' }, preventDefault() {} });
    },
    avancar(ms = 16) {
      agora += ms;
      const item = quadros.entries().next().value;
      assert.ok(item, 'deve haver um quadro pendente enquanto a corrida está ativa');
      quadros.delete(item[0]);
      const anteriorMensagem = elementos.get('mensagem').textContent;
      item[1](agora);
      const novaMensagem = elementos.get('mensagem').textContent;
      if (novaMensagem !== anteriorMensagem) mensagens.push(novaMensagem);
    },
    rodarAteFim(limite = 1200) {
      let passos = 0;
      while (quadros.size && passos < limite && elementos.get('tela-fim').hidden) { this.avancar(16); passos++; }
      return passos;
    }
  };
}

test('runtime inicia, aceita comandos, pausa, retoma, termina e reinicia sem duplicar eventos', async () => {
  const app = criarAplicacao();
  await app.preparar();
  assert.equal(app.elementos.get('tela-inicio').hidden, false);

  app.pressionar('botao-jogar');
  assert.equal(app.elementos.get('tela-jogo').hidden, false);
  app.avancar(); // executa renderer e cria a próxima animação

  app.tecla('KeyD');
  assert.equal(app.elementos.get('mensagem').textContent, 'MUDANDO PARA ROTA SUPERIOR');
  app.avancar(256);
  app.tecla('KeyA');
  assert.equal(app.elementos.get('mensagem').textContent, 'MUDANDO PARA ROTA INFERIOR');

  app.tecla('ArrowUp');
  app.tecla('ArrowUp');
  assert.equal(app.elementos.get('mensagem').textContent, 'SALTO ALTO');
  for (let i = 0; i < 4; i++) app.avancar(40);
  app.tecla('ArrowDown');
  assert.equal(app.elementos.get('mensagem').textContent, 'DESLIZANDO');
  for (let i = 0; i < 4; i++) app.avancar(40);
  app.tecla('ArrowRight');
  assert.equal(app.elementos.get('mensagem').textContent, 'ROLANDO');
  for (let i = 0; i < 4; i++) app.avancar(40);
  assert.ok(app.quadrosSpriteRenderizados.size >= 3, 'as ações devem exibir vários quadros do atlas do personagem');

  app.pressionar('botao-pausar');
  assert.equal(app.elementos.get('tela-pausa').hidden, false);
  assert.equal(app.quadros.size, 0);
  app.pressionar('botao-continuar');
  assert.equal(app.elementos.get('tela-jogo').hidden, false);
  assert.ok(app.quadros.size > 0);

  const passos = app.rodarAteFim();
  assert.ok(passos > 0 && passos < 1200, 'a colisão deve encerrar a partida em tempo finito');
  await app.preparar();
  assert.equal(app.elementos.get('tela-fim').hidden, false);
  assert.equal(app.partidasSalvas, 1);

  app.pressionar('botao-de-novo');
  assert.equal(app.elementos.get('tela-jogo').hidden, false);
  app.pressionar('botao-pausar');
  app.pressionar('botao-menu-pausa');
  assert.equal(app.elementos.get('tela-inicio').hidden, false);
  assert.equal(app.quadros.size, 0);
});

test('a caixa da rota atual quebra com o rolamento e a partida continua', async () => {
  const app = criarAplicacao(() => .99); // bairro: caixa; rota: inferior
  assert.equal(app.sorteioAtual, .99);
  await app.preparar();
  app.pressionar('botao-jogar'); app.avancar(16);
  for (let i = 0; i < 87; i++) app.avancar(40);
  app.tecla('ArrowRight');
  let passos = 0;
  while (!app.elementos.get('mensagem').textContent.startsWith('CAIXA QUEBRADA') && passos++ < 70 && app.elementos.get('tela-fim').hidden) {
    app.avancar(40);
    if (!app.elementos.get('mensagem').textContent.startsWith('CAIXA QUEBRADA') && passos % 12 === 0) app.tecla('ArrowRight');
  }
  assert.ok(app.elementos.get('mensagem').textContent.startsWith('CAIXA QUEBRADA'), 'o impacto deve disparar a quebra no momento do contato');
  assert.deepEqual(app.impactos.at(-1), { tipo: 'caixa', acao: 'rolar', pontos: 120, quebrou: true });
  assert.equal(app.elementos.get('tela-jogo').hidden, false, 'a caixa correta não deve encerrar a corrida');
  assert.ok(Number(app.elementos.get('pontos').textContent.replaceAll('.', '')) >= 120, 'a caixa soma seu bônus');
  assert.ok(app.coresRenderizadas.has('#a9683d'), 'a animação deve desenhar lascas de madeira após o impacto');
});
