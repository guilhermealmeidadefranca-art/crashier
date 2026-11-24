/* Síntese de áudio original do Crashier; não usa arquivos ou bibliotecas externas. */
(function (raiz) {
  'use strict';
  const CHAVE = 'crashier-audio-v1';
  const PADRAO = { musica: true, efeitos: true, volumeMusica: 0.22, volumeEfeitos: 0.48 };
  let preferencias = lerPreferencias();
  let contexto = null;
  let relogioMusica = null;
  let passoMusica = 0;
  let controlesLigados = false;
  let musicaSolicitada = false;

  function lerPreferencias() {
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE) || '{}');
      return {
        musica: guardado.musica !== false,
        efeitos: guardado.efeitos !== false,
        volumeMusica: numero(guardado.volumeMusica, PADRAO.volumeMusica),
        volumeEfeitos: numero(guardado.volumeEfeitos, PADRAO.volumeEfeitos)
      };
    } catch (erro) { return { ...PADRAO }; }
  }
  function numero(valor, padrao) {
    const n = Number(valor);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : padrao;
  }
  function guardar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(preferencias)); } catch (erro) { /* armazenamento opcional */ }
  }
  function preparar() {
    const AudioContexto = raiz.AudioContext || raiz.webkitAudioContext;
    if (!AudioContexto) return null;
    if (!contexto) contexto = new AudioContexto();
    if (contexto.state === 'suspended') contexto.resume().catch(() => {});
    return contexto;
  }
  function tom(frequencia, duracao, forma, volume, quando, destino) {
    if (!contexto || !volume) return;
    const agora = Math.max(contexto.currentTime + 0.005, quando || contexto.currentTime);
    const oscilador = contexto.createOscillator();
    const ganho = contexto.createGain();
    oscilador.type = forma || 'triangle';
    oscilador.frequency.setValueAtTime(frequencia, agora);
    ganho.gain.setValueAtTime(0.0001, agora);
    ganho.gain.linearRampToValueAtTime(Math.max(0.0001, volume), agora + Math.min(0.035, duracao / 3));
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + duracao);
    oscilador.connect(ganho);
    ganho.connect(destino || contexto.destination);
    oscilador.start(agora);
    oscilador.stop(agora + duracao + 0.02);
    oscilador.onended = () => { oscilador.disconnect(); ganho.disconnect(); };
  }
  function tocarMusica() {
    musicaSolicitada = true;
    if (!preferencias.musica || preferencias.volumeMusica <= 0 || !preparar() || relogioMusica) return;
    const notas = [146.83, 174.61, 220, 196, 130.81, 164.81, 196, 174.61, 146.83, 220, 196, 164.81];
    const pulso = () => {
      if (!contexto || contexto.state !== 'running' || !preferencias.musica) return;
      const inicio = contexto.currentTime + 0.025;
      const nota = notas[passoMusica % notas.length];
      const volume = preferencias.volumeMusica * 0.13;
      tom(nota, 0.32, 'triangle', volume, inicio);
      if (passoMusica % 3 === 0) tom(nota / 2, 0.48, 'sawtooth', volume * 0.45, inicio);
      if (passoMusica % 6 === 0) tom(nota * 2, 0.12, 'square', volume * 0.2, inicio + 0.12);
      passoMusica++;
    };
    pulso();
    relogioMusica = window.setInterval(pulso, 360);
  }
  function pararMusica() {
    musicaSolicitada = false;
    limparRelogioMusica();
  }
  function limparRelogioMusica() {
    if (relogioMusica !== null) window.clearInterval(relogioMusica);
    relogioMusica = null;
  }
  function efeito(nome) {
    if (!preferencias.efeitos || !preparar()) return;
    const v = preferencias.volumeEfeitos * 0.32;
    const agora = contexto.currentTime + 0.005;
    if (nome === 'salto-baixo') tom(420, 0.11, 'square', v, agora);
    else if (nome === 'salto-alto') { tom(520, 0.13, 'triangle', v, agora); tom(780, 0.16, 'square', v * 0.44, agora + 0.08); }
    else if (nome === 'deslizar') { tom(340, 0.17, 'sawtooth', v * 0.5, agora); tom(210, 0.2, 'triangle', v * 0.45, agora + 0.07); }
    else if (nome === 'rolar') { tom(180, 0.16, 'square', v * 0.52, agora); tom(260, 0.09, 'triangle', v * 0.45, agora + 0.11); }
    else if (nome === 'quebrar') { tom(110, 0.22, 'sawtooth', v, agora); tom(350, 0.1, 'square', v * 0.48, agora + 0.03); }
    else if (nome === 'impacto') { tom(95, 0.42, 'sawtooth', v, agora); tom(68, 0.5, 'triangle', v * 0.58, agora + 0.04); }
    else if (nome === 'acerto') { tom(660, 0.09, 'triangle', v * 0.55, agora); tom(880, 0.12, 'triangle', v * 0.4, agora + 0.07); }
    else if (nome === 'recorde') [523.25, 659.25, 783.99, 1046.5].forEach((n, i) => tom(n, 0.22, 'triangle', v * 0.46, agora + i * 0.13));
    else if (nome === 'faixa') { tom(360, 0.1, 'triangle', v * 0.42, agora); tom(520, 0.13, 'square', v * 0.28, agora + 0.06); }
    else if (nome === 'menu') tom(330, 0.06, 'square', v * 0.28, agora);
  }
  function controles() {
    if (controlesLigados || !document) return;
    controlesLigados = true;
    const ids = ['musica-ligada', 'efeitos-ligados', 'volume-musica', 'volume-efeitos'];
    const elementos = ids.map((id) => document.getElementById(id));
    if (elementos.some((e) => !e)) return;
    const [musica, efeitos, volumeMusica, volumeEfeitos] = elementos;
    musica.checked = preferencias.musica;
    efeitos.checked = preferencias.efeitos;
    volumeMusica.value = String(Math.round(preferencias.volumeMusica * 100));
    volumeEfeitos.value = String(Math.round(preferencias.volumeEfeitos * 100));
    musica.addEventListener('change', () => {
      preferencias.musica = musica.checked; guardar();
      if (!preferencias.musica) limparRelogioMusica();
      else if (musicaSolicitada) tocarMusica();
    });
    efeitos.addEventListener('change', () => { preferencias.efeitos = efeitos.checked; guardar(); });
    volumeMusica.addEventListener('input', () => {
      preferencias.volumeMusica = numero(volumeMusica.value / 100, 0); guardar();
      if (preferencias.volumeMusica <= 0) limparRelogioMusica();
      else if (musicaSolicitada && preferencias.musica) tocarMusica();
    });
    volumeEfeitos.addEventListener('input', () => { preferencias.volumeEfeitos = numero(volumeEfeitos.value / 100, 0); guardar(); });
  }

  raiz.CrashierAudio = { preparar, tocarMusica, pararMusica, efeito, controles };
})(window);
