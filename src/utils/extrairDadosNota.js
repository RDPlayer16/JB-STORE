const moedaRegex = /R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g;
const cpfCnpjRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const telefoneRegex = /\b(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g;

export function normalizarEspacos(texto) {
  return (texto || "")
    .replace(/\uFFFD/g, "c")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .trim();
}

function removerAcentos(texto) {
  return normalizarEspacos(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function linhasLimpas(texto) {
  return normalizarEspacos(texto)
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

function recortarSecao(texto, inicio, fim) {
  const textoNormalizado = normalizarEspacos(texto);
  const base = removerAcentos(textoNormalizado);
  const inicioIndex = base.indexOf(removerAcentos(inicio));

  if (inicioIndex === -1) {
    return "";
  }

  const depoisDoInicio = inicioIndex + inicio.length;
  const fimIndex = fim ? base.indexOf(removerAcentos(fim), depoisDoInicio) : -1;

  return textoNormalizado.slice(
    inicioIndex,
    fimIndex === -1 ? textoNormalizado.length : fimIndex,
  );
}

function converterMoeda(valor) {
  if (!valor) return "";

  const numero = String(valor)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const convertido = Number.parseFloat(numero);
  return Number.isFinite(convertido) ? convertido.toFixed(2) : "";
}

function extrairCliente(texto) {
  const secaoDestinatario = recortarSecao(texto, "DESTINATARIO/REMETENTE", "DADOS DO PRODUTO");

  const candidatos = linhasLimpas(secaoDestinatario).filter((linha) => {
    const linhaBusca = removerAcentos(linha);
    return ![
      "destinatario",
      "nome/razao",
      "telefone",
      "cpf/cnpj",
      "e-mail",
      "endereco",
      "cep",
      "cidade",
      "estado",
    ].some((termo) => linhaBusca.includes(termo));
  });

  const candidato = candidatos.find((linha) => /[a-z]{3,}/.test(removerAcentos(linha)));

  return normalizarEspacos(
    (candidato || "")
      .replace(cpfCnpjRegex, "")
      .replace(telefoneRegex, "")
      .replace(/[,.]+$/g, "")
      .trim(),
  );
}

function limparDescricaoProduto(linhasProduto) {
  return normalizarEspacos(
    linhasProduto
      .join(" ")
      .replace(/cod\s+produto\s+qtd\s+valor\s+unitario\s+desconto\s+valor\s+total/gi, "")
      .replace(/^dados\s+do\s+produto/gi, "")
      .replace(/^\d{3,}\s*[-:]?\s*/g, "")
      .replace(/\s+\d+\s*$/g, "")
      .replace(/\s+-?\s*garantia\s+at\S*.*$/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

function extrairProdutoEValores(texto) {
  const secaoProduto = recortarSecao(texto, "DADOS DO PRODUTO", "PAGAMENTO");
  const linhas = linhasLimpas(secaoProduto);
  const linhasProduto = [];

  for (const linha of linhas) {
    const linhaBusca = removerAcentos(linha);

    if (
      linhaBusca.includes("dados do produto")
      || linhaBusca.includes("valor unitario")
      || linhaBusca === "cod"
      || linhaBusca === "produto"
      || linhaBusca === "qtd"
      || linhaBusca === "desconto"
      || linhaBusca === "valor total"
    ) {
      continue;
    }

    if (/^total\b/i.test(linhaBusca)) {
      break;
    }

    const indiceMoeda = linha.search(moedaRegex);

    if (indiceMoeda >= 0) {
      const antesDosValores = linha.slice(0, indiceMoeda).trim();
      if (antesDosValores) {
        linhasProduto.push(antesDosValores);
      }
      break;
    }

    linhasProduto.push(linha);
  }

  const valores = secaoProduto.match(moedaRegex) || [];
  const valorOriginal = converterMoeda(valores[0]);
  const desconto = converterMoeda(valores[1]) || "0.00";
  const valorVenda = converterMoeda(valores[2]) || converterMoeda(valores[valores.length - 1]);

  return {
    produto: limparDescricaoProduto(linhasProduto),
    valorOriginal,
    desconto,
    valorVenda,
  };
}

function extrairValorPago(texto) {
  const secaoPagamento = recortarSecao(texto, "PAGAMENTO", "OBSERVACAO");
  const valores = secaoPagamento.match(moedaRegex) || [];
  return converterMoeda(valores[valores.length - 1]);
}

export function extrairDadosNota(texto) {
  const textoNormalizado = normalizarEspacos(texto);
  const dadosProduto = extrairProdutoEValores(textoNormalizado);
  const valorPago = extrairValorPago(textoNormalizado);

  return {
    nome: extrairCliente(textoNormalizado),
    produto: dadosProduto.produto,
    valorOriginal: dadosProduto.valorOriginal,
    desconto: dadosProduto.desconto,
    valorVenda: dadosProduto.valorVenda || valorPago,
  };
}
