// src/services/funcoesDB.js
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export async function cadastrarClienteFirestore(dadosCliente, usuario) {
  if (!usuario?.uid) {
    throw new Error("Usuario logado nao encontrado.");
  }

  const valorVenda = parseFloat(dadosCliente.valorVenda) || 0;

  try {
    await addDoc(collection(db, "clientes"), {
      ...dadosCliente,
      valorVenda,
      usuarioId: usuario.uid,
      usuarioNome: usuario.nome || usuario.email,
      usuarioEmail: usuario.email,
      dataCadastro: new Date().toISOString(),
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
