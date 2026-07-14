export const ORIGEM_CADASTRO = {
  MANUAL: "manual",
  SCANNER: "scanner",
  AGENTE_PASTA: "agente_pasta",
};

export function limparTexto(valor, limite = 120) {
  return String(valor || "").trim().replace(/\s+/g, " ").slice(0, limite);
}

export function converterNumero(valor) {
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export function normalizarVendaFirestore(dadosVenda, usuario, opcoes = {}) {
  if (!usuario?.uid) {
    throw new Error("Usuario logado nao encontrado.");
  }

  const nome = limparTexto(dadosVenda.nome);
  const origem = limparTexto(dadosVenda.origem || opcoes.origemPadrao, 80);
  const valorVenda = converterNumero(dadosVenda.valorVenda);
  const desconto = Math.max(0, converterNumero(dadosVenda.desconto));
  const valorOriginalInformado = converterNumero(dadosVenda.valorOriginal);
  const valorOriginal = Math.max(0, valorOriginalInformado || valorVenda + desconto);
  const produto = limparTexto(dadosVenda.produto, 180);
  const origemCadastro = limparTexto(
    opcoes.origemCadastro || dadosVenda.origemCadastro || ORIGEM_CADASTRO.MANUAL,
    40,
  );
  const reciboHash = limparTexto(opcoes.reciboHash || dadosVenda.reciboHash, 128);
  const arquivoOrigem = limparTexto(opcoes.arquivoOrigem || dadosVenda.arquivoOrigem, 240);

  if (!nome || !origem || !Number.isFinite(valorVenda) || valorVenda < 0) {
    throw new Error("Dados da venda invalidos.");
  }

  return {
    nome,
    origem,
    produto,
    valorOriginal,
    desconto,
    valorVenda,
    origemCadastro,
    reciboHash,
    arquivoOrigem,
    usuarioId: usuario.uid,
    usuarioNome: limparTexto(usuario.nome || usuario.email),
    usuarioEmail: usuario.email || "",
    adminDonoId: usuario.adminDonoId || "",
    adminDonoNome: limparTexto(usuario.adminDonoNome),
    adminDonoEmail: usuario.adminDonoEmail || "",
  };
}
