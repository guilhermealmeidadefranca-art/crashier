import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const docs = new URL('../docs/', import.meta.url);
const html = readFileSync(new URL('index.html', docs), 'utf8');
const css = readFileSync(new URL('hub.css', docs), 'utf8');
const js = readFileSync(new URL('hub.js', docs), 'utf8');

test('hub oferece entrada direta para o jogo publicado e preserva /jogo/', () => {
  assert.match(html, /href="jogo\/"/);
  assert.match(html, /id="hero-titulo"/);
  assert.ok(existsSync(new URL('jogo/index.html', docs)));
  assert.match(html, /releases\/latest\/download\/jogo\.apk/);
});

test('apresenta universo, mecânicas, galeria, controles e novidades sem inventar capturas', () => {
  for (const id of ['universo', 'mecanicas', 'galeria', 'controles', 'novidades']) assert.match(html, new RegExp(`id="${id}"`));
  for (const detalhe of ['Salte', 'Deslize', 'Role', 'Troque de rota', 'A rua muda a cada setor']) assert.ok(html.includes(detalhe));
  assert.match(html, /CAPTURA REAL EM BREVE/);
  assert.match(html, /não imagens de gameplay/);
});

test('recursos são locais e há suporte a mobile e movimento reduzido', () => {
  for (const recurso of ['hub.css', 'hub.js', 'assets/crashier-city.svg', 'jogo/icone-192.png']) assert.ok(existsSync(new URL(recurso, docs)), recurso);
  assert.doesNotMatch(html + css + js, /fonts\.googleapis|fonts\.gstatic|cdnjs\.cloudflare|unpkg\.com|jsdelivr\.net/);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
  for (const comando of ['Rota inferior', 'Rota superior', 'Salto baixo / alto', 'Deslizar', 'Rolar / quebrar caixa', 'Pausar corrida', 'Arraste à direita']) assert.ok(html.includes(comando), comando);
});

test('todos os caminhos locais declarados no HTML existem dentro de docs', () => {
  const atributos = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  for (const caminho of atributos) {
    if (caminho.startsWith('#') || /^[a-z]+:/i.test(caminho)) continue;
    assert.ok(existsSync(new URL(caminho, docs)), `caminho local ausente: ${caminho}`);
  }
});
