import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

const moedaRegex = /R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/g;
const cpfCnpjRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const telefoneRegex = /\b(?:\(?\d{2}\)?\s*)?\d{4,5}-?\d{4}\b/g;

function normalizarEspacos(texto) {
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

async function extrairTextoDePdf(arquivo) {
  const pdfjsLib = await import("pdfjs-dist");
  const buffer = await arquivo.arrayBuffer();
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const paginas = [];

  try {
    for (let numeroPagina = 1; numeroPagina <= pdf.numPages; numeroPagina += 1) {
      const pagina = await pdf.getPage(numeroPagina);
      const conteudo = await pagina.getTextContent();
      paginas.push(conteudo.items.map((item) => item.str).filter(Boolean).join("\n"));
      pagina.cleanup?.();
    }
  } finally {
    await loadingTask.destroy?.();
  }

  return normalizarEspacos(paginas.join("\n"));
}

async function renderizarPrimeiraPaginaPdf(arquivo) {
  const pdfjsLib = await import("pdfjs-dist");
  const buffer = await arquivo.arrayBuffer();
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;

  try {
    const pagina = await pdf.getPage(1);
    const viewport = pagina.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d", { alpha: false });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    await pagina.render({ canvasContext: contexto, viewport }).promise;
    pagina.cleanup?.();

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Nao foi possivel preparar o PDF para leitura."));
        }
      }, "image/png");
    });
  } finally {
    await loadingTask.destroy?.();
  }
}

async function extrairTextoDeImagem(arquivo, onStatus) {
  onStatus?.("Reconhecendo texto da nota...");

  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por", 1, {
    logger: (mensagem) => {
      if (mensagem.status === "recognizing text") {
        onStatus?.(`Reconhecendo texto (${Math.round((mensagem.progress || 0) * 100)}%)...`);
      }
    },
  });

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "180",
    });

    const resultado = await worker.recognize(arquivo);
    return normalizarEspacos(resultado.data.text);
  } finally {
    await worker.terminate();
  }
}

export async function lerNota(arquivo, onStatus) {
  if (!arquivo) {
    throw new Error("Selecione uma nota para escanear.");
  }

  const ehPdf = arquivo.type === "application/pdf" || arquivo.name.toLowerCase().endsWith(".pdf");
  const ehImagem = arquivo.type.startsWith("image/");

  if (!ehPdf && !ehImagem) {
    throw new Error("Use uma imagem ou PDF da nota.");
  }

  onStatus?.("Lendo nota...");
  let texto = ehPdf
    ? await extrairTextoDePdf(arquivo)
    : await extrairTextoDeImagem(arquivo, onStatus);

  if (ehPdf && texto.length < 80) {
    onStatus?.("Preparando OCR do PDF...");
    const imagemPdf = await renderizarPrimeiraPaginaPdf(arquivo);
    texto = await extrairTextoDeImagem(imagemPdf, onStatus);
  }

  const dados = extrairDadosNota(texto);

  if (!dados.nome && !dados.produto && !dados.valorVenda) {
    throw new Error("Nao consegui identificar os dados principais da nota.");
  }

  return { dados, texto };
}
