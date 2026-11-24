(async function () {
  'use strict';

  // --------------------------------------------------------------- preparação
  const $ = (id) => document.getElementById(id);
  const config = window.JOGO_CONFIG || {};
  const canvas = $('pista');
  const ctx = canvas.getContext('2d', { alpha: false });
  const W = canvas.width;
  const H = canvas.height;
  const CHAO = 270;
  const X_CORREDOR = 150;
  const ACAO_DICA = { baixo: '↑ PULO BAIXO', alto: '↑↑ PULO ALTO', deslizar: '↓ DESLIZE', rolar: '→ ROLE' };
  const ACAO_TEXTO = { baixo: 'SALTO BAIXO', alto: 'SALTO ALTO', deslizar: 'DESLIZANDO', rolar: 'ROLANDO' };
  const PAINEIS = ['tela-inicio', 'tela-jogo', 'tela-pausa', 'tela-fim'];
  ctx.imageSmoothingEnabled = false;

  document.title = config.nome || 'Crashier';
  $('titulo').textContent = config.nome || 'CRASHIER';
  if (config.cor) {
    document.documentElement.style.setProperty('--cor', config.cor);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', config.cor);
  }
  PlacarUI.montar($('painel-placar'));
  const progressoInicial = await Placar.iniciar();

  // ----------------------------------------------------------- estado da corrida
  let estado = null;
  let frame = 0;
  let anterior = 0;
  let acumuladoSpawn = 650;
  let proximoIntervaloSpawn = 1700;
  let proximoId = 0;
  let offset = 0;
  let proximoPo = 0;
  let pausado = false;
  let pausaEm = 0;
  let finalizado = false;
  let timerSaltoBaixo = null;
  let telaAtual = 'tela-inicio';
  let tremor = 0;
  const obstaculos = [];
  const particulas = [];
  const camadas = new Map();

  // ----------------------------------------------------------- UI e persistência
  function mostrar(id) {
    telaAtual = id;
    PAINEIS.forEach((painel) => { $(painel).hidden = painel !== id; });
    document.body.classList.toggle('em-partida', id === 'tela-jogo' || id === 'tela-pausa');
  }
  function atualizarRecorde(valor) { $('melhor').textContent = Number(valor || 0).toLocaleString('pt-BR'); }
  atualizarRecorde(progressoInicial.melhor);
  Placar.aoMudar((p) => atualizarRecorde(p.melhor));

  // ----------------------------------------------------------- arte pixelada
  function numeroFixo(n) { return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1; }
  function aleatorioVisual(n) { return Math.abs(numeroFixo(n)); }
  function canvasOffscreen(largura, altura) {
    const c = document.createElement('canvas');
    c.width = largura; c.height = altura;
    const c2 = c.getContext('2d'); c2.imageSmoothingEnabled = false;
    return [c, c2];
  }
  function criarPredios(ctx2, paleta, camada, quantidade) {
    const base = camada === 0 ? 218 : 186;
    let x = -12;
    for (let i = 0; i < quantidade; i++) {
      const largura = 44 + Math.floor(aleatorioVisual(i + camada * 40) * 55);
      const altura = 48 + Math.floor(aleatorioVisual(i + camada * 90 + 4) * (camada === 0 ? 86 : 108));
      const topo = base - altura;
      ctx2.fillStyle = paleta[i % paleta.length]; ctx2.fillRect(x, topo, largura, altura);
      ctx2.fillStyle = '#0b0a12'; ctx2.fillRect(x + largura - 4, topo + 5, 4, altura - 5);
      if (camada > 0 && largura > 48) {
        ctx2.fillStyle = '#d07cff'; ctx2.fillRect(x + 5, topo + 4, largura - 10, 3);
        ctx2.fillStyle = '#171322'; ctx2.fillRect(x + 8, topo + 12, largura - 16, 7);
      }
      const cols = Math.max(1, Math.floor((largura - 12) / 13));
      for (let wy = topo + 12; wy < base - 12; wy += 17) {
        for (let wx = x + 7, j = 0; wx < x + largura - 8; wx += 13, j++) {
          const aceso = aleatorioVisual(i * 31 + wy * 3 + wx + camada * 7) > .36;
          if (!aceso) continue;
          ctx2.fillStyle = (j + i) % 4 === 0 ? '#ffc66d' : '#7fd5de';
          ctx2.fillRect(wx, wy, 5, 8);
        }
      }
      x += largura + 8 + Math.floor(aleatorioVisual(i + 99) * 11);
    }
  }
  function camadaCidade(bioma, nivel) {
    const [tile, c] = canvasOffscreen(W, H);
    const paleta = bioma.paleta;
    if (nivel === 'distante') {
      const grad = c.createLinearGradient(0, 28, 0, 245);
      grad.addColorStop(0, paleta[0]); grad.addColorStop(1, paleta[1]);
      c.fillStyle = grad; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(aleatorioVisual(i + 500) * W);
        const y = Math.floor(aleatorioVisual(i + 600) * 142);
        c.fillStyle = i % 3 ? '#d8caff' : '#f6c986'; c.globalAlpha = .25 + aleatorioVisual(i + 9) * .55;
        c.fillRect(x, y + 15, 2, 2);
      }
      c.globalAlpha = 1;
      c.fillStyle = '#f3d7ac'; c.fillRect(526, 39, 22, 22); c.fillRect(531, 34, 12, 4);
      c.fillStyle = '#eac9a3'; c.fillRect(531, 44, 12, 12);
      criarPredios(c, [paleta[1], '#25213c', '#332544', '#22213a'], 0, 13);
    } else if (nivel === 'medio') {
      if (bioma.id === 'parque' || bioma.id === 'floresta') {
        c.fillStyle = '#182b26'; c.fillRect(0, 90, W, 190);
        for (let i = 0; i < 11; i++) {
          const x = i * 68 - 15;
          const h = 50 + Math.floor(aleatorioVisual(i + 41) * 62);
          c.fillStyle = '#493628'; c.fillRect(x + 21, 200 - h, 12, h);
          c.fillStyle = i % 2 ? '#1c674c' : (bioma.id === 'floresta' ? '#24563d' : '#438253');
          c.fillRect(x, 168 - h / 2, 54, 50); c.fillRect(x + 7, 138 - h / 2, 39, 42);
          c.fillStyle = '#6a8b4d'; c.fillRect(x + 8, 176 - h / 2, 10, 4);
        }
        // Um viaduto e os postes ao fundo mantêm o parque ligado à cidade.
        if (bioma.id === 'parque') {
          c.fillStyle = '#454457'; c.fillRect(0, 125, W, 8); c.fillRect(35, 133, 8, 34); c.fillRect(415, 133, 8, 34);
          c.fillStyle = '#bbb2cb'; c.fillRect(0, 124, W, 2);
        }
      } else {
        c.fillStyle = '#171827'; c.fillRect(0, 62, W, 218);
        criarPredios(c, bioma.id === 'rodovia' ? ['#24344b', '#2d3144', '#1e283b'] : ['#312543', '#3b2a48', '#28213b'], 1, 9);
        for (let i = 0; i < 4; i++) {
          const x = 34 + i * 174;
          c.fillStyle = '#574263'; c.fillRect(x, 118, 54, 63);
          c.fillStyle = '#ffc974'; c.fillRect(x + 6, 125, 19, 24); c.fillRect(x + 31, 125, 16, 24);
          c.fillStyle = '#23172d'; c.fillRect(x + 6, 154, 41, 24);
          c.fillStyle = '#8c6b98'; c.fillRect(x - 4, 181, 64, 5);
        }
      }
    } else {
      // Cabos, semáforos e postes na camada próxima; contraste baixo para não cobrir alvos.
      c.fillStyle = '#18141f'; c.fillRect(0, 183, W, 82);
      if (bioma.id === 'rodovia') {
        c.fillStyle = '#a9b4c1'; c.fillRect(42, 89, 5, 118); c.fillRect(42, 89, 130, 5);
        c.fillStyle = '#263346'; c.fillRect(142, 94, 61, 31); c.fillStyle = '#f2cf83'; c.fillRect(151, 101, 42, 4);
        c.fillStyle = '#adb4bc'; c.fillRect(484, 70, 5, 144); c.fillRect(488, 76, 98, 4);
        c.fillStyle = '#fb923c'; c.fillRect(521, 80, 55, 26); c.fillStyle = '#211b24'; c.fillRect(528, 85, 42, 5);
      } else {
        for (let i = 0; i < 4; i++) {
          const x = 40 + i * 194;
          c.fillStyle = '#4b4157'; c.fillRect(x, 87, 4, 151); c.fillRect(x - 21, 86, 46, 4);
          c.fillStyle = '#ce9b59'; c.fillRect(x - 8, 91, 18, 5); c.fillStyle = '#ffd38b'; c.fillRect(x - 5, 92, 12, 2);
        }
        c.fillStyle = '#5b5270'; c.fillRect(0, 119, W, 2);
        for (let x = 0; x < W; x += 128) c.fillRect(x, 119, 2, 15);
      }
      c.globalAlpha = .48; c.fillStyle = bioma.paleta[2]; c.fillRect(70, 202, 2, 30); c.fillRect(71, 201, 40, 2); c.globalAlpha = 1;
    }
    return tile;
  }
  function camadaChao(bioma) {
    const [tile, c] = canvasOffscreen(W, 95);
    const estrada = bioma.id === 'parque' ? '#403d40' : bioma.id === 'floresta' ? '#3d3a36' : '#32323d';
    c.fillStyle = bioma.id === 'parque' || bioma.id === 'floresta' ? '#28483a' : '#292333'; c.fillRect(0, 0, W, 18);
    c.fillStyle = '#b6a7bd'; c.fillRect(0, 16, W, 4);
    c.fillStyle = estrada; c.fillRect(0, 20, W, 75);
    c.fillStyle = '#6f6574'; c.fillRect(0, 20, W, 2);
    if (bioma.id === 'rodovia') {
      c.fillStyle = '#e3c783';
      for (let x = 14; x < W; x += 92) c.fillRect(x, 56, 54, 4);
      c.fillStyle = '#55505a'; c.fillRect(0, 90, W, 5);
    } else {
      c.fillStyle = '#d5b66f';
      for (let x = 25; x < W; x += 144) c.fillRect(x, 57, 58, 3);
      c.fillStyle = '#77707a'; c.fillRect(0, 89, W, 6);
    }
    for (let x = 5; x < W; x += 43) {
      c.fillStyle = x % 3 ? '#4b4553' : '#56505f'; c.fillRect(x, 27 + (x % 4) * 9, 3, 2);
    }
    if (bioma.id === 'parque' || bioma.id === 'floresta') {
      c.fillStyle = '#7aa05c';
      for (let x = 7; x < W; x += 26) c.fillRect(x, 5 + x % 7, 3, 8);
    }
    return tile;
  }
  function prepararCenarios() {
    Regras.BIOMAS.forEach((bioma) => camadas.set(bioma.id, {
      distante: camadaCidade(bioma, 'distante'),
      medio: camadaCidade(bioma, 'medio'),
      perto: camadaCidade(bioma, 'perto'),
      chao: camadaChao(bioma)
    }));
  }
  prepararCenarios();

  // ------------------------------------------------------ partículas e animações
  function emitir(x, y, quantidade, cor, potencia, tamanho) {
    for (let i = 0; i < quantidade && particulas.length < 100; i++) {
      const angulo = Math.PI + Math.random() * Math.PI;
      const velocidade = potencia * (.3 + Math.random() * .8);
      particulas.push({ x, y, vx: Math.cos(angulo) * velocidade, vy: Math.sin(angulo) * velocidade - 12,
        idade: 0, vida: .24 + Math.random() * .32, tamanho: tamanho || 3 + Math.random() * 3, cor });
    }
  }
  function atualizarParticulas(dt) {
    let manter = 0;
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i]; p.idade += dt;
      if (p.idade >= p.vida) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 95 * dt;
      particulas[manter++] = p;
    }
    particulas.length = manter;
  }
  function desenharParticulas() {
    for (const p of particulas) {
      ctx.globalAlpha = Math.max(0, 1 - p.idade / p.vida);
      ctx.fillStyle = p.cor; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, p.tamanho), Math.max(1, p.tamanho));
    }
    ctx.globalAlpha = 1;
  }
  function quadroTempoAcao(agora) {
    const acao = estado.acao;
    if (!acao) return { acao: '', t: 1, vivo: false };
    const duracao = Regras.DURACAO_ACAO[acao];
    const inicio = estado.acaoAte - duracao;
    const t = Math.max(0, Math.min(1, (agora - inicio) / duracao));
    return { acao, t, vivo: agora < estado.acaoAte };
  }
  function desenharCorredor(agora) {
    const acao = quadroTempoAcao(agora);
    const correndo = !acao.vivo;
    const fase = Math.floor(agora / 100) % 3;
    const salto = acao.acao === 'alto' ? 78 : acao.acao === 'baixo' ? 42 : 0;
    const alturaPulo = salto ? Math.sin(Math.PI * acao.t) * salto : 0;
    const base = CHAO - alturaPulo;
    const agacha = acao.acao === 'deslizar' && acao.vivo ? Math.sin(Math.PI * acao.t) : 0;
    const rolagem = acao.acao === 'rolar' && acao.vivo;
    // Sombra de contato e halo roxo muito discreto.
    ctx.globalAlpha = .32; ctx.fillStyle = '#030207'; ctx.fillRect(X_CORREDOR + 1, CHAO - 3, 34, 5); ctx.globalAlpha = 1;
    ctx.fillStyle = '#150f20';
    if (rolagem) {
      ctx.fillRect(X_CORREDOR + 4, base - 24, 32, 20); ctx.fillRect(X_CORREDOR + 8, base - 29, 21, 6);
      ctx.fillStyle = '#38234b'; ctx.fillRect(X_CORREDOR + 9, base - 25, 3, 16);
      return;
    }
    if (agacha > .1) {
      const corpoY = CHAO - 22 + agacha * 8;
      ctx.fillRect(X_CORREDOR + 7, corpoY, 35, 13); ctx.fillRect(X_CORREDOR + 31, corpoY - 14, 15, 14);
      ctx.fillStyle = '#2b1a3a'; ctx.fillRect(X_CORREDOR + 34, corpoY - 12, 7, 2);
      ctx.fillStyle = '#050407'; ctx.fillRect(X_CORREDOR + 8, CHAO - 8, 32, 6);
      return;
    }
    const pulando = alturaPulo > 1;
    const cabecaY = base - 68;
    // Contorno pixel roxo atrás da sombra dá separação do cenário sem mudar o personagem.
    ctx.fillStyle = '#352047';
    ctx.fillRect(X_CORREDOR + 17, cabecaY, 18, 18);
    ctx.fillRect(X_CORREDOR + 12, cabecaY + 19, 28, 28);
    ctx.fillStyle = '#030307';
    ctx.fillRect(X_CORREDOR + 19, cabecaY + 2, 14, 14);
    ctx.fillRect(X_CORREDOR + 14, cabecaY + 20, 24, 25);
    // Braço alterna com o passo; no salto acompanha o impulso.
    if (pulando) {
      ctx.fillRect(X_CORREDOR + 3, cabecaY + 23, 13, 7); ctx.fillRect(X_CORREDOR + 35, cabecaY + 24, 12, 6);
      ctx.fillRect(X_CORREDOR + 6, base - 29, 13, 7); ctx.fillRect(X_CORREDOR + 29, base - 27, 15, 7);
      ctx.fillRect(X_CORREDOR + 9, base - 25, 8, 18); ctx.fillRect(X_CORREDOR + 30, base - 22, 8, 17);
    } else {
      ctx.fillRect(X_CORREDOR + (fase === 1 ? 6 : 34), cabecaY + 26, 9, 20);
      ctx.fillRect(X_CORREDOR + (fase === 1 ? 34 : 6), cabecaY + 26, 9, 20);
      const pernas = [[12, 18, 10, 19], [8, 24, 12, 13], [17, 9, 10, 25]][fase];
      ctx.fillRect(X_CORREDOR + pernas[0], base - 25, 9, pernas[1]);
      ctx.fillRect(X_CORREDOR + pernas[2], base - 25, 9, pernas[3]);
      ctx.fillRect(X_CORREDOR + pernas[0] - 2, base - 5, 15, 5);
      ctx.fillRect(X_CORREDOR + pernas[2] - 1, base - 5, 15, 5);
    }
    ctx.fillStyle = '#332040'; ctx.fillRect(X_CORREDOR + 14, cabecaY + 21, 3, 15);
    if (correndo && agora >= proximoPo) {
      emitir(X_CORREDOR + 8, CHAO - 5, 2, '#9c78ad', 25, 2);
      proximoPo = agora + 145;
    }
  }

  // -------------------------------------------------------------- cenários
  function desenharTile(tile, y, deslocamento) {
    const x = -((deslocamento % W) + W) % W;
    ctx.drawImage(tile, x, y); ctx.drawImage(tile, x + W, y);
  }
  function desenharCenario(bioma, dt) {
    const cena = camadas.get(bioma.id);
    ctx.fillStyle = bioma.paleta[0]; ctx.fillRect(0, 0, W, H);
    desenharTile(cena.distante, 0, offset * .08);
    desenharTile(cena.medio, 0, offset * .22);
    desenharTile(cena.perto, 0, offset * .48);
    ctx.fillStyle = '#08070d'; ctx.fillRect(0, CHAO - 4, W, H - CHAO + 4);
    desenharTile(cena.chao, CHAO, offset);
    ctx.fillStyle = '#d5c1dc'; ctx.fillRect(0, CHAO - 3, W, 2);
    // Faixas rápidas próximas ao chão; o delta garante mesma velocidade em telas diferentes.
    const faixa = (offset * 1.75) % 150;
    ctx.globalAlpha = .3;
    ctx.fillStyle = '#bd9dd0';
    for (let x = -faixa; x < W; x += 150) ctx.fillRect(x, H - 27, 56, 2);
    ctx.globalAlpha = 1;
    if (tremor > 0) tremor = Math.max(0, tremor - dt * 25);
  }

  // -------------------------------------------------------------- obstáculos
  function desenharRotulo(o, regra) {
    if (o.x > 470 || o.x < -regra.largura) return;
    const dica = ACAO_DICA[regra.acao];
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    const largura = Math.ceil(ctx.measureText(dica).width) + 12;
    const x = o.x + regra.largura / 2;
    const y = Math.max(23, CHAO - regra.altura - 35);
    ctx.fillStyle = '#0b0912'; ctx.fillRect(x - largura / 2, y - 15, largura, 19);
    ctx.strokeStyle = '#b779d2'; ctx.lineWidth = 1; ctx.strokeRect(x - largura / 2 + .5, y - 14.5, largura - 1, 18);
    ctx.fillStyle = '#f3d6ff'; ctx.fillText(dica, x, y - 2);
  }
  function desenharObstaculo(o) {
    const r = Regras.TIPOS[o.tipo];
    const x = Math.round(o.x); const y = CHAO;
    if (o.tipo === 'poça') {
      ctx.fillStyle = '#111a29'; ctx.fillRect(x, y - 5, r.largura, 7);
      ctx.fillStyle = '#36b4d0'; ctx.fillRect(x + 5, y - 4, r.largura - 10, 3);
      ctx.fillStyle = '#b7f2ed'; ctx.fillRect(x + 9, y - 4, 8, 1); ctx.fillRect(x + r.largura - 11, y - 3, 5, 1);
      ctx.fillStyle = '#0b0a11'; ctx.fillRect(x - 2, y + 1, r.largura + 4, 2);
    } else if (o.tipo === 'cone') {
      ctx.fillStyle = '#f47c39'; ctx.fillRect(x + 10, y - 30, 10, 24); ctx.fillRect(x + 5, y - 17, 20, 4);
      ctx.fillStyle = '#fff0d3'; ctx.fillRect(x + 8, y - 20, 14, 4);
      ctx.fillStyle = '#f47c39'; ctx.fillRect(x + 2, y - 6, 26, 4); ctx.fillStyle = '#211723'; ctx.fillRect(x, y - 2, 30, 4);
    } else if (o.tipo === 'carro') {
      ctx.fillStyle = '#09080d'; ctx.fillRect(x + 8, y - 14, r.largura - 13, 17);
      ctx.fillStyle = '#c43e55'; ctx.fillRect(x + 2, y - 28, r.largura - 4, 21);
      ctx.fillStyle = '#e66b70'; ctx.fillRect(x + 15, y - 45, 41, 21); ctx.fillRect(x + 22, y - 49, 24, 5);
      ctx.fillStyle = '#99d7e2'; ctx.fillRect(x + 20, y - 41, 14, 13); ctx.fillRect(x + 38, y - 41, 13, 13);
      ctx.fillStyle = '#321d35'; ctx.fillRect(x + 4, y - 10, r.largura - 8, 3);
      ctx.fillStyle = '#111016'; ctx.fillRect(x + 12, y - 8, 17, 11); ctx.fillRect(x + r.largura - 29, y - 8, 17, 11);
      ctx.fillStyle = '#a8a4a8'; ctx.fillRect(x + 15, y - 5, 9, 4); ctx.fillRect(x + r.largura - 26, y - 5, 9, 4);
      ctx.fillStyle = '#ffe39c'; ctx.fillRect(x + r.largura - 5, y - 20, 4, 4);
    } else if (o.tipo === 'caminhão') {
      ctx.fillStyle = '#171822'; ctx.fillRect(x, y - 53, 70, 48);
      ctx.fillStyle = '#e1a84f'; ctx.fillRect(x + 5, y - 47, 58, 36);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#be813c'; ctx.fillRect(x + 11 + i * 17, y - 45, 3, 32); }
      ctx.fillStyle = '#d96342'; ctx.fillRect(x + 68, y - 39, 31, 34); ctx.fillRect(x + 75, y - 50, 22, 20);
      ctx.fillStyle = '#a8dce3'; ctx.fillRect(x + 79, y - 46, 12, 11);
      ctx.fillStyle = '#16141c'; ctx.fillRect(x + 10, y - 8, 20, 12); ctx.fillRect(x + 70, y - 8, 20, 12);
      ctx.fillStyle = '#a8a4a8'; ctx.fillRect(x + 14, y - 4, 10, 4); ctx.fillRect(x + 74, y - 4, 10, 4);
      ctx.fillStyle = '#ffe39c'; ctx.fillRect(x + 94, y - 24, 5, 6);
    } else if (o.tipo === 'mesa') {
      ctx.fillStyle = '#0b0911'; ctx.fillRect(x + 4, y - 58, r.largura - 7, 12);
      ctx.fillStyle = '#a86a3d'; ctx.fillRect(x, y - 58, r.largura - 6, 8);
      ctx.fillStyle = '#d59a5d'; ctx.fillRect(x + 8, y - 56, r.largura - 24, 2);
      ctx.fillStyle = '#63412e'; ctx.fillRect(x + 10, y - 50, 8, 45); ctx.fillRect(x + r.largura - 22, y - 50, 8, 45);
      ctx.fillStyle = '#30202c'; ctx.fillRect(x + 22, y - 49, r.largura - 48, 2);
    } else if (o.tipo === 'cerca') {
      ctx.fillStyle = '#cbbd9d'; ctx.fillRect(x, y - 47, r.largura, 8);
      ctx.fillStyle = '#8e795a'; ctx.fillRect(x + 5, y - 39, 8, 39); ctx.fillRect(x + r.largura - 15, y - 39, 8, 39);
      ctx.fillStyle = '#e0d2b1'; ctx.fillRect(x + 10, y - 45, r.largura - 20, 3);
      ctx.fillStyle = '#453b37'; ctx.fillRect(x - 4, y - 2, r.largura + 8, 4);
    } else if (o.tipo === 'galho') {
      ctx.fillStyle = '#68462e'; ctx.fillRect(x + 5, y - 29, r.largura - 8, 8);
      ctx.fillStyle = '#326a47'; ctx.fillRect(x + 7, y - 42, 20, 15); ctx.fillRect(x + 30, y - 48, 24, 21); ctx.fillRect(x + 56, y - 41, 20, 15);
      ctx.fillStyle = '#74a55d'; ctx.fillRect(x + 13, y - 39, 9, 3); ctx.fillRect(x + 39, y - 45, 10, 3);
    } else if (o.tipo === 'caixa') {
      ctx.fillStyle = '#5f382a'; ctx.fillRect(x + 1, y - r.altura + 3, r.largura - 2, r.altura - 2);
      ctx.fillStyle = '#b47442'; ctx.fillRect(x + 4, y - r.altura, r.largura - 8, r.altura - 5);
      ctx.fillStyle = '#d59a59'; ctx.fillRect(x + 8, y - r.altura + 4, 3, r.altura - 13); ctx.fillRect(x + r.largura - 12, y - r.altura + 4, 3, r.altura - 13);
      ctx.fillStyle = '#805033'; ctx.fillRect(x + 12, y - 24, r.largura - 24, 4); ctx.fillRect(x + 18, y - r.altura + 5, 4, r.altura - 12);
      ctx.fillStyle = '#f1c27b'; ctx.fillRect(x + 6, y - r.altura + 4, 3, 3); ctx.fillRect(x + r.largura - 10, y - r.altura + 4, 3, 3);
    }
    desenharRotulo(o, r);
  }

  // ----------------------------------------------------------- fluxo de jogo
  function acionar(acao) {
    if (!estado || finalizado || pausado) return;
    estado = Regras.aplicarAcao(estado, acao, performance.now());
    $('mensagem').textContent = ACAO_TEXTO[acao];
    CrashierAudio.efeito(acao === 'baixo' ? 'salto-baixo' : acao === 'alto' ? 'salto-alto' : acao);
    if (acao === 'baixo' || acao === 'alto') emitir(X_CORREDOR + 17, CHAO - 4, 5, '#bd9de0', 38, 3);
    else emitir(X_CORREDOR + 25, CHAO - 3, 4, acao === 'rolar' ? '#f1bd76' : '#c293dc', 32, 3);
  }
  function mostrarPausa() {
    $('pausa-distancia').textContent = Math.floor(estado.distancia).toLocaleString('pt-BR');
    $('pausa-pontos').textContent = Math.floor(estado.pontos).toLocaleString('pt-BR');
    mostrar('tela-pausa');
  }
  function pausar() {
    if (!estado || finalizado || pausado) return;
    pausado = true; pausaEm = performance.now();
    if (timerSaltoBaixo !== null) { window.clearTimeout(timerSaltoBaixo); timerSaltoBaixo = null; }
    cancelAnimationFrame(frame); frame = 0;
    CrashierAudio.pararMusica(); mostrarPausa();
  }
  function continuar() {
    if (!estado || !pausado || finalizado) return;
    const agora = performance.now();
    const tempoPausa = agora - pausaEm;
    if (estado.acao) estado.acaoAte += tempoPausa;
    anterior = agora; pausado = false; mostrar('tela-jogo');
    CrashierAudio.tocarMusica(); frame = requestAnimationFrame(quadro);
  }
  function voltarMenu() {
    cancelAnimationFrame(frame); frame = 0;
    if (timerSaltoBaixo !== null) { window.clearTimeout(timerSaltoBaixo); timerSaltoBaixo = null; }
    estado = null; pausado = false; finalizado = false; obstaculos.length = 0; particulas.length = 0;
    CrashierAudio.pararMusica(); mostrar('tela-inicio');
  }
  function encerrar(motivo) {
    if (!estado || finalizado) return;
    finalizado = true; pausado = false;
    estado = Regras.terminar(estado);
    cancelAnimationFrame(frame); frame = 0;
    if (timerSaltoBaixo !== null) { window.clearTimeout(timerSaltoBaixo); timerSaltoBaixo = null; }
    CrashierAudio.pararMusica(); CrashierAudio.efeito('impacto');
    tremor = 5;
    const pontos = Math.floor(estado.pontos);
    const distancia = Math.floor(estado.distancia);
    const recordeAntes = Placar.progresso().melhor;
    const bateuRecorde = pontos > recordeAntes;
    $('resultado').textContent = pontos.toLocaleString('pt-BR');
    $('resultado-distancia').textContent = distancia.toLocaleString('pt-BR');
    $('recorde-final').textContent = Math.max(recordeAntes, pontos).toLocaleString('pt-BR');
    $('novo-recorde').hidden = !bateuRecorde;
    $('titulo-fim').textContent = bateuRecorde ? 'A cidade inteira ficou para trás!' : 'A cidade ficou para trás.';
    $('causa-fim').textContent = motivo ? `A sombra não conseguiu superar ${Regras.NOMES[motivo] || 'o obstáculo'}.` : 'A corrida chegou ao fim.';
    $('situacao-salvamento').textContent = 'Salvando placar…';
    mostrar('tela-fim');
    if (bateuRecorde) CrashierAudio.efeito('recorde');
    Placar.registrarPartida(pontos, { distancia, obstaculos: estado.obstaculos })
      .then((salvo) => {
        const atual = Placar.progresso(); atualizarRecorde(atual.melhor);
        $('recorde-final').textContent = atual.melhor.toLocaleString('pt-BR');
        $('situacao-salvamento').textContent = Placar.modo() === 'nuvem' && !salvo.salvoNaNuvem
          ? 'Recorde guardado neste aparelho. Entre no placar para sincronizar com a nuvem.' : 'Recorde registrado.';
      })
      .catch(() => { $('situacao-salvamento').textContent = 'Não foi possível salvar o recorde agora.'; });
  }
  function iniciarCorrida() {
    cancelAnimationFrame(frame); frame = 0;
    if (timerSaltoBaixo !== null) { window.clearTimeout(timerSaltoBaixo); timerSaltoBaixo = null; }
    estado = Regras.novaPartida();
    obstaculos.length = 0; particulas.length = 0;
    acumuladoSpawn = 350; proximoIntervaloSpawn = Regras.intervaloSpawn(0);
    proximoId = 0; offset = 0; proximoPo = 0; tremor = 0;
    finalizado = false; pausado = false; anterior = performance.now();
    $('mensagem').textContent = 'CORRA!';
    mostrar('tela-jogo');
    CrashierAudio.preparar(); CrashierAudio.tocarMusica(); CrashierAudio.efeito('menu');
    frame = requestAnimationFrame(quadro);
  }

  function quadro(agora) {
    if (!estado || finalizado || pausado) return;
    const deltaMs = Math.max(0, Math.min(40, agora - anterior));
    anterior = agora;
    const dt = deltaMs / 1000;
    estado = Regras.avancar(estado, deltaMs);
    const pixels = 190 * estado.velocidade * dt;
    offset += pixels;
    acumuladoSpawn += deltaMs;
    if (acumuladoSpawn >= proximoIntervaloSpawn) {
      acumuladoSpawn = 0;
      obstaculos.push(Regras.criarObstaculo(Math.random, ++proximoId, estado.distancia));
      proximoIntervaloSpawn = Regras.intervaloSpawn(estado.distancia);
    }
    for (const obstaculo of obstaculos) {
      obstaculo.x -= pixels;
      if (obstaculo.resolvido) continue;
      const regra = Regras.TIPOS[obstaculo.tipo];
      const dentroDaZona = obstaculo.x <= X_CORREDOR + 40 && obstaculo.x + regra.largura >= X_CORREDOR + 8;
      if (dentroDaZona && Regras.podeSuperar(estado, obstaculo, agora)) {
        obstaculo.resolvido = true;
        const resultado = Regras.resolverImpacto(estado, obstaculo, agora);
        estado = resultado.estado;
        tremor = Math.min(3, tremor + (resultado.quebrou ? 1.8 : .65));
        $('mensagem').textContent = resultado.quebrou ? 'CAIXA QUEBRADA! +' + resultado.pontos : 'OBSTÁCULO SUPERADO! +' + resultado.pontos;
        CrashierAudio.efeito(resultado.quebrou ? 'quebrar' : 'acerto');
        emitir(obstaculo.x + regra.largura / 2, CHAO - 12, resultado.quebrou ? 13 : 7,
          resultado.quebrou ? '#f2bb71' : '#d9a7ff', resultado.quebrou ? 70 : 42, 4);
      } else if (obstaculo.x + regra.largura < X_CORREDOR + 8) {
        obstaculo.resolvido = true;
        emitir(X_CORREDOR + 20, CHAO - 28, 20, '#d293eb', 90, 5);
        estado = Regras.terminar(estado); encerrar(obstaculo.tipo); return;
      }
    }
    for (let i = obstaculos.length - 1; i >= 0; i--) {
      if (obstaculos[i].x < -Regras.TIPOS[obstaculos[i].tipo].largura - 8) obstaculos.splice(i, 1);
    }
    atualizarParticulas(dt);
    const bioma = Regras.biomaEm(estado.distancia);
    ctx.save();
    if (tremor > 0) ctx.translate(Math.sin(agora * .08) * tremor, Math.cos(agora * .11) * tremor * .45);
    desenharCenario(bioma, dt);
    desenharParticulas();
    obstaculos.forEach(desenharObstaculo);
    desenharCorredor(agora);
    ctx.restore();
    $('distancia').textContent = Math.floor(estado.distancia).toLocaleString('pt-BR');
    $('pontos').textContent = Math.floor(estado.pontos).toLocaleString('pt-BR');
    $('velocidade').textContent = estado.velocidade.toFixed(1);
    $('bioma').textContent = bioma.nome;
    frame = requestAnimationFrame(quadro);
  }

  // ----------------------------------------------------------- entrada e ciclo
  CrashierAudio.controles();
  $('botao-jogar').addEventListener('click', iniciarCorrida);
  $('botao-de-novo').addEventListener('click', iniciarCorrida);
  $('botao-pausar').addEventListener('click', pausar);
  $('botao-continuar').addEventListener('click', continuar);
  $('botao-reiniciar-pausa').addEventListener('click', iniciarCorrida);
  $('botao-menu-pausa').addEventListener('click', voltarMenu);
  $('botao-voltar-menu').addEventListener('click', voltarMenu);
  document.querySelectorAll('[data-acao]').forEach((botao) => {
    botao.addEventListener('pointerdown', (evento) => { evento.preventDefault(); acionar(botao.dataset.acao); });
  });
  window.addEventListener('keydown', (evento) => {
    if (evento.target && /^(INPUT|TEXTAREA|SELECT)$/.test(evento.target.tagName)) return;
    if (evento.code === 'Escape' || evento.code === 'KeyP') {
      if (!finalizado && estado) { evento.preventDefault(); pausado ? continuar() : pausar(); }
      return;
    }
    if (telaAtual !== 'tela-jogo') return;
    if (evento.code === 'ArrowUp') {
      evento.preventDefault();
      if (evento.repeat) return;
      if (timerSaltoBaixo !== null) {
        window.clearTimeout(timerSaltoBaixo); timerSaltoBaixo = null; acionar('alto');
      } else {
        timerSaltoBaixo = window.setTimeout(() => { timerSaltoBaixo = null; acionar('baixo'); }, 280);
      }
      return;
    }
    const acao = evento.code === 'ArrowDown' ? 'deslizar' : evento.code === 'ArrowRight' ? 'rolar' : '';
    if (acao) { evento.preventDefault(); if (!evento.repeat) acionar(acao); }
  });
  let toqueInicial = null;
  canvas.addEventListener('pointerdown', (evento) => {
    toqueInicial = { x: evento.clientX, y: evento.clientY };
  }, { passive: true });
  canvas.addEventListener('pointerup', (evento) => {
    if (!toqueInicial || telaAtual !== 'tela-jogo') return;
    const dx = evento.clientX - toqueInicial.x; const dy = evento.clientY - toqueInicial.y;
    if (Math.abs(dx) + Math.abs(dy) > 28) {
      acionar(dy < -65 ? (dy < -125 ? 'alto' : 'baixo') : dx > 55 ? 'rolar' : 'deslizar');
    }
    toqueInicial = null;
  }, { passive: true });
  canvas.addEventListener('pointercancel', () => { toqueInicial = null; });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && telaAtual === 'tela-jogo') pausar();
  });
  mostrar('tela-inicio');
})();
