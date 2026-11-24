import { Container, Graphics } from '../../vendor/pixi.min.mjs';

const QUADROS = 8;
const DURACAO_ROLAMENTO = 850;

function bloco(g, x, y, largura, altura, cor, alpha = 1) {
  g.rect(x, y, largura, altura).fill({ color: cor, alpha });
}

function membro(largura, comprimento, cor = '#0b0910', friso = '#56336b') {
  const container = new Container();
  const sombra = new Graphics(); sombra.roundRect(-largura / 2 - 2, 0, largura + 4, comprimento, 3).fill({ color: friso });
  const forma = new Graphics(); forma.roundRect(-largura / 2, 1, largura, comprimento - 1, 2).fill({ color: cor });
  container.addChild(sombra, forma);
  return container;
}

export function criarPersonagem(stage, regras) {
  const sombra = new Graphics();
  sombra.ellipse(0, 0, 23, 5).fill({ color: '#05040a', alpha: .48 });
  stage.addChild(sombra);

  const raiz = new Container();
  const trilha = new Graphics();
  raiz.addChild(trilha);
  const corpo = new Container();
  raiz.addChild(corpo);

  const pernaFundo = membro(10, 31, '#17121c', '#322142'); pernaFundo.position.set(26, -34);
  const pernaFrente = membro(11, 32, '#0b0910', '#59336c'); pernaFrente.position.set(39, -34);
  const peFundo = new Graphics(); bloco(peFundo, -6, -4, 17, 6, '#292033'); bloco(peFundo, 2, -3, 10, 2, '#bd75e8');
  peFundo.position.set(26, -3);
  const peFrente = new Graphics(); bloco(peFrente, -5, -4, 18, 6, '#17121e'); bloco(peFrente, 3, -3, 9, 2, '#7ce6df');
  peFrente.position.set(39, -3);

  const capa = new Graphics();
  capa.poly([12, -64, 8, -53, 14, -43, 9, -30, 21, -36, 24, -61]).fill({ color: '#251831', alpha: .94 });
  const jaqueta = new Graphics();
  jaqueta.roundRect(15, -68, 31, 38, 5).fill({ color: '#0a0810' });
  jaqueta.rect(18, -62, 3, 23).fill({ color: '#513063' });
  jaqueta.rect(40, -62, 2, 18).fill({ color: '#251a32' });
  jaqueta.rect(18, -38, 25, 5).fill({ color: '#20172b' });
  jaqueta.rect(20, -64, 3, 12).fill({ color: '#c878ea', alpha: .84 });

  const bracoFundo = membro(9, 28, '#0c0911', '#352044'); bracoFundo.position.set(18, -60);
  const bracoFrente = membro(10, 29, '#09070d', '#523063'); bracoFrente.position.set(43, -58);
  const luva = new Graphics(); luva.roundRect(-5, 0, 11, 9, 3).fill({ color: '#17101e' });
  bracoFrente.addChild(luva); luva.position.set(0, 22);

  const capuz = new Graphics();
  capuz.roundRect(18, -92, 29, 30, 10).fill({ color: '#09070d' });
  capuz.roundRect(21, -89, 25, 24, 8).fill({ color: '#17111f' });
  capuz.roundRect(25, -83, 24, 16, 6).fill({ color: '#08070c' });
  capuz.rect(39, -77, 9, 4).fill({ color: '#32203f' });
  capuz.rect(41, -76, 5, 2).fill({ color: '#79eee5' });
  capuz.rect(24, -64, 23, 4).fill({ color: '#472657' });
  capuz.rect(45, -62, 6, 7).fill({ color: '#09070d' });

  corpo.addChild(pernaFundo, peFundo, pernaFrente, peFrente, capa, jaqueta, bracoFundo, bracoFrente, capuz);
  stage.addChild(raiz);

  let ultimoPrazo = 0;
  let fimRecuperacao = 0;

  function atualizar(simulacao, agora) {
    const estado = simulacao.estado;
    const rota = estado.trocaFaixa;
    const pisoOrigem = rota ? 194 : estado.faixa === 'superior' ? 194 : 302;
    const pisoDestino = rota ? (rota.destino === 'superior' ? 194 : 302) : pisoOrigem;
    const troca = rota ? Math.max(0, Math.min(1, (agora - rota.inicio) / 240)) : 0;
    const ease = troca * troca * (3 - 2 * troca);
    const chao = pisoOrigem + (pisoDestino - pisoOrigem) * ease;
    const acao = estado.acao;
    const duracao = acao ? (regras.DURACAO_ACAO[acao] || 850) : 0;
    const inicio = acao ? estado.acaoAte - duracao : 0;
    const p = acao ? Math.max(0, Math.min(1, (agora - inicio) / duracao)) : 0;
    const ativa = Boolean(acao && agora < estado.acaoAte);
    const pulando = ativa && (acao === 'baixo' || acao === 'alto');
    const altura = pulando ? Math.sin(Math.PI * p) * (acao === 'alto' ? 76 : 42) : 0;
    const correndo = Math.floor(agora / (90 / Math.sqrt(estado.velocidade))) % QUADROS;
    const fase = correndo / QUADROS * Math.PI * 2;
    const rolando = ativa && acao === 'rolar';
    const deslizando = ativa && acao === 'deslizar';
    if (acao && estado.acaoAte !== ultimoPrazo) {
      ultimoPrazo = estado.acaoAte;
      fimRecuperacao = estado.acaoAte + 170;
    }
    const recuperando = Boolean(!ativa && acao && agora < fimRecuperacao);

    raiz.position.set(150, chao - altura + (deslizando ? 9 : rolando ? 7 : 0));
    sombra.position.set(176, chao - 3);
    sombra.scale.x = Math.max(.42, 1 - altura / 110);
    sombra.alpha = .48 - Math.min(.24, altura / 420);

    raiz.rotation = rolando ? p * Math.PI * 2 : 0;
    corpo.rotation = deslizando ? -.04 : pulando ? -.08 * Math.cos(Math.PI * p) : 0;
    corpo.scale.set(deslizando ? 1.28 : rolando ? .88 : 1, deslizando ? .68 : rolando ? .83 : 1);
    corpo.y = deslizando ? 20 + Math.sin(p * Math.PI) * 3 : recuperando ? 2 : 0;
    pernaFundo.rotation = pulando ? 1.0 : deslizando ? -.45 : rolando ? .3 : Math.sin(fase) * .72;
    pernaFrente.rotation = pulando ? -.92 : deslizando ? .36 : rolando ? -.4 : -Math.sin(fase) * .72;
    peFundo.rotation = pulando ? 1.15 : 0;
    peFrente.rotation = pulando ? -.7 : 0;
    bracoFundo.rotation = pulando ? -1.1 : deslizando ? -.6 : rolando ? .7 : -Math.sin(fase) * .78;
    bracoFrente.rotation = pulando ? -1.35 : deslizando ? .5 : rolando ? -.65 : Math.sin(fase) * .78;
    if (recuperando) {
      corpo.rotation = .08;
      pernaFundo.rotation *= .35; pernaFrente.rotation *= .35;
      bracoFundo.rotation = -.36; bracoFrente.rotation = .28;
    }

    trilha.clear();
    if (rota) {
      const alpha = Math.sin(troca * Math.PI) * .44;
      trilha.ellipse(28, -36, 29, 47).stroke({ color: rota.destino === 'superior' ? '#71eee4' : '#d98aff', alpha, width: 2 });
    }
  }

  function animarQueda(progresso) {
    corpo.rotation = .12 + Math.max(0, Math.min(1, progresso)) * .76;
    corpo.y = Math.max(0, progresso) * 10;
    bracoFundo.rotation = .8; bracoFrente.rotation = -.7;
    pernaFundo.rotation = .65; pernaFrente.rotation = -.4;
  }

  return { raiz, sombra, atualizar, animarQueda, redefinir() { raiz.rotation = 0; corpo.rotation = 0; corpo.y = 0; } };
}
