(async function () {
  'use strict';

  // --------------------------------------------------------------- preparação
  const $ = (id) => document.getElementById(id);
  const config = window.JOGO_CONFIG || {};
  const canvas = $('pista');
  const ctx = canvas.getContext('2d', { alpha: false });
  const fimCanvas = $('animacao-fim');
  const fimCtx = fimCanvas.getContext('2d', { alpha: false });
  const W = canvas.width;
  const H = canvas.height;
  const CHAO = 302;
  const CHAO_SUPERIOR = 194;
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
  let recuperacaoAte = 0;
  let pausado = false;
  let pausaEm = 0;
  let finalizado = false;
  let timerSaltoBaixo = null;
  let telaAtual = 'tela-inicio';
  let tremor = 0;
  const obstaculos = [];
  const particulas = [];
  const fragmentos = [];
  const camadas = new Map();
  const sprites = new Map();

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
  function prepararCenarios() {
    Regras.BIOMAS.forEach((bioma) => camadas.set(bioma.id, {
      distante: camadaCidade(bioma, 'distante'),
      medio: camadaCidade(bioma, 'medio'),
      perto: camadaCidade(bioma, 'perto')
    }));
  }
  prepararCenarios();

  // ------------------------------------------------------ sprites e efeitos animados
  const LARGURA_QUADRO = 64;
  const ALTURA_QUADRO = 96;
  const QUADROS = 8;
  function membro(c, x, y, largura, comprimento, angulo, cor, brilho) {
    c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(angulo);
    c.fillStyle = brilho; c.fillRect(-Math.ceil(largura / 2) - 2, 0, largura + 4, comprimento);
    c.fillStyle = cor; c.fillRect(-Math.floor(largura / 2), 1, largura, comprimento - 1);
    c.fillStyle = '#110d19'; c.fillRect(-Math.floor(largura / 2), comprimento - 4, largura + 1, 4);
    c.restore();
  }
  function desenharQuadroSprite(c, estadoSprite, indice) {
    const fase = indice / QUADROS * Math.PI * 2;
    const balanco = Math.sin(fase);
    const cor = '#08070c'; const borda = '#512b6b'; const neon = '#bd75e8';
    const cx = 32;
    if (estadoSprite === 'rolar') {
      if (indice < 2) {
        const dobra = indice === 0 ? 0 : 4;
        c.fillStyle = borda; c.fillRect(9, 55 + dobra, 43, 17);
        c.fillStyle = cor; c.fillRect(12, 56 + dobra, 37, 13);
        c.fillRect(35, 43 + dobra, 16, 15); c.fillStyle = neon; c.fillRect(45, 49 + dobra, 4, 2);
        c.fillStyle = '#21152a'; c.fillRect(12, 69 + dobra, 36, 5); return;
      }
      const giro = (indice - 2) / 6 * Math.PI * 2;
      c.save(); c.translate(cx, 54); c.rotate(giro);
      c.fillStyle = borda; c.fillRect(-24, -11, 49, 24);
      c.fillStyle = cor; c.fillRect(-21, -8, 43, 18);
      c.fillRect(12, -15, 13, 15); c.fillRect(17, -17, 8, 4);
      c.fillStyle = neon; c.fillRect(19, -11, 4, 2);
      c.fillStyle = '#24152d'; c.fillRect(-15, -5, 22, 3); c.restore();
      return;
    }
    if (estadoSprite === 'deslize') {
      const comp = indice < 2 ? 8 - indice * 4 : Math.sin(fase * .5) * 2;
      c.fillStyle = borda; c.fillRect(5, 61 + comp, 48, 17);
      c.fillStyle = cor; c.fillRect(8, 60 + comp, 43, 14);
      c.fillRect(34, 47 + comp, 18, 16); c.fillRect(41, 44 + comp, 10, 5);
      c.fillStyle = neon; c.fillRect(45, 51 + comp, 4, 2);
      c.fillStyle = '#21152a'; c.fillRect(9, 73 + comp, 38, 6);
      membro(c, 20, 73 + comp, 8, 13, -.4 + balanco * .2, cor, borda);
      return;
    }
    if (estadoSprite === 'queda') {
      const inclina = Math.min(1, indice / 5) * .9;
      c.save(); c.translate(cx, 78); c.rotate(inclina);
      c.fillStyle = borda; c.fillRect(-17, -43, 33, 46);
      c.fillStyle = cor; c.fillRect(-14, -41, 28, 41);
      c.fillRect(6, -61, 20, 20); c.fillStyle = neon; c.fillRect(19, -54, 5, 3);
      c.restore();
      membro(c, 24, 72, 9, 17, .9 - indice * .04, cor, borda);
      membro(c, 39, 73, 9, 17, -.8, cor, borda);
      return;
    }
    if (estadoSprite === 'recuperacao') {
      c.fillStyle = borda; c.fillRect(25, 14, 23, 20); c.fillRect(22, 21, 7, 10);
      c.fillStyle = cor; c.fillRect(28, 16, 17, 17); c.fillStyle = neon; c.fillRect(41, 23, 4, 2);
      c.fillStyle = borda; c.fillRect(24, 34, 28, 28); c.fillStyle = cor; c.fillRect(27, 36, 22, 24);
      membro(c, 28, 42 + indice, 9, 20, -.85 + indice * .1, cor, borda);
      membro(c, 47, 42, 9, 21, .2, cor, borda);
      membro(c, 33, 59, 10, 25, .48 - indice * .08, cor, borda);
      membro(c, 44, 59, 10, 26, -.12, cor, borda); return;
    }
    const pulando = estadoSprite === 'salto-baixo' || estadoSprite === 'salto-alto';
    const deslizaAltura = pulando ? Math.round(Math.sin((indice / (QUADROS - 1)) * Math.PI) * (estadoSprite === 'salto-alto' ? 13 : 7)) : 0;
    const corpo = 27 + (pulando ? deslizaAltura : Math.round(Math.sin(fase * 2) * 1));
    const joelho = pulando ? .28 + balanco * .1 : balanco * .72;
    const braco = pulando ? -1.3 + balanco * .22 : -balanco * .82;
    // Capuz, rosto escuro e gola formam uma silhueta consistente em todos os quadros.
    c.fillStyle = borda; c.fillRect(25, 7 + deslizaAltura, 22, 23); c.fillRect(22, 14 + deslizaAltura, 7, 12);
    c.fillStyle = cor; c.fillRect(28, 9 + deslizaAltura, 17, 19); c.fillRect(25, 16 + deslizaAltura, 5, 9);
    c.fillStyle = '#2a1835'; c.fillRect(40, 19 + deslizaAltura, 7, 3);
    c.fillStyle = neon; c.fillRect(41, 17 + deslizaAltura, 4, 2);
    c.fillStyle = borda; c.fillRect(23, corpo - 1, 27, 30); c.fillRect(26, corpo + 25, 22, 7);
    c.fillStyle = cor; c.fillRect(26, corpo, 22, 26); c.fillRect(28, corpo + 23, 18, 5);
    c.fillStyle = '#24162e'; c.fillRect(27, corpo + 6, 3, 15); c.fillRect(45, corpo + 4, 2, 15);
    const ombroY = corpo + 5;
    membro(c, 27, ombroY, 9, 24, braco, cor, borda);
    membro(c, 48, ombroY, 9, 22, pulando ? -1.05 - balanco * .18 : -braco, cor, borda);
    const quadrilY = corpo + 27;
    if (pulando) {
      membro(c, 32, quadrilY, 11, 21, .95 + joelho, cor, borda);
      membro(c, 43, quadrilY, 11, 20, -.75 - joelho, cor, borda);
      membro(c, 42, quadrilY + 15, 9, 17, 1.25, cor, borda);
      membro(c, 29, quadrilY + 13, 9, 17, -.95, cor, borda);
    } else {
      membro(c, 32, quadrilY, 11, 29, joelho, cor, borda);
      membro(c, 43, quadrilY, 11, 29, -joelho, cor, borda);
      c.fillStyle = '#19121f'; c.fillRect(25 + Math.round(Math.sin(fase) * 8), 88, 18, 5);
      c.fillRect(38 - Math.round(Math.sin(fase) * 8), 88, 18, 5);
      c.fillStyle = neon; c.fillRect(40 - Math.round(Math.sin(fase) * 8), 89, 8, 2);
    }
    c.fillStyle = neon; c.fillRect(26, corpo + 2, 3, 8);
  }
  function prepararSprites() {
    ['corrida', 'salto-baixo', 'salto-alto', 'deslize', 'rolar', 'queda', 'recuperacao'].forEach((tipo) => {
      const [folha, c] = canvasOffscreen(LARGURA_QUADRO * QUADROS, ALTURA_QUADRO);
      for (let i = 0; i < QUADROS; i++) {
        c.save(); c.translate(i * LARGURA_QUADRO, 0); c.beginPath(); c.rect(0, 0, LARGURA_QUADRO, ALTURA_QUADRO); c.clip();
        desenharQuadroSprite(c, tipo, i); c.restore();
      }
      sprites.set(tipo, folha);
    });
  }
  prepararSprites();
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
    manter = 0;
    for (let i = 0; i < fragmentos.length; i++) {
      const f = fragmentos[i]; f.idade += dt;
      if (f.idade >= f.vida) continue;
      if (f.idade >= f.atraso) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 230 * dt; f.rotacao += f.giro * dt; }
      fragmentos[manter++] = f;
    }
    fragmentos.length = manter;
  }
  function desenharParticulas() {
    for (const p of particulas) {
      ctx.globalAlpha = Math.max(0, 1 - p.idade / p.vida);
      ctx.fillStyle = p.cor; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(1, p.tamanho), Math.max(1, p.tamanho));
    }
    ctx.globalAlpha = 1;
    for (const f of fragmentos) {
      const t = Math.max(0, (f.idade - f.atraso) / (f.vida - f.atraso));
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t); ctx.translate(Math.round(f.x), Math.round(f.y)); ctx.rotate(f.rotacao);
      ctx.fillStyle = '#472c24'; ctx.fillRect(-f.w / 2 - 2, -f.h / 2 - 2, f.w + 4, f.h + 4);
      ctx.fillStyle = f.cor; ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.fillStyle = f.detalhe; ctx.fillRect(-f.w / 2 + 2, -f.h / 2 + 1, Math.max(2, f.w - 4), 2);
      ctx.restore();
    }
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
    const transicao = Regras.progressoTroca(estado, agora);
    const origem = transicao ? Regras.FAIXAS[transicao.origem].chao : Regras.FAIXAS[estado.faixa].chao;
    const destino = transicao ? Regras.FAIXAS[transicao.destino].chao : origem;
    const chao = Math.round(origem + (destino - origem) * (transicao ? transicao.t : 0));
    const corrida = acao.acao && !acao.vivo && agora < recuperacaoAte;
    const tipo = acao.vivo ? acao.acao === 'baixo' ? 'salto-baixo' : acao.acao === 'alto' ? 'salto-alto' : acao.acao : corrida ? 'recuperacao' : 'corrida';
    const spriteTipo = sprites.has(tipo) ? tipo : 'corrida';
    let p = acao.vivo ? acao.t : corrida ? 1 - Math.max(0, recuperacaoAte - agora) / 170 : 0;
    let altura = 0;
    if (spriteTipo === 'salto-baixo' || spriteTipo === 'salto-alto') altura = Math.sin(Math.PI * p) * (spriteTipo === 'salto-alto' ? 76 : 42);
    const frame = acao.vivo || corrida ? Math.min(QUADROS - 1, Math.floor(p * QUADROS)) : Math.floor(agora / (90 / Math.sqrt(estado.velocidade))) % QUADROS;
    const folha = sprites.get(spriteTipo);
    const sombraEscala = Math.max(.42, 1 - altura / 110);
    ctx.globalAlpha = .34; ctx.fillStyle = '#030207'; ctx.beginPath(); ctx.ellipse(X_CORREDOR + 28, chao - 4, 24 * sombraEscala, 5 * sombraEscala, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    const largura = 58; const alturaSprite = 88;
    const ajustePiso = spriteTipo === 'deslize' ? 9 : spriteTipo === 'rolar' ? 7 : 0;
    ctx.drawImage(folha, frame * LARGURA_QUADRO, 0, LARGURA_QUADRO, ALTURA_QUADRO,
      X_CORREDOR - 4, Math.round(chao - altura - alturaSprite + ajustePiso), largura, alturaSprite);
    if (!acao.vivo && !corrida && agora >= proximoPo) {
      emitir(X_CORREDOR + 8, chao - 5, 2, '#b082c5', 25, 2);
      proximoPo = agora + Math.max(90, 145 / estado.velocidade);
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
    ctx.fillStyle = '#11101b'; ctx.fillRect(0, CHAO_SUPERIOR + 62, W, H - CHAO_SUPERIOR - 62);
    desenharPista(bioma, CHAO_SUPERIOR, offset * .84, 'superior');
    desenharPista(bioma, CHAO, offset, 'inferior');
    if (tremor > 0) tremor = Math.max(0, tremor - dt * 25);
  }
  function desenharPista(bioma, chao, deslocamento, faixa) {
    const superior = faixa === 'superior';
    const destaque = superior ? '#5ee7e2' : '#d98aff';
    const asfalto = superior ? '#292b3c' : '#30283a';
    ctx.fillStyle = superior ? '#272739' : '#241e2d';
    ctx.fillRect(0, chao - 3, W, 68);
    ctx.fillStyle = '#11101a'; ctx.fillRect(0, chao + 2, W, 58);
    ctx.fillStyle = asfalto; ctx.fillRect(0, chao + 4, W, 51);
    ctx.fillStyle = superior ? '#827f96' : '#8f8197'; ctx.fillRect(0, chao - 4, W, 5);
    ctx.fillStyle = destaque; ctx.globalAlpha = .8; ctx.fillRect(0, chao - 1, W, 2); ctx.globalAlpha = 1;
    // Faixas em deslocamento independente dão velocidade e separam claramente os dois pisos.
    const risco = (deslocamento * 1.55) % 126;
    ctx.fillStyle = superior ? '#bbc7cc' : '#dfc88c';
    for (let x = -risco; x < W; x += 126) ctx.fillRect(x + 20, chao + 31, 48, 3);
    ctx.fillStyle = '#4d4654'; ctx.fillRect(0, chao + 55, W, 3);
    // Reforços e vigas da rota elevada projetam a pista superior sobre a cidade.
    if (superior) {
      const pilarOffset = (offset * .42) % 176;
      ctx.fillStyle = '#181722';
      for (let x = -pilarOffset; x < W + 70; x += 176) {
        ctx.fillRect(x + 34, chao + 58, 13, H - chao);
        ctx.fillRect(x + 25, chao + 57, 31, 4);
      }
      ctx.fillStyle = '#554866'; ctx.fillRect(0, chao + 5, W, 2);
    } else {
      ctx.fillStyle = bioma.id === 'parque' || bioma.id === 'floresta' ? '#4d7850' : '#50505b';
      ctx.fillRect(0, chao + 60, W, 5);
    }
    // Marcador lateral da rota é parte do cenário e acompanha o parallax.
    const placaX = 18 + Math.floor((deslocamento * .16) % 118);
    ctx.fillStyle = '#171321'; ctx.fillRect(placaX, chao - 27, 35, 19);
    ctx.fillStyle = destaque; ctx.fillRect(placaX + 4, chao - 23, 27, 3);
    ctx.fillStyle = '#f7edff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(superior ? 'ROTA 02' : 'ROTA 01', placaX + 17, chao - 13);
  }

  // -------------------------------------------------------------- obstáculos
  function desenharRotulo(o, regra) {
    if (o.x > 470 || o.x < -regra.largura) return;
    const dica = ACAO_DICA[regra.acao];
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    const largura = Math.ceil(ctx.measureText(dica).width) + 12;
    const x = o.x + regra.largura / 2;
    const piso = Regras.FAIXAS[o.faixa || 'inferior'].chao;
    const y = Math.max(23, piso - regra.altura - 35);
    ctx.fillStyle = '#0b0912'; ctx.fillRect(x - largura / 2, y - 15, largura, 19);
    ctx.strokeStyle = '#b779d2'; ctx.lineWidth = 1; ctx.strokeRect(x - largura / 2 + .5, y - 14.5, largura - 1, 18);
    ctx.fillStyle = '#f3d6ff'; ctx.fillText(dica, x, y - 2);
  }
  function desenharObstaculo(o) {
    const r = Regras.TIPOS[o.tipo];
    const x = Math.round(o.x); const y = Regras.FAIXAS[o.faixa || 'inferior'].chao;
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
      const impacto = o.quebraInicio == null ? -1 : performance.now() - o.quebraInicio;
      if (impacto > 85) return;
      const reagindo = impacto >= 0;
      const impulso = reagindo ? Math.sin(Math.PI * Math.min(1, impacto / 85)) : 0;
      ctx.save(); ctx.translate(x + r.largura / 2, y - r.altura / 2);
      if (reagindo) { ctx.rotate(impulso * .15); ctx.translate(impulso * -2, impulso * 2); }
      const cx = -r.largura / 2; const topo = -r.altura / 2;
      ctx.fillStyle = '#533322'; ctx.fillRect(cx + 1, topo + 3, r.largura - 2, r.altura - 2);
      ctx.fillStyle = '#a8663c'; ctx.fillRect(cx + 4, topo, r.largura - 8, r.altura - 5);
      ctx.fillStyle = '#d89a59'; ctx.fillRect(cx + 6, topo + 3, r.largura - 12, 4);
      ctx.fillStyle = '#8f5735'; ctx.fillRect(cx + 8, topo + 9, 4, r.altura - 17); ctx.fillRect(cx + r.largura - 12, topo + 9, 4, r.altura - 17);
      ctx.fillStyle = '#c9844b'; ctx.fillRect(cx + 10, topo + 20, r.largura - 20, 7);
      ctx.fillStyle = '#dfaa6a'; ctx.fillRect(cx + 13, topo + 21, r.largura - 26, 2);
      ctx.fillStyle = '#f4d29c'; ctx.fillRect(cx + 6, topo + 4, 3, 3); ctx.fillRect(cx + r.largura - 10, topo + 4, 3, 3);
      ctx.restore();
    }
    desenharRotulo(o, r);
  }

  function quebrarCaixa(o, agora) {
    o.quebraInicio = agora;
    const r = Regras.TIPOS.caixa;
    const x = o.x; const y = Regras.FAIXAS[o.faixa].chao - r.altura / 2;
    const pranchas = [
      { x: 5, y: -18, w: 16, h: 7 }, { x: 23, y: -18, w: 16, h: 7 },
      { x: 5, y: -8, w: 16, h: 6 }, { x: 23, y: -8, w: 16, h: 6 },
      { x: 8, y: 3, w: 13, h: 7 }, { x: 24, y: 3, w: 12, h: 7 },
      { x: 10, y: -15, w: 5, h: 18 }, { x: 30, y: -15, w: 5, h: 18 },
      { x: 18, y: -10, w: 9, h: 5 }
    ];
    for (let n = 0; n < 3; n++) {
      pranchas.forEach((p, i) => {
        if (fragmentos.length >= 100) return;
        const lado = p.x + p.w / 2 - r.largura / 2;
        fragmentos.push({ x: x + r.largura / 2 + lado, y: y + p.y,
          vx: (lado / 24) * (90 + Math.random() * 100) + 35, vy: -80 - Math.random() * 150,
          giro: (Math.random() - .5) * 15, rotacao: (Math.random() - .5) * .4,
          w: p.w * (.72 + Math.random() * .5), h: p.h * (.8 + Math.random() * .5),
          idade: 0, atraso: n * .025 + (i % 3) * .012, vida: .72 + Math.random() * .35,
          cor: i % 3 === 0 ? '#d39658' : '#a9683d', detalhe: '#f0bd7b' });
      });
    }
    // Faíscas angulosas acompanham as lascas sem virar uma explosão redonda genérica.
    emitir(x + r.largura / 2, y, 10, '#f5c879', 115, 2);
    tremor = 5;
  }

  function animarQueda(inicio, agora) {
    if (telaAtual !== 'tela-fim') return;
    const t = Math.min(1, Math.max(0, (agora - inicio) / 560));
    const quadroSprite = Math.min(QUADROS - 1, Math.floor(t * QUADROS));
    fimCtx.fillStyle = '#100d18'; fimCtx.fillRect(0, 0, fimCanvas.width, fimCanvas.height);
    fimCtx.fillStyle = '#272136'; fimCtx.fillRect(0, 17, fimCanvas.width, 92);
    fimCtx.fillStyle = '#41364a'; fimCtx.fillRect(0, 106, fimCanvas.width, 54);
    fimCtx.fillStyle = '#c895e7'; fimCtx.fillRect(0, 105, fimCanvas.width, 2);
    const movimento = (t * 260) % 160;
    fimCtx.fillStyle = '#e6d4a0';
    for (let x = -movimento; x < 680; x += 160) fimCtx.fillRect(x, 133, 66, 4);
    fimCtx.fillStyle = '#66dedc'; fimCtx.globalAlpha = .58; fimCtx.fillRect(42, 33, 72, 2); fimCtx.fillRect(482, 55, 102, 2); fimCtx.globalAlpha = 1;
    const queda = sprites.get('queda');
    fimCtx.drawImage(queda, quadroSprite * LARGURA_QUADRO, 0, LARGURA_QUADRO, ALTURA_QUADRO,
      X_CORREDOR - 5 + t * 30, 19 + t * 27, 62, 94);
    if (t < 1) frame = requestAnimationFrame((prox) => animarQueda(inicio, prox));
    else frame = 0;
  }

  // ----------------------------------------------------------- fluxo de jogo
  function acionar(acao) {
    if (!estado || finalizado || pausado) return;
    estado = Regras.aplicarAcao(estado, acao, performance.now());
    recuperacaoAte = Math.max(recuperacaoAte, estado.acaoAte + 170);
    $('mensagem').textContent = ACAO_TEXTO[acao];
    CrashierAudio.efeito(acao === 'baixo' ? 'salto-baixo' : acao === 'alto' ? 'salto-alto' : acao);
    const transicao = Regras.progressoTroca(estado, performance.now());
    const origem = transicao ? Regras.FAIXAS[transicao.origem].chao : Regras.FAIXAS[estado.faixa].chao;
    const destino = transicao ? Regras.FAIXAS[transicao.destino].chao : origem;
    const chaoAtual = Math.round(origem + (destino - origem) * (transicao ? transicao.t : 0));
    if (acao === 'baixo' || acao === 'alto') emitir(X_CORREDOR + 17, chaoAtual - 4, 5, '#bd9de0', 38, 3);
    else emitir(X_CORREDOR + 25, chaoAtual - 3, 4, acao === 'rolar' ? '#f1bd76' : '#c293dc', 32, 3);
  }
  function mudarFaixa(faixa) {
    if (!estado || finalizado || pausado || estado.trocaFaixa || estado.faixa === faixa) return;
    estado = Regras.trocarFaixa(estado, faixa, performance.now());
    $('mensagem').textContent = faixa === 'superior' ? 'MUDANDO PARA ROTA SUPERIOR' : 'MUDANDO PARA ROTA INFERIOR';
    CrashierAudio.efeito('faixa');
    const chao = Regras.FAIXAS[faixa].chao;
    emitir(X_CORREDOR + 22, chao - 4, 7, faixa === 'superior' ? '#74e6db' : '#d5a1f2', 48, 3);
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
    if (estado.trocaFaixa) estado = { ...estado, trocaFaixa: { ...estado.trocaFaixa, inicio: estado.trocaFaixa.inicio + tempoPausa, fim: estado.trocaFaixa.fim + tempoPausa } };
    anterior = agora; pausado = false; mostrar('tela-jogo');
    CrashierAudio.tocarMusica(); frame = requestAnimationFrame(quadro);
  }
  function voltarMenu() {
    cancelAnimationFrame(frame); frame = 0;
    if (timerSaltoBaixo !== null) { window.clearTimeout(timerSaltoBaixo); timerSaltoBaixo = null; }
    estado = null; pausado = false; finalizado = false; obstaculos.length = 0; particulas.length = 0; fragmentos.length = 0;
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
    animarQueda(performance.now(), performance.now());
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
    obstaculos.length = 0; particulas.length = 0; fragmentos.length = 0;
    acumuladoSpawn = 350; proximoIntervaloSpawn = Regras.intervaloSpawn(0);
    proximoId = 0; offset = 0; proximoPo = 0; recuperacaoAte = 0; tremor = 0;
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
    estado = Regras.atualizarFaixa(estado, agora);
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
      const mesmaFaixa = Regras.obstaculoNaFaixa(estado, obstaculo, agora);
      if (dentroDaZona && mesmaFaixa && Regras.podeSuperar(estado, obstaculo, agora)) {
        const resultado = Regras.resolverImpacto(estado, obstaculo, agora);
        if (!resultado.sucesso) continue;
        obstaculo.resolvido = true;
        estado = resultado.estado;
        recuperacaoAte = Math.max(recuperacaoAte, estado.acaoAte + 170);
        if (resultado.quebrou) quebrarCaixa(obstaculo, agora);
        tremor = Math.min(3, tremor + (resultado.quebrou ? 1.8 : .65));
        $('mensagem').textContent = resultado.quebrou ? 'CAIXA QUEBRADA! +' + resultado.pontos : 'OBSTÁCULO SUPERADO! +' + resultado.pontos;
        CrashierAudio.efeito(resultado.quebrou ? 'quebrar' : 'acerto');
        emitir(obstaculo.x + regra.largura / 2, Regras.FAIXAS[obstaculo.faixa].chao - 12, resultado.quebrou ? 13 : 7,
          resultado.quebrou ? '#f2bb71' : '#d9a7ff', resultado.quebrou ? 70 : 42, 4);
      } else if (mesmaFaixa && obstaculo.x + regra.largura < X_CORREDOR + 8) {
        obstaculo.resolvido = true;
        emitir(X_CORREDOR + 20, Regras.FAIXAS[obstaculo.faixa].chao - 28, 20, '#d293eb', 90, 5);
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
    obstaculos.forEach((obstaculo) => {
      if (!obstaculo.resolvido || (obstaculo.quebraInicio != null && agora - obstaculo.quebraInicio < 85)) desenharObstaculo(obstaculo);
    });
    desenharCorredor(agora);
    ctx.restore();
    $('distancia').textContent = Math.floor(estado.distancia).toLocaleString('pt-BR');
    $('pontos').textContent = Math.floor(estado.pontos).toLocaleString('pt-BR');
    $('velocidade').textContent = estado.velocidade.toFixed(1);
    $('bioma').textContent = bioma.nome;
    const faixaHUD = $('faixa-atual');
    faixaHUD.textContent = estado.trocaFaixa ? 'TROCANDO' : Regras.FAIXAS[estado.faixa].nome;
    faixaHUD.classList.toggle('texto-rota-superior', (estado.trocaFaixa ? estado.trocaFaixa.destino : estado.faixa) === 'superior');
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
  document.querySelectorAll('[data-faixa]').forEach((botao) => {
    botao.addEventListener('pointerdown', (evento) => { evento.preventDefault(); mudarFaixa(botao.dataset.faixa); });
  });
  window.addEventListener('keydown', (evento) => {
    if (evento.target && /^(INPUT|TEXTAREA|SELECT)$/.test(evento.target.tagName)) return;
    if (evento.code === 'Escape' || evento.code === 'KeyP') {
      if (!finalizado && estado) { evento.preventDefault(); pausado ? continuar() : pausar(); }
      return;
    }
    if (telaAtual !== 'tela-jogo') return;
    if (evento.code === 'KeyA') { evento.preventDefault(); if (!evento.repeat) mudarFaixa('inferior'); return; }
    if (evento.code === 'KeyD') { evento.preventDefault(); if (!evento.repeat) mudarFaixa('superior'); return; }
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
