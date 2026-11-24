import { Graphics } from '../../vendor/pixi.min.mjs';

const PISOS = { superior: 194, inferior: 302 };
const CORES_MADEIRA = ['#d69a60', '#b87745', '#e1af73', '#8f5938'];

export function criarEfeitos(stage, sorteio = Math.random) {
  const desenhos = new Graphics();
  stage.addChild(desenhos);
  const particulas = [];

  function emitir(x, y, quantidade, cores, potencia = 50, tamanho = 3) {
    for (let i = 0; i < quantidade && particulas.length < 120; i++) {
      const angulo = Math.PI + sorteio() * Math.PI;
      const velocidade = potencia * (.3 + sorteio() * .8);
      particulas.push({ x, y, vx: Math.cos(angulo) * velocidade, vy: Math.sin(angulo) * velocidade - 16,
        idade: 0, atraso: 0, vida: .28 + sorteio() * .34, tamanho: tamanho * (.7 + sorteio() * .8),
        cor: cores[Math.floor(sorteio() * cores.length)], gravidade: 130, rotacao: 0, giro: 0, madeira: false });
    }
  }

  function correr(faixa, x, agora, velocidade = 1) {
    const chao = PISOS[faixa];
    if (Math.floor(agora / Math.max(72, 145 / velocidade)) % 2 === 0) {
      emitir(x + 8, chao - 3, 2, ['#aa8bb7', '#70607e', '#d8a9e9'], 24, 2);
    }
  }

  function trocarFaixa(faixa, x) {
    emitir(x + 25, PISOS[faixa] - 8, 10, faixa === 'superior' ? ['#6ce6dc', '#c4fff8'] : ['#d38bf1', '#ffe0ff'], 54, 3);
  }

  function acao(acao, faixa, x) {
    const cor = acao === 'rolar' ? ['#f3c17e', '#dda05c'] : ['#d6a7ed', '#83e6df'];
    emitir(x + 23, PISOS[faixa] - 5, acao === 'rolar' ? 7 : 5, cor, 40, 3);
  }

  function quebrarCaixa(obstaculo) {
    const largura = 44; const altura = 42;
    const centroX = obstaculo.x + largura / 2;
    const centroY = PISOS[obstaculo.faixa] - altura / 2;
    const placas = [
      [5, -18, 16, 7], [23, -18, 16, 7], [5, -8, 16, 6], [23, -8, 16, 6],
      [8, 3, 13, 7], [24, 3, 12, 7], [10, -15, 5, 18], [30, -15, 5, 18], [18, -10, 9, 5]
    ];
    for (let repeticao = 0; repeticao < 3; repeticao++) {
      placas.forEach(([x, y, w, h], indice) => {
        if (particulas.length >= 120) return;
        const localX = x + w / 2 - largura / 2;
        particulas.push({ x: centroX + localX, y: centroY + y, vx: localX / 24 * (100 + sorteio() * 90) + 34,
          vy: -80 - sorteio() * 150, idade: 0, atraso: repeticao * .025 + indice % 3 * .012,
          vida: .72 + sorteio() * .35, w: w * (.72 + sorteio() * .5), h: h * (.8 + sorteio() * .5),
          cor: CORES_MADEIRA[Math.floor(sorteio() * CORES_MADEIRA.length)], gravidade: 230,
          rotacao: (sorteio() - .5) * .4, giro: (sorteio() - .5) * 15, madeira: true });
      });
    }
    emitir(centroX, centroY, 12, ['#fff0bd', '#f3c16e', '#a96d45'], 125, 2.5);
  }

  function colisao(faixa, x) {
    emitir(x + 22, PISOS[faixa] - 30, 24, ['#e7b2ff', '#d276f1', '#81e6df'], 95, 4);
  }

  function atualizar(dt) {
    let manter = 0;
    for (let i = 0; i < particulas.length; i++) {
      const p = particulas[i]; p.idade += dt;
      if (p.idade >= p.vida) continue;
      if (p.idade >= p.atraso) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.gravidade * dt; p.rotacao += p.giro * dt;
      }
      particulas[manter++] = p;
    }
    particulas.length = manter;
    desenhos.clear();
    for (const p of particulas) {
      const alpha = Math.max(0, 1 - Math.max(0, p.idade - p.atraso) / (p.vida - p.atraso));
      if (p.madeira) {
        const cos = Math.cos(p.rotacao); const sin = Math.sin(p.rotacao);
        const pontos = [];
        for (const [dx, dy] of [[-p.w / 2, -p.h / 2], [p.w / 2, -p.h / 2], [p.w / 2, p.h / 2], [-p.w / 2, p.h / 2]]) {
          pontos.push(p.x + dx * cos - dy * sin, p.y + dx * sin + dy * cos);
        }
        desenhos.poly(pontos).fill({ color: p.cor, alpha });
        desenhos.poly([pontos[0], pontos[1], pontos[2], pontos[3]]).stroke({ color: '#593922', alpha: alpha * .8, width: 1 });
        desenhos.poly([pontos[0] + 2, pontos[1] + 2, pontos[2] - 3, pontos[3] + 2, pontos[4] - 3, pontos[5] - 2, pontos[6] + 2, pontos[7] - 2]).fill({ color: '#f2c98e', alpha: alpha * .7 });
      } else {
        const size = Math.max(1, p.tamanho * alpha);
        desenhos.rect(Math.round(p.x), Math.round(p.y), size, size).fill({ color: p.cor, alpha });
      }
    }
  }

  function limpar() { particulas.length = 0; desenhos.clear(); }
  return { correr, trocarFaixa, acao, quebrarCaixa, colisao, atualizar, limpar, particulas };
}
