import { Container, Graphics, Text } from '../../vendor/pixi.min.mjs';

const W = 640;
const H = 360;
const PISOS = { superior: 194, inferior: 302 };
const BIOMAS = {
  bairro: { ceu: ['#141329', '#281c40'], predios: ['#34234d', '#42305c', '#29283e'], luz: '#ffcc80', verde: '#72dbd4' },
  rodovia: { ceu: ['#101827', '#283653'], predios: ['#283951', '#35425b', '#21283c'], luz: '#ffd08a', verde: '#75dff3' },
  parque: { ceu: ['#10241f', '#244b3b'], predios: ['#1c4b3a', '#276148', '#31553d'], luz: '#ffe29c', verde: '#a3df72' },
  floresta: { ceu: ['#0c1b20', '#1e3c37'], predios: ['#183d35', '#235144', '#2e4937'], luz: '#e8d99b', verde: '#a5d96f' }
};

function aleatorio(indice) {
  const x = Math.sin(indice * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function retangulo(g, x, y, w, h, cor, alpha = 1) {
  g.rect(x, y, w, h).fill({ color: cor, alpha });
}

function predio(seed, base, profundidade, paleta, luz) {
  const g = new Graphics();
  const w = 34 + Math.floor(aleatorio(seed) * 45);
  const h = 55 + Math.floor(aleatorio(seed + 6) * (profundidade === 0 ? 72 : 118));
  const y = base - h;
  retangulo(g, 0, y, w, h, paleta[seed % paleta.length]);
  retangulo(g, w - 4, y + 4, 4, h - 4, '#11101b', .68);
  if (profundidade > 0) {
    retangulo(g, 2, y + 6, w - 6, 3, '#d68aff', .72);
    retangulo(g, w * .25, y - 8, w * .52, 8, '#211c31');
  }
  const colunas = Math.max(1, Math.floor((w - 10) / 11));
  for (let yy = y + 13; yy < base - 10; yy += 15) {
    for (let col = 0; col < colunas; col++) {
      const acesa = aleatorio(seed * 47 + yy * 3 + col) > (profundidade === 0 ? .56 : .32);
      if (acesa) retangulo(g, 6 + col * 11, yy, 4, 7, (col + seed) % 4 === 0 ? luz : '#91d9ef', .72 + aleatorio(seed + col) * .28);
    }
  }
  g.position.x = seed * 7;
  return { g, largura: w };
}

function criarCamada(profundidade, paleta, luz) {
  const faixa = new Container();
  const larguraFaixa = 1024;
  const grupos = [new Container(), new Container()];
  grupos.forEach((grupo, repeticao) => {
    grupo.x = repeticao * larguraFaixa;
    let x = 0;
    for (let i = 0; i < 18; i++) {
      const edificio = predio(i + repeticao * 19 + profundidade * 100, profundidade === 0 ? 210 : profundidade === 1 ? 255 : 278, profundidade, paleta, luz);
      edificio.g.x = x;
      grupo.addChild(edificio.g);
      x += edificio.largura + 10 + Math.floor(aleatorio(i + repeticao) * 17);
    }
    faixa.addChild(grupo);
  });
  faixa._grupos = grupos;
  faixa._larguraFaixa = larguraFaixa;
  faixa._profundidade = profundidade;
  return faixa;
}

export function criarCidade(stage) {
  const fundo = new Container();
  const ceu = new Graphics();
  fundo.addChild(ceu);
  const lua = new Graphics();
  lua.circle(522, 54, 23).fill({ color: '#e8d5ff', alpha: .92 });
  lua.circle(532, 49, 19).fill({ color: '#251b38', alpha: .86 });
  lua.circle(522, 54, 34).fill({ color: '#bf82e7', alpha: .09 });
  fundo.addChild(lua);
  const estrelas = new Graphics();
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(aleatorio(i + 710) * W);
    const y = Math.floor(aleatorio(i + 900) * 128) + 12;
    retangulo(estrelas, x, y, i % 7 === 0 ? 3 : 2, i % 7 === 0 ? 3 : 2, '#e4d7ff', .25 + aleatorio(i + 88) * .55);
  }
  fundo.addChild(estrelas);
  stage.addChild(fundo);

  const camadas = [0, 1, 2].map((nivel) => criarCamada(nivel, BIOMAS.bairro.predios, BIOMAS.bairro.luz));
  camadas.forEach((c) => stage.addChild(c));
  const copas = new Graphics();
  stage.addChild(copas);

  const cidadeReflexo = new Graphics();
  for (let i = 0; i < 24; i++) {
    retangulo(cidadeReflexo, i * 29, 264 + (i % 5) * 3, 9 + (i % 4) * 3, 1, '#d98aff', .12);
  }
  stage.addChild(cidadeReflexo);

  const pistas = new Container();
  const sombras = new Graphics();
  const estradas = new Graphics();
  const linhas = new Graphics();
  pistas.addChild(sombras, estradas, linhas);
  stage.addChild(pistas);

  const placas = new Container();
  const placaSuperior = new Graphics();
  placaSuperior.roundRect(0, 0, 46, 22, 3).fill({ color: '#14272c' });
  placaSuperior.rect(0, 0, 3, 22).fill({ color: '#64e5dd' });
  const textoSuperior = new Text({ text: 'ROTA 02', style: { fontFamily: 'monospace', fontSize: 8, fontWeight: 'bold', fill: '#b9fffa' } });
  textoSuperior.position.set(7, 6);
  placaSuperior.addChild(textoSuperior);
  placaSuperior.position.set(24, PISOS.superior - 31);
  const placaInferior = new Graphics();
  placaInferior.roundRect(0, 0, 46, 22, 3).fill({ color: '#251a2e' });
  placaInferior.rect(0, 0, 3, 22).fill({ color: '#d68aff' });
  const textoInferior = new Text({ text: 'ROTA 01', style: { fontFamily: 'monospace', fontSize: 8, fontWeight: 'bold', fill: '#f1d4ff' } });
  textoInferior.position.set(7, 6);
  placaInferior.addChild(textoInferior);
  placaInferior.position.set(24, PISOS.inferior - 31);
  placas.addChild(placaSuperior, placaInferior); stage.addChild(placas);

  let setorAtual = '';
  function desenharBioma(setor) {
    const paleta = BIOMAS[setor] || BIOMAS.bairro;
    ceu.clear();
    for (let i = 0; i < 8; i++) retangulo(ceu, 0, i * 28, W, 30, i < 4 ? paleta.ceu[0] : paleta.ceu[1], .94 - i * .025);
    camadas.forEach((camada) => {
      camada.children.forEach((grupo) => {
        grupo.children.forEach((g, indice) => {
          // O contorno escuro preserva a leitura dos obstáculos à frente.
          g.tint = paleta.predios[(indice + camada._profundidade) % paleta.predios.length];
        });
      });
    });
    copas.clear();
    if (setor === 'parque' || setor === 'floresta') {
      for (let i = 0; i < 12; i++) {
        const x = (i * 72 + 10) % W;
        retangulo(copas, x + 18, 218 - (i % 3) * 13, 8, 68 + (i % 3) * 8, '#50382c');
        copas.circle(x + 22, 187 - (i % 3) * 13, 29).fill({ color: i % 2 ? '#226044' : '#34815a', alpha: .9 });
        copas.circle(x + 14, 178 - (i % 3) * 13, 14).fill({ color: '#5c9e63', alpha: .55 });
      }
    } else if (setor === 'rodovia') {
      retangulo(copas, 0, 154, W, 3, '#aab4c2', .65);
      for (let x = 40; x < W; x += 184) {
        retangulo(copas, x, 157, 5, 38, '#7b8696');
        retangulo(copas, x - 14, 144, 102, 22, '#1a2738');
        retangulo(copas, x - 7, 149, 88, 3, '#ffd48a', .74);
      }
    }
    setorAtual = setor;
  }

  function atualizar(distance, speed, setor) {
    if (setor !== setorAtual) desenharBioma(setor);
    const deslocamento = distance * .85;
    camadas.forEach((camada) => {
      const fator = [0.08, 0.22, 0.48][camada._profundidade];
      const x = -((deslocamento * fator) % camada._larguraFaixa);
      camada._grupos[0].x = x;
      camada._grupos[1].x = x + camada._larguraFaixa;
    });
    sombras.clear(); estradas.clear(); linhas.clear();
    for (const [nome, piso] of Object.entries(PISOS)) {
      const superior = nome === 'superior';
      const neon = superior ? '#5ee7e2' : '#d98aff';
      const asfalto = superior ? '#272b3a' : '#302638';
      retangulo(sombras, 0, piso - 4, W, 68, '#0a0910', .92);
      retangulo(estradas, 0, piso - 2, W, 5, '#9790a7');
      retangulo(estradas, 0, piso + 3, W, 52, asfalto);
      retangulo(estradas, 0, piso + 4, W, 2, neon, .8);
      retangulo(estradas, 0, piso + 55, W, 5, '#15131c');
      const risco = (distance * (superior ? 1.16 : 1.55)) % 126;
      for (let x = -risco; x < W + 60; x += 126) retangulo(linhas, x + 20, piso + 31, 48, 3, superior ? '#a8c5c7' : '#d8c087', .82);
      for (let x = -((distance * .42) % 176); x < W + 70; x += 176) {
        if (superior) {
          retangulo(sombras, x + 34, piso + 57, 13, H - piso, '#191722');
          retangulo(sombras, x + 25, piso + 56, 31, 4, '#675577');
        } else {
          retangulo(estradas, x, piso + 60, 80, 4, '#5c7253', .8);
        }
      }
      retangulo(linhas, 0, piso - 1, W, 2, neon, .84);
    }
    cidadeReflexo.x = -(distance * .3 % 116);
    cidadeReflexo.alpha = .7 + Math.sin(distance * .014) * .12;
  }

  desenharBioma('bairro');
  atualizar(0, 1, 'bairro');
  return { atualizar, pisos: PISOS, biomas: BIOMAS };
}
