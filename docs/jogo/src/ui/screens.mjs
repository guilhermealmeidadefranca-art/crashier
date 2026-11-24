const PAINEIS = ['tela-inicio', 'tela-jogo', 'tela-pausa', 'tela-fim'];
const $ = (id) => document.getElementById(id);

export function criarTelas(regras) {
  let atual = 'tela-inicio';
  function mostrar(id) {
    atual = id;
    PAINEIS.forEach((painel) => { $(painel).hidden = painel !== id; });
    document.body.classList.toggle('em-partida', id === 'tela-jogo' || id === 'tela-pausa');
  }
  function recorde(valor) { $('melhor').textContent = Number(valor || 0).toLocaleString('pt-BR'); }
  function hud(estado, bioma) {
    $('distancia').textContent = Math.floor(estado.distancia).toLocaleString('pt-BR');
    $('pontos').textContent = Math.floor(estado.pontos).toLocaleString('pt-BR');
    $('velocidade').textContent = estado.velocidade.toFixed(1);
    $('bioma').textContent = bioma.nome;
    const faixa = $('faixa-atual');
    faixa.textContent = estado.trocaFaixa ? 'TROCANDO' : regras.FAIXAS[estado.faixa].nome;
    faixa.classList.toggle('texto-rota-superior', (estado.trocaFaixa ? estado.trocaFaixa.destino : estado.faixa) === 'superior');
  }
  function pausa(estado) {
    $('pausa-distancia').textContent = Math.floor(estado.distancia).toLocaleString('pt-BR');
    $('pausa-pontos').textContent = Math.floor(estado.pontos).toLocaleString('pt-BR');
    mostrar('tela-pausa');
  }
  function fim(estado, motivo, recordeAntes) {
    const pontos = Math.floor(estado.pontos);
    const distancia = Math.floor(estado.distancia);
    const novo = pontos > recordeAntes;
    $('resultado').textContent = pontos.toLocaleString('pt-BR');
    $('resultado-distancia').textContent = distancia.toLocaleString('pt-BR');
    $('recorde-final').textContent = Math.max(recordeAntes, pontos).toLocaleString('pt-BR');
    $('novo-recorde').hidden = !novo;
    $('titulo-fim').textContent = novo ? 'A cidade inteira ficou para trás!' : 'A cidade ficou para trás.';
    $('causa-fim').textContent = motivo ? `A sombra não conseguiu superar ${regras.NOMES[motivo] || 'o obstáculo'}.` : 'A corrida chegou ao fim.';
    $('situacao-salvamento').textContent = 'Salvando placar…';
    mostrar('tela-fim');
    return { pontos, distancia, novo };
  }
  function mensagem(texto) { $('mensagem').textContent = texto; }

  return { mostrar, recorde, hud, pausa, fim, mensagem, atual: () => atual };
}
