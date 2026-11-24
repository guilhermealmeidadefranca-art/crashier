import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { lerConfig, manifest, problemasDaConfig } from '../scripts/preparar.mjs';

const pasta = new URL('../docs/jogo/', import.meta.url).pathname;

test('config.js está completo e válido', () => {
  assert.deepEqual(problemasDaConfig(lerConfig()), []);
});

test('manifest e ícones foram gerados a partir do config (rode node scripts/preparar.mjs)', () => {
  const gerado = JSON.parse(readFileSync(pasta + 'manifest.webmanifest', 'utf8'));
  assert.deepEqual(gerado, manifest(lerConfig()));
  assert.ok(existsSync(pasta + 'icone-192.png'));
  assert.ok(existsSync(pasta + 'icone-512.png'));
});

test('o jogo funciona dentro do APK: caminhos relativos e placar carregado', () => {
  const htmls = readdirSync(pasta).filter((nome) => nome.endsWith('.html'));
  for (const nome of htmls) {
    const html = readFileSync(pasta + nome, 'utf8');
    assert.ok(!/(src|href)=["']\/(?!\/)/.test(html), nome + ': use caminhos relativos (sem / no começo)');
  }
  const index = readFileSync(pasta + 'index.html', 'utf8');
  for (const script of ['config.js', 'placar.js', 'placar-ui.js', 'regras.js', 'audio.js', 'src/main.mjs']) {
    assert.ok(index.includes('src="' + script + '"'), 'index.html precisa carregar ' + script);
  }
  const ordem = ['config.js', 'placar.js', 'placar-ui.js', 'regras.js', 'audio.js', 'src/main.mjs']
    .map((nome) => index.indexOf('src="' + nome + '"'));
  assert.deepEqual(ordem, [...ordem].sort((a, b) => a - b), 'scripts do jogo precisam carregar na ordem prevista');
  assert.ok(index.includes('href="placar.css"'), 'index.html precisa carregar placar.css');
  assert.ok(index.includes('id="pista-pixi"'), 'Pixi recebe seu próprio canvas sem remover o renderer antigo');
  assert.ok(existsSync(pasta + 'vendor/pixi.min.mjs'), 'PixiJS é servido localmente para Pages e APK offline');
  assert.ok(existsSync(pasta + 'vendor/PIXIJSLICENSE.txt'), 'licença do PixiJS está junto do bundle');
  assert.ok(existsSync(pasta + 'jogo.js'), 'renderer 2D antigo continua disponível como fallback');
  assert.ok(readFileSync(pasta + 'sw.js', 'utf8').includes("'./audio.js'"), 'offline cache inclui o som');
  assert.ok(readFileSync(pasta + 'sw.js', 'utf8').includes("'./vendor/pixi.min.mjs'"), 'offline cache inclui PixiJS');
  assert.doesNotMatch(readFileSync(pasta + 'audio.js', 'utf8'), /https?:\/\//, 'áudio não usa fontes externas');
});
