import { Application } from '../../vendor/pixi.min.mjs';

export async function criarEngine(montagem) {
  const app = new Application();
  const resolucao = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  await app.init({
    width: 640,
    height: 360,
    resolution: resolucao,
    autoDensity: true,
    autoStart: false,
    antialias: true,
    backgroundColor: 0x100d19,
    backgroundAlpha: 1,
    preference: 'webgl',
    powerPreference: 'high-performance',
    roundPixels: true,
    hello: false
  });
  const canvas = app.canvas;
  canvas.className = 'pixi-canvas';
  canvas.setAttribute('aria-label', 'Corrida urbana CRASHIER renderizada em WebGL');
  canvas.setAttribute('role', 'img');
  montagem.replaceChildren(canvas);
  return {
    app,
    canvas,
    desenhar() { app.renderer.render(app.stage); },
    renderer: app.renderer.type
  };
}
