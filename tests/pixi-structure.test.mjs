import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'node:test';

const base = new URL('../docs/jogo/', import.meta.url);
const ler = (nome) => readFileSync(new URL(nome, base), 'utf8');
const modulos = [
  'src/main.mjs', 'src/pixi/engine.mjs', 'src/pixi/world.mjs',
  'src/model/collision.mjs', 'src/model/simulation.mjs', 'src/render/city.mjs',
  'src/render/character.mjs', 'src/render/obstacles.mjs', 'src/render/effects.mjs',
  'src/input/controls.mjs', 'src/ui/screens.mjs'
];

test('PixiJS fica local para funcionar em GitHub Pages e APK sem rede', () => {
  assert.ok(existsSync(new URL('vendor/pixi.min.mjs', base)));
  assert.match(ler('vendor/pixi.min.mjs'), /PixiJS|pixijs/i);
  assert.match(ler('vendor/PIXIJSLICENSE.txt'), /MIT License/);
  assert.doesNotMatch(ler('index.html'), /pixijs\.com|unpkg\.com|jsdelivr\.net/);
});

test('arquitetura modular existe e continua com renderer legado como fallback', () => {
  for (const modulo of modulos) assert.ok(existsSync(new URL(modulo, base)), modulo);
  assert.ok(existsSync(new URL('jogo.js', base)));
  assert.match(ler('src/main.mjs'), /import\('\.\.\/jogo\.js'\)/);
  assert.match(ler('src/pixi/engine.mjs'), /preference:\s*'webgl'/);
});

test('service worker inclui bundle e módulos para acesso offline', () => {
  const worker = ler('sw.js');
  for (const arquivo of modulos) assert.ok(worker.includes(`'./${arquivo}'`), arquivo);
  assert.ok(worker.includes("'./vendor/pixi.min.mjs'"));
});
