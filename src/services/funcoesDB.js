// src/services/funcoesDB.js
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

function limparTexto(valor, limite = 120) {
  return String(valor || "").trim().replace(/\s+/g, " ").slice(0, limite);
}

function converterNumero(valor) {
  const numero = Number.parseFloat(valor);
  return Number.isFinite(numero) ? numero : 0;
}

export async function cadastrarClienteFirestore(dadosCliente, usuario) {
  if (!usuario?.uid) {
    throw new Error("Usuario logado nao encontrado.");
  }

  const nome = limparTexto(dadosCliente.nome);
  const origem = limparTexto(dadosCliente.origem, 80);
  const valorVenda = converterNumero(dadosCliente.valorVenda);
  const desconto = converterNumero(dadosCliente.desconto);
  const valorOriginal = converterNumero(dadosCliente.valorOriginal) || valorVenda + desconto;
  const produto = limparTexto(dadosCliente.produto, 180);
  const adminDonoId = usuario.adminDonoId || "";

  if (!nome || !origem || !Number.isFinite(valorVenda) || valorVenda < 0) {
    throw new Error("Dados do cliente invalidos.");
  }

  try {
    await addDoc(collection(db, "clientes"), {
      nome,
      origem,
      produto,
      valorOriginal,
      desconto,
      valorVenda,
      usuarioId: usuario.uid,
      usuarioNome: limparTexto(usuario.nome || usuario.email),
      usuarioEmail: usuario.email || "",
      adminDonoId,
      adminDonoNome: limparTexto(usuario.adminDonoNome),
      adminDonoEmail: usuario.adminDonoEmail || "",
      dataCadastro: serverTimestamp(),
    });

    return true;
  } catch (erro) {
    console.error("Falha no cadastro do cliente: ", erro);
    throw erro;
  }
}

export async function excluirClienteFirestore(clienteId) {
  try {
    await deleteDoc(doc(db, "clientes", clienteId));
    return true;
  } catch (erro) {
    console.error("Falha ao excluir cliente: ", erro);
    throw erro;
  }
}
