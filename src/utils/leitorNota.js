import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extrairDadosNota, normalizarEspacos } from "./extrairDadosNota";

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

export { extrairDadosNota };
