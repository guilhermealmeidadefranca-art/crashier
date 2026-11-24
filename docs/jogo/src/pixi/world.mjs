import { Container } from '../../vendor/pixi.min.mjs';
import { criarCidade } from '../render/city.mjs';
import { criarRenderizadorObstaculos } from '../render/obstacles.mjs';
import { criarEfeitos } from '../render/effects.mjs';
import { criarPersonagem } from '../render/character.mjs';

export function criarMundo(app, regras) {
  const camera = new Container();
  app.stage.addChild(camera);
  const cidade = criarCidade(camera);
  const obstaculos = criarRenderizadorObstaculos(camera, regras);
  const efeitos = criarEfeitos(camera);
  const corredor = criarPersonagem(camera, regras);
  let tremor = 0;

  function evento(evento) {
    if (evento.tipo === 'caixa-quebrada') {
      evento.obstaculo.quebraInicio = evento.agora;
      efeitos.quebrarCaixa(evento.obstaculo);
      tremor = Math.max(tremor, 5);
    } else if (evento.tipo === 'obstaculo-superado') {
      efeitos.acao('baixo', evento.faixa, evento.obstaculo.x + 22);
      tremor = Math.max(tremor, .7);
    } else if (evento.tipo === 'colisao') {
      efeitos.colisao(evento.faixa, 150);
      tremor = Math.max(tremor, 4.5);
    } else if (evento.tipo === 'troca-faixa') {
      efeitos.trocarFaixa(evento.faixa, 150);
    }
  }

  function renderizar(simulacao, agora, dt, morte = null) {
    const estado = simulacao.estado;
    const bioma = regras.biomaEm(estado.distancia);
    cidade.atualizar(simulacao.distanciaPista, estado.velocidade, bioma.id);
    obstaculos.atualizar(simulacao.obstaculos, agora);
    efeitos.correr(estado.faixa, 150, agora, estado.velocidade);
    efeitos.atualizar(dt);
    corredor.atualizar(simulacao, agora);
    if (morte != null) corredor.animarQueda(morte);
    if (tremor > 0) {
      camera.position.set(Math.sin(agora * .072) * tremor, Math.cos(agora * .091) * tremor * .45);
      tremor = Math.max(0, tremor - dt * 24);
    } else camera.position.set(0, 0);
    app.renderer.render(app.stage);
  }

  function limpar() {
    efeitos.limpar();
    tremor = 0;
    camera.position.set(0, 0);
    corredor.redefinir();
  }
  return { renderizar, evento, limpar, corredor, cidade, obstaculos, efeitos };
}
