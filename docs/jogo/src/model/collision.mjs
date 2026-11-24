/** Colisão discreta no corredor e na faixa ativa, isolada da renderização. */
export function avaliarPassagem(regras, estado, obstaculo, agora, jogadorX = 150) {
  const hitbox = regras.TIPOS[obstaculo.tipo];
  if (!hitbox || obstaculo.resolvido) return { tipo: 'ignorar' };
  const sobrepoeX = obstaculo.x <= jogadorX + 40 && obstaculo.x + hitbox.largura >= jogadorX + 8;
  const mesmaFaixa = regras.obstaculoNaFaixa(estado, obstaculo, agora);
  if (sobrepoeX && mesmaFaixa && regras.podeSuperar(estado, obstaculo, agora)) {
    const impacto = regras.resolverImpacto(estado, obstaculo, agora);
    return impacto.sucesso ? { tipo: 'superado', impacto } : { tipo: 'ignorar' };
  }
  if (mesmaFaixa && obstaculo.x + hitbox.largura < jogadorX + 8) {
    return { tipo: 'colisao', motivo: obstaculo.tipo };
  }
  return { tipo: 'aguardar' };
}
