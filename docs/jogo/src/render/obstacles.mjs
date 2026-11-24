import { Container, Graphics, Text } from '../../vendor/pixi.min.mjs';

const PISOS = { superior: 194, inferior: 302 };
const DICAS = { baixo: '↑ PULO BAIXO', alto: '↑↑ PULO ALTO', deslizar: '↓ DESLIZE', rolar: '→ ROLE' };
const CORES = { poça: 0x47d6e2, cone: 0xff944f, carro: 0xff718e, caminhão: 0xffc16a, mesa: 0xd99a61, cerca: 0xe5d5ad, galho: 0x73b976, caixa: 0xd69a60 };

function placa(texto, cor) {
  const g = new Graphics();
  g.roundRect(0, 0, 92, 19, 4).fill({ color: '#100e18', alpha: .94 });
  g.roundRect(0, 0, 92, 19, 4).stroke({ color: cor, alpha: .9, width: 1 });
  const t = new Text({ text: texto, style: { fontFamily: 'monospace', fontSize: 8, fontWeight: 'bold', fill: '#fff4ff', align: 'center' } });
  t.anchor.set(.5); t.position.set(46, 10); g.addChild(t); return g;
}

function desenho(tipo, largura, altura) {
  const g = new Graphics();
  const w = largura; const h = altura;
  if (tipo === 'poça') {
    g.ellipse(w / 2, -4, w / 2, 7).fill({ color: '#071724' });
    g.ellipse(w / 2, -6, w / 2 - 4, 4).fill({ color: '#38bcd7', alpha: .9 });
    g.ellipse(w * .32, -7, 7, 1.4).fill({ color: '#d5ffff', alpha: .85 });
    g.ellipse(w * .7, -4, 4, 1).fill({ color: '#a1f5ee', alpha: .76 });
  } else if (tipo === 'cone') {
    g.roundRect(1, -7, w - 2, 5, 2).fill({ color: '#221820' });
    g.poly([w * .5, -h, w * .82, -9, w * .18, -9]).fill({ color: '#ff8541' });
    g.poly([w * .5, -h + 5, w * .61, -h + 19, w * .39, -h + 19]).fill({ color: '#ffd7a2' });
    g.roundRect(w * .26, -18, w * .48, 4, 1).fill({ color: '#fff1d6' });
    g.rect(w * .23, -8, w * .54, 2).fill({ color: '#d55637' });
  } else if (tipo === 'carro') {
    g.roundRect(4, -26, w - 8, 22, 5).fill({ color: '#8c274c' });
    g.roundRect(17, -47, w - 34, 25, 7).fill({ color: '#c84168' });
    g.roundRect(22, -43, 18, 15, 4).fill({ color: '#91dce8' });
    g.roundRect(43, -43, 17, 15, 4).fill({ color: '#a9edf0' });
    g.rect(8, -17, w - 16, 4).fill({ color: '#f27a91' });
    g.roundRect(10, -11, 18, 12, 5).fill({ color: '#11121b' }); g.roundRect(w - 28, -11, 18, 12, 5).fill({ color: '#11121b' });
    g.rect(13, -8, 10, 3).fill({ color: '#d9e3e8' }); g.rect(w - 25, -8, 10, 3).fill({ color: '#d9e3e8' });
    g.roundRect(w - 8, -25, 5, 5, 2).fill({ color: '#fff1ab' });
  } else if (tipo === 'caminhão') {
    g.roundRect(0, -h + 5, w * .7, h - 8, 4).fill({ color: '#bd873d' });
    g.rect(5, -h + 10, w * .58, 5).fill({ color: '#f6c66e' });
    for (let x = 14; x < w * .64; x += 18) g.roundRect(x, -h + 18, 3, h - 31, 1).fill({ color: '#8d5c35' });
    g.roundRect(w * .66, -h + 22, w * .32, h - 25, 5).fill({ color: '#d85f4e' });
    g.roundRect(w * .77, -h + 27, w * .17, 14, 3).fill({ color: '#9bd8e0' });
    g.roundRect(10, -10, 20, 14, 5).fill({ color: '#11121b' }); g.roundRect(w - 29, -10, 20, 14, 5).fill({ color: '#11121b' });
    g.rect(w - 9, -24, 6, 7).fill({ color: '#fff0a6' });
  } else if (tipo === 'mesa') {
    g.roundRect(0, -h, w, 13, 4).fill({ color: '#633d2c' });
    g.roundRect(0, -h - 4, w - 4, 9, 3).fill({ color: '#cf925c' });
    g.rect(8, -h - 2, w - 22, 2).fill({ color: '#f0c287' });
    g.roundRect(10, -h + 10, 9, h - 12, 3).fill({ color: '#714a35' });
    g.roundRect(w - 20, -h + 10, 9, h - 12, 3).fill({ color: '#714a35' });
    g.rect(20, -h + 13, w - 40, 2).fill({ color: '#251d27', alpha: .8 });
  } else if (tipo === 'cerca') {
    g.rect(0, -h + 3, w, 9).fill({ color: '#d9c9a1' });
    g.rect(0, -h + 4, w, 2).fill({ color: '#fff0d1' });
    for (let x = 5; x < w; x += 20) {
      g.roundRect(x, -h + 10, 7, h - 11, 2).fill({ color: '#8b7559' });
      g.rect(x + 1, -h + 13, 2, h - 17).fill({ color: '#e0d1b4', alpha: .75 });
    }
    g.rect(-4, -4, w + 8, 5).fill({ color: '#51423a' });
  } else if (tipo === 'galho') {
    g.roundRect(4, -28, w - 8, 9, 4).fill({ color: '#6f482d' });
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * (w - 24) / 6;
      g.circle(x + 10, -35 - (i % 2) * 7, 12 + (i % 3) * 2).fill({ color: i % 2 ? '#347752' : '#57975e' });
      g.circle(x + 7, -40 - (i % 2) * 7, 4).fill({ color: '#99c86c', alpha: .75 });
    }
  } else if (tipo === 'caixa') {
    g.rect(0, -h + 2, w, h - 2).fill({ color: '#613d2b' });
    g.rect(3, -h, w - 6, h - 7).fill({ color: '#a9683d' });
    g.rect(6, -h + 3, w - 12, 4).fill({ color: '#e0a86a' });
    g.rect(8, -h + 10, 5, h - 18).fill({ color: '#885534' });
    g.rect(w - 13, -h + 10, 5, h - 18).fill({ color: '#885534' });
    g.rect(13, -22, w - 26, 7).fill({ color: '#c7834d' });
    g.rect(15, -21, w - 30, 2).fill({ color: '#efbd7b' });
    g.rect(4, -h + 4, 3, 3).fill({ color: '#f5d7a3' });
    g.rect(w - 7, -h + 4, 3, 3).fill({ color: '#f5d7a3' });
  }
  return g;
}

export function criarRenderizadorObstaculos(stage, regras) {
  const raiz = new Container();
  stage.addChild(raiz);
  const vistas = new Map();

  function criarVista(modelo) {
    const regra = regras.TIPOS[modelo.tipo];
    const container = new Container();
    const sombra = new Graphics(); sombra.ellipse(regra.largura / 2, 0, regra.largura * .54, 4).fill({ color: '#05040b', alpha: .5 });
    const corpo = new Container(); corpo.position.set(regra.largura / 2, -regra.altura / 2);
    const forma = desenho(modelo.tipo, regra.largura, regra.altura);
    forma.position.set(-regra.largura / 2, regra.altura / 2);
    corpo.addChild(forma);
    container.addChild(sombra, corpo);
    const pista = modelo.faixa === 'superior' ? 'ROTA 02' : 'ROTA 01';
    const texto = new Text({ text: pista + ' · ' + DICAS[regra.acao], style: { fontFamily: 'monospace', fontSize: 9, fontWeight: 'bold', fill: '#fff2ff', stroke: { color: '#120e1c', width: 3 } } });
    texto.anchor.set(.5, 1);
    texto.position.set(regra.largura / 2, -regra.altura - 27);
    const placaTexto = placa(pista, modelo.faixa === 'superior' ? '#64e5dd' : '#d68aff');
    placaTexto.position.set(regra.largura / 2 - 46, -regra.altura - 49);
    container.addChild(texto, placaTexto);
    raiz.addChild(container);
    return { container, corpo, modelo };
  }

  function atualizar(modelos, agora) {
    const presentes = new Set();
    for (const modelo of modelos) {
      const breaking = modelo.quebraInicio != null && agora - modelo.quebraInicio < 115;
      if (modelo.resolvido && !breaking) continue;
      presentes.add(modelo.id);
      let vista = vistas.get(modelo.id);
      if (!vista) { vista = criarVista(modelo); vistas.set(modelo.id, vista); }
      const piso = PISOS[modelo.faixa || 'inferior'];
      vista.container.position.set(modelo.x, piso);
      if (breaking) {
        const t = Math.max(0, (agora - modelo.quebraInicio) / 115);
        const impulso = Math.sin(t * Math.PI);
        vista.corpo.rotation = impulso * .16;
        vista.corpo.scale.set(1 - impulso * .16, 1 + impulso * .1);
        vista.container.alpha = t < .76 ? 1 : 1 - (t - .76) / .24;
      } else {
        vista.corpo.rotation = 0; vista.corpo.scale.set(1); vista.container.alpha = 1;
      }
    }
    for (const [id, vista] of vistas) {
      if (presentes.has(id)) continue;
      raiz.removeChild(vista.container); vista.container.destroy({ children: true }); vistas.delete(id);
    }
  }

  function eliminar(id) {
    const vista = vistas.get(id);
    if (!vista) return;
    raiz.removeChild(vista.container); vista.container.destroy({ children: true }); vistas.delete(id);
  }

  return { atualizar, eliminar, raiz };
}
