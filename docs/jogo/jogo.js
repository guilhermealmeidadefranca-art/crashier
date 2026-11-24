(async function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const config = window.JOGO_CONFIG || {};
  const canvas = $('pista');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  document.title = config.nome || 'Crashier';
  $('titulo').textContent = config.nome || 'CRASHIER';
  if (config.cor) {
    document.documentElement.style.setProperty('--cor', config.cor);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', config.cor);
  }

  PlacarUI.montar($('painel-placar'));
  const progresso = await Placar.iniciar();
  $('melhor').textContent = progresso.melhor;
  Placar.aoMudar((p) => { $('melhor').textContent = p.melhor; });

  let estado;
  let anterior = 0;
  let acumuladoSpawn = 0;
  let proximoId = 0;
  let frame = 0;
  let offsetFundo = 0;
  let finalizado = false;
  const obstaculos = [];
  const xJogador = 103;
  const yChao = 201;
  const teclas = { ArrowDown: 'deslizar', ArrowRight: 'rolar' };
  const INTERVALO_SALTO_DUPLO = 280;
  let timerSaltoBaixo = null;

  function mostrar(tela) {
    ['tela-inicio', 'tela-jogo', 'tela-fim'].forEach((id) => { $(id).hidden = id !== tela; });
  }
  function acionar(acao) {
    if (!estado || estado.terminou) return;
    estado = Regras.aplicarAcao(estado, acao, performance.now());
    $('mensagem').textContent = ({ baixo: 'SALTO BAIXO!', alto: 'SALTO ALTO!', deslizar: 'DESLIZANDO!', rolar: 'ROLANDO!' })[acao];
  }
  function desenharFundo(bioma) {
    const [ceu, predio, acento] = bioma.paleta;
    ctx.fillStyle = ceu; ctx.fillRect(0, 0, W, H);
    if (bioma.id === 'rodovia') {
      ctx.fillStyle = '#172236'; ctx.fillRect(0, 110, W, 90);
      ctx.fillStyle = '#3d4554'; ctx.fillRect(0, 145, W, 55);
      ctx.fillStyle = '#e2d4aa';
      for (let x = -((offsetFundo * 0.6) % 74); x < W; x += 74) ctx.fillRect(x, 172, 38, 3);
      for (let i = 0; i < 4; i++) {
        const x = ((i * 150 - offsetFundo * 0.25) % (W + 160) + W + 160) % (W + 160) - 80;
        ctx.fillStyle = '#111827'; ctx.fillRect(x, 103, 52, 30);
        ctx.fillStyle = acento; ctx.fillRect(x + 7, 108, 29, 10);
      }
    } else if (bioma.id === 'parque' || bioma.id === 'floresta') {
      ctx.fillStyle = '#182b25'; ctx.fillRect(0, 96, W, 106);
      for (let i = 0; i < 9; i++) {
        const x = ((i * 68 - offsetFundo * (bioma.id === 'floresta' ? .32 : .18)) % (W + 70) + W + 70) % (W + 70) - 35;
        ctx.fillStyle = '#362c26'; ctx.fillRect(x + 12, 99, 9, 65);
        ctx.fillStyle = i % 2 ? '#23613e' : acento; ctx.fillRect(x, 71 + (i % 3) * 7, 34, 35);
        ctx.fillStyle = '#3a8350'; ctx.fillRect(x + 5, 65 + (i % 3) * 7, 24, 15);
      }
    } else {
      // Corredores e cômodos de casas: portas, janelas acesas e móveis passam ao fundo.
      ctx.fillStyle = '#211b30'; ctx.fillRect(0, 72, W, 130);
      ctx.fillStyle = '#342b45'; ctx.fillRect(0, 72, W, 8);
      const deslocamento = (offsetFundo * .32) % 160;
      for (let i = -1; i < 5; i++) {
        const x = i * 160 - deslocamento;
        ctx.fillStyle = '#554363'; ctx.fillRect(x + 12, 91, 53, 50);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(x + 17, 96, 43, 39);
        ctx.fillStyle = '#32263e'; ctx.fillRect(x + 20, 99, 17, 33); ctx.fillRect(x + 40, 99, 17, 33);
        ctx.fillStyle = '#a855f7'; ctx.fillRect(x + 77, 83, 47, 87);
        ctx.fillStyle = '#30213d'; ctx.fillRect(x + 83, 90, 35, 76);
        ctx.fillStyle = '#e9d5ff'; ctx.fillRect(x + 108, 127, 4, 4);
        ctx.fillStyle = '#62452f'; ctx.fillRect(x + 3, 172, 72, 8);
        ctx.fillStyle = '#34271f'; ctx.fillRect(x + 12, 180, 5, 17); ctx.fillRect(x + 62, 180, 5, 17);
        ctx.fillStyle = '#2a1d34'; ctx.fillRect(x + 126, 154, 22, 47);
        ctx.fillStyle = acento; ctx.fillRect(x + 132, 160, 9, 4);
      }
      ctx.fillStyle = predio; ctx.fillRect(0, 199, W, 4);
    }
    ctx.fillStyle = '#292337'; ctx.fillRect(0, yChao, W, H - yChao);
    ctx.fillStyle = '#77707f'; ctx.fillRect(0, yChao, W, 4);
    ctx.fillStyle = '#453b4e';
    for (let x = -((offsetFundo * 1.4) % 28); x < W; x += 28) ctx.fillRect(x, yChao + 16, 15, 3);
    ctx.fillStyle = '#14121b'; ctx.fillRect(0, 248, W, 22);
  }
  function desenharJogador(agora) {
    const ativo = estado.acao && agora < estado.acaoAte ? estado.acao : '';
    const pulando = ativo === 'baixo' || ativo === 'alto';
    const altura = ativo === 'alto' ? 62 : ativo === 'baixo' ? 34 : 0;
    const rolando = ativo === 'rolar';
    const deslizando = ativo === 'deslizar';
    const base = yChao - altura;
    ctx.fillStyle = '#050507';
    if (pulando) {
      ctx.fillRect(xJogador + 9, base - 24, 13, 13); ctx.fillRect(xJogador + 8, base - 10, 16, 22);
      ctx.fillRect(xJogador + 1, base - 4, 10, 5); ctx.fillRect(xJogador + 21, base - 2, 11, 5);
      ctx.fillRect(xJogador + 9, base + 10, 6, 15); ctx.fillRect(xJogador + 19, base + 10, 6, 14);
    } else if (deslizando) {
      ctx.fillRect(xJogador + 2, yChao - 13, 32, 9); ctx.fillRect(xJogador + 20, yChao - 22, 11, 10);
    } else if (rolando) {
      ctx.fillRect(xJogador + 5, yChao - 18, 20, 12); ctx.fillRect(xJogador + 8, yChao - 23, 13, 6);
    } else {
      const passo = Math.floor(agora / 95) % 2;
      ctx.fillRect(xJogador + 11, yChao - 39, 13, 13); ctx.fillRect(xJogador + 8, yChao - 27, 19, 20);
      ctx.fillRect(xJogador + 4, yChao - 22, 7, 14); ctx.fillRect(xJogador + 25, yChao - 22, 7, 14);
      ctx.fillRect(xJogador + 9, yChao - 9, 7, passo ? 9 : 6); ctx.fillRect(xJogador + 20, yChao - 9, 7, passo ? 6 : 9);
    }
  }
  function desenharObstaculo(o) {
    const r = Regras.TIPOS[o.tipo];
    const x = Math.round(o.x);
    if (o.tipo === 'caixa') {
      ctx.fillStyle = '#9a572d'; ctx.fillRect(x, yChao - r.altura, r.largura, r.altura);
      ctx.strokeStyle = '#e1a15f'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, yChao - r.altura + 2, r.largura - 4, r.altura - 4);
      ctx.beginPath(); ctx.moveTo(x + 5, yChao - 5); ctx.lineTo(x + r.largura - 5, yChao - r.altura + 5); ctx.stroke();
    } else if (o.tipo === 'cerca') {
      ctx.fillStyle = '#d9c9aa'; ctx.fillRect(x, yChao - 35, r.largura, 6); ctx.fillRect(x + 4, yChao - 35, 5, 35); ctx.fillRect(x + r.largura - 9, yChao - 35, 5, 35);
    } else if (o.tipo === 'galho') {
      ctx.fillStyle = '#765137'; ctx.fillRect(x, yChao - 46, r.largura, 8); ctx.fillStyle = '#326344'; ctx.fillRect(x + 10, yChao - 53, r.largura - 16, 12);
    } else if (o.tipo === 'carro' || o.tipo === 'caminhão') {
      const h = r.altura; ctx.fillStyle = o.tipo === 'carro' ? '#ef4444' : '#f97316';
      ctx.fillRect(x, yChao - h + 12, r.largura, h - 12); ctx.fillRect(x + 12, yChao - h, r.largura - 25, 16);
      ctx.fillStyle = '#a5d8ff'; ctx.fillRect(x + 17, yChao - h + 4, 12, 9);
      ctx.fillStyle = '#101018'; ctx.fillRect(x + 8, yChao - 6, 13, 9); ctx.fillRect(x + r.largura - 22, yChao - 6, 13, 9);
    } else if (o.tipo === 'cone') {
      ctx.fillStyle = '#fb923c'; ctx.fillRect(x + 6, yChao - 23, 8, 20); ctx.fillRect(x + 3, yChao - 11, 14, 4); ctx.fillRect(x, yChao - 4, 20, 4);
    } else {
      ctx.fillStyle = '#4fc3d7'; ctx.fillRect(x, yChao - 7, r.largura, 7); ctx.fillStyle = '#a5f3fc'; ctx.fillRect(x + 4, yChao - 6, 9, 2);
    }
  }
  function desenhar(agora) {
    const bioma = Regras.biomaEm(estado.distancia);
    desenharFundo(bioma);
    obstaculos.forEach(desenharObstaculo);
    desenharJogador(agora);
    $('bioma').textContent = bioma.nome;
  }
  function encerrar(motivo) {
    if (!estado || finalizado) return;
    finalizado = true;
    estado = Regras.terminar(estado);
    cancelAnimationFrame(frame);
    $('resultado').textContent = Math.floor(estado.pontos);
    const tipo = Regras.TIPOS[motivo];
    $('causa-fim').textContent = motivo ? `A sombra bateu em ${tipo ? ({ poça: 'uma poça', cone: 'um cone', carro: 'um carro', caminhão: 'um caminhão', cerca: 'uma cerca', galho: 'um galho', caixa: 'uma caixa' })[motivo] : 'um obstáculo'}.` : 'A cidade ficou para trás.';
    $('situacao-salvamento').textContent = 'Salvando recorde…';
    mostrar('tela-fim');
    Placar.registrarPartida(Math.floor(estado.pontos), { distancia: Math.floor(estado.distancia), obstaculos: estado.obstaculos })
      .then((salvo) => { $('situacao-salvamento').textContent = Placar.modo() === 'nuvem' && !salvo.salvoNaNuvem ? 'Recorde guardado neste aparelho; entre para enviar ao ranking.' : 'Recorde registrado.'; })
      .catch(() => { $('situacao-salvamento').textContent = 'Não foi possível salvar o recorde.'; });
  }
  function quadro(agora) {
    if (!estado || estado.terminou) return;
    const delta = Math.min(50, agora - anterior); anterior = agora;
    estado = Regras.avancar(estado, delta);
    const pixels = 190 * estado.velocidade * delta / 1000;
    offsetFundo += pixels;
    acumuladoSpawn += delta;
    const intervalo = Math.max(690, 1450 - estado.distancia * .24);
    if (acumuladoSpawn >= intervalo) {
      acumuladoSpawn = 0;
      obstaculos.push(Regras.criarObstaculo(Math.random, ++proximoId, estado.distancia));
    }
    for (const o of obstaculos) {
      o.x -= pixels;
      if (!o.resolvido && o.x <= xJogador + 31) {
        o.resolvido = true;
        const resultado = Regras.resolverImpacto(estado, o, agora);
        estado = resultado.estado;
        if (!resultado.sucesso) { encerrar(resultado.motivo); return; }
        $('mensagem').textContent = resultado.quebrou ? 'CRASH! Caixa quebrada +' + resultado.pontos : 'LIMPO! +' + resultado.pontos;
      }
    }
    for (let i = obstaculos.length - 1; i >= 0; i--) if (obstaculos[i].x < -90) obstaculos.splice(i, 1);
    $('pontos').textContent = Math.floor(estado.pontos).toLocaleString('pt-BR');
    $('velocidade').textContent = estado.velocidade.toFixed(1);
    desenhar(agora);
    frame = requestAnimationFrame(quadro);
  }
  function comecar() {
    cancelAnimationFrame(frame);
    finalizado = false;
    estado = Regras.novaPartida();
    obstaculos.length = 0; acumuladoSpawn = 450; proximoId = 0; offsetFundo = 0;
    anterior = performance.now();
    $('mensagem').textContent = 'CORRA!';
    mostrar('tela-jogo');
    desenhar(anterior);
    frame = requestAnimationFrame(quadro);
  }

  $('botao-jogar').addEventListener('click', comecar);
  $('botao-de-novo').addEventListener('click', comecar);
  document.querySelectorAll('[data-acao]').forEach((botao) => {
    botao.addEventListener('pointerdown', (evento) => { evento.preventDefault(); acionar(botao.dataset.acao); });
  });
  window.addEventListener('keydown', (evento) => {
    if ($('tela-jogo').hidden) return;
    if (evento.code === 'ArrowUp') {
      evento.preventDefault();
      if (evento.repeat) return;
      if (timerSaltoBaixo !== null) {
        window.clearTimeout(timerSaltoBaixo);
        timerSaltoBaixo = null;
        acionar('alto');
      } else {
        timerSaltoBaixo = window.setTimeout(() => {
          timerSaltoBaixo = null;
          acionar('baixo');
        }, INTERVALO_SALTO_DUPLO);
      }
      return;
    }
    const acao = teclas[evento.code];
    if (acao) { evento.preventDefault(); if (!evento.repeat) acionar(acao); }
  });
  let inicioToque = null;
  canvas.addEventListener('pointerdown', (evento) => { inicioToque = { x: evento.clientX, y: evento.clientY }; });
  canvas.addEventListener('pointerup', (evento) => {
    if (!inicioToque) return;
    const dx = evento.clientX - inicioToque.x; const dy = evento.clientY - inicioToque.y;
    if (Math.abs(dx) + Math.abs(dy) > 24) acionar(dy < -45 ? (dy < -90 ? 'alto' : 'baixo') : dx < -45 ? 'rolar' : 'deslizar');
    inicioToque = null;
  });
  mostrar('tela-inicio');
})();
