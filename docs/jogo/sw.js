// Service worker: tenta sempre a versão nova pela internet; sem internet, usa a cópia guardada.
const CACHE = 'crashier-v5';
const ARQUIVOS = [
  './', './index.html', './estilo.css', './placar.css', './config.js', './placar.js',
  './placar-ui.js', './regras.js', './audio.js', './jogo.js', './pwa.js', './manifest.webmanifest',
  './icone-192.png', './icone-512.png', './src/main.mjs', './src/pixi/engine.mjs',
  './src/pixi/world.mjs', './src/model/collision.mjs', './src/model/simulation.mjs',
  './src/render/city.mjs', './src/render/character.mjs', './src/render/obstacles.mjs',
  './src/render/effects.mjs', './src/input/controls.mjs', './src/ui/screens.mjs',
  './vendor/pixi.min.mjs', './vendor/PIXIJSLICENSE.txt'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) =>
    Promise.allSettled(ARQUIVOS.map((arquivo) => cache.add(arquivo)))));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((nomes) => Promise.all(nomes
      .filter((nome) => nome === 'jogo' || (nome.startsWith('crashier-') && nome !== CACHE))
      .map((nome) => caches.delete(nome))))
  ]));
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(pedido).then((guardada) => guardada || caches.match('./index.html')))
  );
});
