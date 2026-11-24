export function ligarControles({ canvas, telaAtual, acionar, trocarFaixa, alternarPausa }) {
  let primeiroToque = null;
  let timerPulo = null;
  let ativo = true;

  const guardar = (elemento, evento, funcao, opcoes) => {
    elemento.addEventListener(evento, funcao, opcoes);
    return () => elemento.removeEventListener(evento, funcao, opcoes);
  };
  const remover = [];
  const acaoEmToque = (evento) => {
    evento.preventDefault();
    acionar(evento.currentTarget.dataset.acao);
  };
  const faixaEmToque = (evento) => {
    evento.preventDefault();
    trocarFaixa(evento.currentTarget.dataset.faixa);
  };
  document.querySelectorAll('[data-acao]').forEach((botao) => remover.push(guardar(botao, 'pointerdown', acaoEmToque)));
  document.querySelectorAll('[data-faixa]').forEach((botao) => remover.push(guardar(botao, 'pointerdown', faixaEmToque)));

  const tecla = (evento) => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(evento.target?.tagName || '')) return;
    if (evento.code === 'Escape' || evento.code === 'KeyP') { evento.preventDefault(); alternarPausa(); return; }
    if (telaAtual() !== 'tela-jogo') return;
    if (evento.code === 'KeyA') { evento.preventDefault(); if (!evento.repeat) trocarFaixa('inferior'); return; }
    if (evento.code === 'KeyD') { evento.preventDefault(); if (!evento.repeat) trocarFaixa('superior'); return; }
    if (evento.code === 'ArrowUp') {
      evento.preventDefault();
      if (evento.repeat) return;
      if (timerPulo !== null) {
        window.clearTimeout(timerPulo); timerPulo = null; acionar('alto');
      } else {
        timerPulo = window.setTimeout(() => { timerPulo = null; acionar('baixo'); }, 280);
      }
      return;
    }
    const acao = evento.code === 'ArrowDown' ? 'deslizar' : evento.code === 'ArrowRight' ? 'rolar' : '';
    if (acao && !evento.repeat) { evento.preventDefault(); acionar(acao); }
  };
  remover.push(guardar(window, 'keydown', tecla));

  const pressionarCanvas = (evento) => { primeiroToque = { x: evento.clientX, y: evento.clientY }; };
  const soltarCanvas = (evento) => {
    if (!primeiroToque || telaAtual() !== 'tela-jogo') return;
    const dx = evento.clientX - primeiroToque.x;
    const dy = evento.clientY - primeiroToque.y;
    if (Math.abs(dx) + Math.abs(dy) > 30) {
      if (dy < -60) acionar(dy < -126 ? 'alto' : 'baixo');
      else if (dy > 55) acionar('deslizar');
      else if (dx > 55) acionar('rolar');
      else if (dx < -55) trocarFaixa('superior');
    }
    primeiroToque = null;
  };
  remover.push(guardar(canvas, 'pointerdown', pressionarCanvas, { passive: true }));
  remover.push(guardar(canvas, 'pointerup', soltarCanvas, { passive: true }));
  remover.push(guardar(canvas, 'pointercancel', () => { primeiroToque = null; }));

  const visibilidade = () => { if (document.hidden && telaAtual() === 'tela-jogo') alternarPausa(true); };
  remover.push(guardar(document, 'visibilitychange', visibilidade));

  return () => {
    if (!ativo) return;
    ativo = false;
    if (timerPulo !== null) window.clearTimeout(timerPulo);
    remover.forEach((desligar) => desligar());
  };
}
