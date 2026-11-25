import { criarEngine } from './pixi/engine.mjs';
import { criarMundo } from './pixi/world.mjs';
import { criarSimulacao } from './model/simulation.mjs';
import { ligarControles } from './input/controls.mjs';
import { criarTelas } from './ui/screens.mjs';

const $ = (id) => document.getElementById(id);
const regras = window.Regras;
const config = window.JOGO_CONFIG || {};
const telas = criarTelas(regras);
const painelPlacar = $('painel-placar');
const telaPixi = $('pista-pixi');
const telaAntiga = $('pista');
const fimPixi = $('fim-pixi');
const mensagem = $('mensagem');

document.title = config.nome || 'Crashier';
$('titulo').textContent = config.nome || 'CRASHIER';
if (config.cor) {
  document.documentElement.style.setProperty('--cor', config.cor);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', config.cor);
}

let engine;
let mundo;
try {
  engine = await criarEngine(telaPixi);
  mundo = criarMundo(engine.app, regras);
} catch (erro) {
  console.error('PixiJS/WebGL indisponível; abrindo o renderer 2D de segurança.', erro);
  telaPixi.hidden = true;
  telaAntiga.hidden = false;
}

if (!engine || !mundo) {
  // O renderer antigo inicializa o placar e o áudio por conta própria.
  await import('../jogo.js');
} else {
telaPixi.hidden = false;
telaAntiga.hidden = true;
PlacarUI.montar(painelPlacar);
const progressoInicial = await Placar.iniciar();
telas.recorde(progressoInicial.melhor);
Placar.aoMudar((progresso) => telas.recorde(progresso.melhor));
CrashierAudio.controles();
const corrida = criarSimulacao(regras);
let frame = 0;
let frameMorte = 0;
let anterior = 0;
let pausada = false;
let finalizada = false;
let inicioPausa = 0;

function tocarMusica() {
  CrashierAudio.preparar();
  CrashierAudio.tocarMusica();
}

function loop(agora) {
  if (pausada || finalizada || telas.atual() !== 'tela-jogo') return;
  const deltaMs = Math.max(0, Math.min(40, agora - anterior));
  anterior = agora;
  const eventos = corrida.avancar(deltaMs, agora);
  for (const evento of eventos) {
    evento.agora = agora;
    mundo.evento(evento);
    if (evento.tipo === 'caixa-quebrada') {
      telas.mensagem('CAIXA QUEBRADA! +' + evento.pontos);
      CrashierAudio.efeito('quebrar');
    } else if (evento.tipo === 'obstaculo-superado') {
      telas.mensagem('OBSTÁCULO SUPERADO! +' + evento.pontos);
      CrashierAudio.efeito('acerto');
    } else if (evento.tipo === 'colisao') {
      finalizar(evento.motivo, agora);
      return;
    }
  }
  const bioma = regras.biomaEm(corrida.simulacao.estado.distancia);
  telas.hud(corrida.simulacao.estado, bioma);
  mundo.renderizar(corrida.simulacao, agora, deltaMs / 1000);
  frame = requestAnimationFrame(loop);
}

function iniciar() {
  cancelAnimationFrame(frame); cancelAnimationFrame(frameMorte);
  frame = 0; frameMorte = 0; pausada = false; finalizada = false;
  mensagem.before(telaPixi);
  telaPixi.hidden = false;
  corrida.reiniciar(); mundo.limpar();
  anterior = performance.now();
  telas.mensagem('CORRA!');
  telas.mostrar('tela-jogo');
  tocarMusica(); CrashierAudio.efeito('menu');
  mundo.renderizar(corrida.simulacao, anterior, 0);
  frame = requestAnimationFrame(loop);
}

function pausar(forcar = false) {
  if (telas.atual() !== 'tela-jogo' || finalizada || pausada) return;
  pausada = true; inicioPausa = performance.now();
  cancelAnimationFrame(frame); frame = 0;
  CrashierAudio.pararMusica();
  telas.pausa(corrida.simulacao.estado);
}

function continuar() {
  if (!pausada || finalizada) return;
  const agora = performance.now();
  corrida.retomar(agora - inicioPausa);
  anterior = agora; pausada = false;
  telas.mostrar('tela-jogo'); tocarMusica();
  frame = requestAnimationFrame(loop);
}

function alternarPausa(forcar) {
  if (forcar) { pausar(true); return; }
  if (pausada) continuar(); else pausar();
}

function selecionarFaixa(faixa) {
  if (!corrida.trocarFaixa(faixa, performance.now())) return;
  telas.mensagem(faixa === 'superior' ? 'MUDANDO PARA ROTA SUPERIOR' : 'MUDANDO PARA ROTA INFERIOR');
  mundo.evento({ tipo: 'troca-faixa', faixa, agora: performance.now() });
  CrashierAudio.efeito('faixa');
}

function acionar(acao) {
  if (pausada || finalizada || telas.atual() !== 'tela-jogo') return;
  corrida.acionar(acao, performance.now());
  telas.mensagem({ baixo: 'SALTO BAIXO', alto: 'SALTO ALTO', deslizar: 'DESLIZANDO', rolar: 'ROLANDO' }[acao]);
  CrashierAudio.efeito(acao === 'baixo' ? 'salto-baixo' : acao === 'alto' ? 'salto-alto' : acao);
  mundo.efeitos.acao(acao, corrida.simulacao.estado.faixa, 150);
}

function finalizar(motivo, agora) {
  if (finalizada) return;
  finalizada = true; pausada = false;
  cancelAnimationFrame(frame); frame = 0;
  CrashierAudio.pararMusica(); CrashierAudio.efeito('impacto');
  const recorde = Placar.progresso().melhor;
  const resultado = telas.fim(corrida.simulacao.estado, motivo, recorde);
  fimPixi.append(telaPixi);
  telaPixi.hidden = false;
  if (resultado.novo) CrashierAudio.efeito('recorde');
  const salvar = Placar.registrarPartida(resultado.pontos, {
    distancia: resultado.distancia,
    obstaculos: corrida.simulacao.estado.obstaculos
  });
  Promise.resolve(salvar).then((retorno) => {
    const atual = Placar.progresso();
    telas.recorde(atual.melhor);
    $('recorde-final').textContent = atual.melhor.toLocaleString('pt-BR');
    $('situacao-salvamento').textContent = Placar.modo() === 'nuvem' && !retorno.salvoNaNuvem
      ? 'Recorde guardado neste aparelho. Entre no placar para sincronizar com a nuvem.' : 'Recorde registrado.';
  }).catch(() => { $('situacao-salvamento').textContent = 'Não foi possível salvar o recorde agora.'; });

  let quadroAnteriorQueda = agora;
  const desenharQueda = (tempo) => {
    const t = Math.min(1, Math.max(0, (tempo - agora) / 560));
    const dt = Math.max(0, Math.min(40, tempo - quadroAnteriorQueda)) / 1000;
    quadroAnteriorQueda = tempo;
    mundo.renderizar(corrida.simulacao, tempo, dt, t);
    if (t < 1 && telas.atual() === 'tela-fim') frameMorte = requestAnimationFrame(desenharQueda);
    else frameMorte = 0;
  };
  frameMorte = requestAnimationFrame(desenharQueda);
}

function voltarMenu() {
  cancelAnimationFrame(frame); cancelAnimationFrame(frameMorte);
  frame = 0; frameMorte = 0; pausada = false; finalizada = false;
  mensagem.before(telaPixi);
  telaPixi.hidden = false;
  corrida.reiniciar(); mundo.limpar(); CrashierAudio.pararMusica();
  telas.mostrar('tela-inicio');
}

$('botao-jogar').addEventListener('click', iniciar);
$('botao-de-novo').addEventListener('click', iniciar);
$('botao-pausar').addEventListener('click', () => pausar());
$('botao-continuar').addEventListener('click', continuar);
$('botao-reiniciar-pausa').addEventListener('click', iniciar);
$('botao-menu-pausa').addEventListener('click', voltarMenu);
$('botao-voltar-menu').addEventListener('click', voltarMenu);

// Um único conjunto de listeners vive durante todo o app. As funções de ação
// ignoram comandos fora da partida, então recomeçar não perde nem duplica controles.
ligarControles({
  canvas: engine.canvas,
  telaAtual: telas.atual,
  acionar,
  trocarFaixa: selecionarFaixa,
  alternarPausa
});
telas.mostrar('tela-inicio');
}
