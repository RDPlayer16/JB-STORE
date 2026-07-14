import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { extrairDadosNota, normalizarEspacos } from "../src/utils/extrairDadosNota.js";
import { converterNumero, limparTexto, ORIGEM_CADASTRO } from "../src/utils/vendaAutomatica.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const stateDir = path.join(projectRoot, ".jb-store-agent");
const statePath = path.join(stateDir, "processados.json");
const extensoesPermitidas = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp"]);

function carregarEnv(arquivo) {
  if (!existsSync(arquivo)) return;

  const conteudo = readFileSync(arquivo, "utf8");

  for (const linha of conteudo.split(/\r?\n/)) {
    const texto = linha.trim();
    if (!texto || texto.startsWith("#") || !texto.includes("=")) continue;

    const [chave, ...partesValor] = texto.split("=");
    const valor = partesValor.join("=").trim().replace(/^["']|["']$/g, "");

    if (!process.env[chave]) {
      process.env[chave] = valor;
    }
  }
}

function lerArgumentos() {
  const args = process.argv.slice(2);
  const config = {
    once: args.includes("--once"),
    dryRun: args.includes("--dry-run") || process.env.AGENT_DRY_RUN === "true",
  };

  const dirIndex = args.indexOf("--dir");
  if (dirIndex >= 0 && args[dirIndex + 1]) {
    config.watchDir = args[dirIndex + 1];
  }

  return config;
}

function exigirEnv(chaves) {
  const faltando = chaves.filter((chave) => !process.env[chave]);

  if (faltando.length > 0) {
    throw new Error(`Variaveis ausentes: ${faltando.join(", ")}`);
  }
}

function carregarEstado() {
  mkdirSync(stateDir, { recursive: true });

  if (!existsSync(statePath)) {
    return { processados: {} };
  }

  return JSON.parse(readFileSync(statePath, "utf8"));
}

function salvarEstado(estado) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(statePath, JSON.stringify(estado, null, 2));
}

async function listarArquivos(pasta, recursivo) {
  const itens = await readdir(pasta, { withFileTypes: true });
  const arquivos = [];

  for (const item of itens) {
    const caminho = path.join(pasta, item.name);

    if (item.isDirectory() && recursivo) {
      arquivos.push(...await listarArquivos(caminho, recursivo));
      continue;
    }

    if (item.isFile() && extensoesPermitidas.has(path.extname(item.name).toLowerCase())) {
      arquivos.push(caminho);
    }
  }

  return arquivos;
}

async function aguardarArquivoEstavel(arquivo) {
  let tamanhoAnterior = -1;

  for (let tentativa = 0; tentativa < 8; tentativa += 1) {
    const info = await stat(arquivo);

    if (info.size > 0 && info.size === tamanhoAnterior) {
      return;
    }

    tamanhoAnterior = info.size;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
}

async function hashArquivo(arquivo) {
  const buffer = await readFile(arquivo);
  return createHash("sha256").update(buffer).digest("hex");
}

async function extrairTextoDePdf(arquivo) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(await readFile(arquivo));
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    standardFontDataUrl: `${path.join(projectRoot, "node_modules", "pdfjs-dist", "standard_fonts").replaceAll("\\", "/")}/`,
  });
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

async function extrairTextoDeImagem(arquivo) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("por");

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

async function lerRecibo(arquivo) {
  const extensao = path.extname(arquivo).toLowerCase();
  const texto = extensao === ".pdf"
    ? await extrairTextoDePdf(arquivo)
    : await extrairTextoDeImagem(arquivo);

  if (!texto || texto.length < 20) {
    throw new Error("Nao foi possivel extrair texto suficiente do recibo.");
  }

  const dados = extrairDadosNota(texto);

  if (!dados.nome && !dados.produto && !dados.valorVenda) {
    throw new Error("Nao foi possivel identificar os dados principais do recibo.");
  }

  return dados;
}

function criarFirebaseConfig() {
  exigirEnv([
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
  ]);

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

async function autenticarAgente() {
  exigirEnv(["AGENT_USER_EMAIL", "AGENT_USER_PASSWORD"]);

  const app = initializeApp(criarFirebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);
  const credenciais = await signInWithEmailAndPassword(
    auth,
    process.env.AGENT_USER_EMAIL,
    process.env.AGENT_USER_PASSWORD,
  );
  const perfilSnapshot = await getDoc(doc(db, "usuarios", credenciais.user.uid));

  if (!perfilSnapshot.exists()) {
    throw new Error("Perfil do usuario do agente nao encontrado no Firestore.");
  }

  const perfil = perfilSnapshot.data();

  if (perfil.ativo !== true) {
    throw new Error("Usuario do agente esta inativo.");
  }

  return {
    db,
    usuario: {
      ...perfil,
      uid: credenciais.user.uid,
      email: perfil.email || credenciais.user.email,
    },
  };
}

function criarChaveProcessado(usuarioId, reciboHash) {
  return `${usuarioId}:${reciboHash}`;
}

function removerRegistroLegado(estado, reciboHash, chaveProcessado) {
  if (chaveProcessado !== reciboHash && estado.processados[reciboHash]) {
    delete estado.processados[reciboHash];
  }
}

async function buscarDocumentoPorHash(db, colecao, usuarioId, reciboHash) {
  const consulta = query(
    collection(db, colecao),
    where("usuarioId", "==", usuarioId),
    where("reciboHash", "==", reciboHash),
    limit(1),
  );
  const resultado = await getDocs(consulta);

  if (resultado.empty) {
    return null;
  }

  const documento = resultado.docs[0];
  return {
    id: documento.id,
    ref: documento.ref,
    ...documento.data(),
  };
}

async function verificarReciboJaRegistrado({ db, usuario, estado, reciboHash, caminhoRelativo }) {
  const chaveProcessado = criarChaveProcessado(usuario.uid, reciboHash);
  const registroLocal = estado.processados[chaveProcessado] || estado.processados[reciboHash];
  const cliente = await buscarDocumentoPorHash(db, "clientes", usuario.uid, reciboHash);

  if (cliente) {
    estado.processados[chaveProcessado] = {
      ...registroLocal,
      arquivo: caminhoRelativo,
      clienteId: cliente.id,
      motivo: "ja_existia_cliente",
      processadoEm: new Date().toISOString(),
    };
    removerRegistroLegado(estado, reciboHash, chaveProcessado);
    salvarEstado(estado);
    console.log(`[ignorado] Ja cadastrado: ${caminhoRelativo}`);
    return true;
  }

  const pendencia = await buscarDocumentoPorHash(db, "recibosPendentes", usuario.uid, reciboHash);

  if (pendencia) {
    if (pendencia.status === "cadastrado") {
      await updateDoc(pendencia.ref, {
        status: "pendente",
        clienteId: "",
        atualizadoEm: serverTimestamp(),
      });

      estado.processados[chaveProcessado] = {
        ...registroLocal,
        arquivo: caminhoRelativo,
        pendenciaId: pendencia.id,
        motivo: "reaberto_sem_cliente",
        processadoEm: new Date().toISOString(),
      };
      removerRegistroLegado(estado, reciboHash, chaveProcessado);
      salvarEstado(estado);
      console.log(`[reaberto] Pendente sem cliente encontrado: ${caminhoRelativo} -> ${pendencia.id}`);
      return true;
    }

    estado.processados[chaveProcessado] = {
      ...registroLocal,
      arquivo: caminhoRelativo,
      pendenciaId: pendencia.id,
      motivo: `ja_existia_pendencia_${pendencia.status || "sem_status"}`,
      processadoEm: new Date().toISOString(),
    };
    removerRegistroLegado(estado, reciboHash, chaveProcessado);
    salvarEstado(estado);

    if (pendencia.status === "pendente") {
      console.log(`[ignorado] Ja esta aguardando conferencia: ${caminhoRelativo}`);
    } else {
      console.log(`[ignorado] Ja existe em recibos pendentes (${pendencia.status || "sem status"}): ${caminhoRelativo}`);
    }

    return true;
  }

  if (registroLocal) {
    delete estado.processados[chaveProcessado];
    removerRegistroLegado(estado, reciboHash, chaveProcessado);
    salvarEstado(estado);
    console.log(`[reprocessando] Memoria local sem registro no Firestore: ${caminhoRelativo}`);
  }

  return false;
}

function normalizarReciboPendente(dadosRecibo, usuario, opcoes) {
  const valorVenda = Math.max(0, converterNumero(dadosRecibo.valorVenda));
  const desconto = Math.max(0, converterNumero(dadosRecibo.desconto));
  const valorOriginal = Math.max(0, converterNumero(dadosRecibo.valorOriginal) || valorVenda + desconto);

  return {
    nome: limparTexto(dadosRecibo.nome),
    produto: limparTexto(dadosRecibo.produto, 180),
    valorOriginal,
    desconto,
    valorVenda,
    origemCadastro: ORIGEM_CADASTRO.AGENTE_PASTA,
    reciboHash: limparTexto(opcoes.reciboHash, 128),
    arquivoOrigem: limparTexto(opcoes.arquivoOrigem, 240),
    status: "pendente",
    usuarioId: usuario.uid,
    usuarioNome: limparTexto(usuario.nome || usuario.email),
    usuarioEmail: usuario.email || "",
    adminDonoId: usuario.adminDonoId || "",
    adminDonoNome: limparTexto(usuario.adminDonoNome),
    adminDonoEmail: usuario.adminDonoEmail || "",
  };
}

async function processarArquivo({ arquivo, db, usuario, estado, dryRun, origemPadrao }) {
  await aguardarArquivoEstavel(arquivo);

  const reciboHash = await hashArquivo(arquivo);
  const caminhoRelativo = path.relative(process.env.RECIBOS_WATCH_DIR, arquivo);

  if (!dryRun && await verificarReciboJaRegistrado({ db, usuario, estado, reciboHash, caminhoRelativo })) {
    return;
  }

  console.log(`[lendo] ${caminhoRelativo}`);
  const dadosRecibo = await lerRecibo(arquivo);
  const pendencia = normalizarReciboPendente(dadosRecibo, usuario, {
    reciboHash,
    arquivoOrigem: caminhoRelativo,
    origemPadrao,
  });

  if (dryRun) {
    console.log("[teste] Recibo pendente extraido:", pendencia);
    return;
  }

  const documento = await addDoc(collection(db, "recibosPendentes"), {
    ...pendencia,
    criadoEm: serverTimestamp(),
  });

  estado.processados[criarChaveProcessado(usuario.uid, reciboHash)] = {
    arquivo: caminhoRelativo,
    pendenciaId: documento.id,
    processadoEm: new Date().toISOString(),
  };
  removerRegistroLegado(estado, reciboHash, criarChaveProcessado(usuario.uid, reciboHash));
  salvarEstado(estado);
  console.log(`[ok] Pendente para conferencia ${caminhoRelativo} -> ${documento.id}`);
}

async function varrerPasta(contexto) {
  const arquivos = await listarArquivos(contexto.watchDir, contexto.recursivo);

  for (const arquivo of arquivos) {
    try {
      await processarArquivo({ ...contexto, arquivo });
    } catch (erro) {
      if (erro.code === "permission-denied") {
        console.error(`[erro] ${path.basename(arquivo)}: permissao negada pelo Firestore.`);
        console.error("       Verifique se as regras novas foram publicadas com: firebase deploy --only firestore:rules");
        console.error("       Confirme tambem se AGENT_USER_EMAIL e um usuario funcionario ativo no app.");
      } else {
        console.error(`[erro] ${path.basename(arquivo)}: ${erro.message}`);
      }
    }
  }
}

async function main() {
  carregarEnv(path.join(projectRoot, ".env"));
  carregarEnv(path.join(projectRoot, ".env.local"));
  carregarEnv(path.join(projectRoot, ".env.agent"));

  const args = lerArgumentos();
  const watchDirConfig = args.watchDir || process.env.RECIBOS_WATCH_DIR;

  if (!watchDirConfig) {
    throw new Error("Informe RECIBOS_WATCH_DIR ou use --dir \"C:\\\\caminho\\\\recibos\".");
  }

  const watchDir = path.resolve(watchDirConfig);

  if (!existsSync(watchDir)) {
    throw new Error("Informe uma pasta valida em RECIBOS_WATCH_DIR ou use --dir \"C:\\\\caminho\\\\recibos\".");
  }

  process.env.RECIBOS_WATCH_DIR = watchDir;

  const intervaloMs = Number.parseInt(process.env.AGENT_INTERVAL_MS || "7000", 10);
  const origemPadrao = process.env.AGENT_ORIGEM_PADRAO || "Importacao automatica";
  const recursivo = process.env.AGENT_RECURSIVE === "true";
  const estado = carregarEstado();
  const deveAutenticar = !args.dryRun;
  const sessao = deveAutenticar
    ? await autenticarAgente()
    : {
        db: null,
        usuario: {
          uid: "dry-run",
          nome: "Teste local",
          email: "teste-local@agente",
          adminDonoId: "dry-run",
        },
      };
  const contexto = {
    db: sessao.db,
    usuario: sessao.usuario,
    estado,
    watchDir,
    origemPadrao,
    recursivo,
    dryRun: args.dryRun,
  };

  console.log(`Agente iniciado para: ${watchDir}`);
  console.log(`Modo: cria pendencias para conferencia no app`);
  console.log(`Origem padrao sera escolhida no cadastro manual`);

  if (args.once) {
    await varrerPasta(contexto);
    return;
  }

  while (true) {
    await varrerPasta(contexto);
    await new Promise((resolve) => setTimeout(resolve, intervaloMs));
  }
}

main().catch((erro) => {
  console.error(`Falha no agente: ${erro.message}`);
  process.exitCode = 1;
});
