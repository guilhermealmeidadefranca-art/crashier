(function () {
  'use strict';

  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
  const botaoMenu = document.querySelector('.menu-toggle');
  const navegacao = document.getElementById('nav-principal');
  const hero = document.querySelector('.hero');
  const arte = document.querySelector('[data-parallax]');
  let quadroPendente = false;

  document.documentElement.classList.add('js');
  document.getElementById('ano').textContent = String(new Date().getFullYear());

  if ('IntersectionObserver' in window) {
    const observador = new IntersectionObserver((entradas, observer) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('in');
        observer.unobserve(entrada.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('.reveal').forEach((elemento) => observador.observe(elemento));
  } else {
    document.querySelectorAll('.reveal').forEach((elemento) => elemento.classList.add('in'));
  }

  function fecharMenu() {
    botaoMenu.setAttribute('aria-expanded', 'false');
    botaoMenu.setAttribute('aria-label', 'Abrir navegação');
    navegacao.classList.remove('aberto');
  }

  botaoMenu.addEventListener('click', () => {
    const aberto = botaoMenu.getAttribute('aria-expanded') !== 'true';
    botaoMenu.setAttribute('aria-expanded', String(aberto));
    botaoMenu.setAttribute('aria-label', aberto ? 'Fechar navegação' : 'Abrir navegação');
    navegacao.classList.toggle('aberto', aberto);
  });
  navegacao.querySelectorAll('a').forEach((link) => link.addEventListener('click', fecharMenu));
  document.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') fecharMenu(); });

  if (!reduzirMovimento.matches && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    hero.addEventListener('pointermove', (evento) => {
      const limites = hero.getBoundingClientRect();
      const x = (evento.clientX - limites.left) / limites.width - 0.5;
      const y = (evento.clientY - limites.top) / limites.height - 0.5;
      arte.style.setProperty('--art-x', `${x * -8}px`);
      arte.style.setProperty('--art-y', `${y * -6}px`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => {
      arte.style.setProperty('--art-x', '0px');
      arte.style.setProperty('--art-y', '0px');
    }, { passive: true });
  }

  window.addEventListener('scroll', () => {
    if (quadroPendente || reduzirMovimento.matches) return;
    quadroPendente = true;
    window.requestAnimationFrame(() => {
      const deslocamento = Math.min(0, window.scrollY * -0.12);
      hero.style.setProperty('--scroll-y', `${deslocamento}px`);
      quadroPendente = false;
    });
  }, { passive: true });
})();
