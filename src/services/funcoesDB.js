// src/services/funcoesDB.js
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { normalizarVendaFirestore, ORIGEM_CADASTRO } from "../utils/vendaAutomatica";

export async function cadastrarClienteFirestore(dadosCliente, usuario) {
  try {
    const venda = normalizarVendaFirestore(dadosCliente, usuario, {
      origemCadastro: dadosCliente.origemCadastro || ORIGEM_CADASTRO.MANUAL,
    });

    const documento = await addDoc(collection(db, "clientes"), {
      ...venda,
      dataCadastro: serverTimestamp(),
    });

    return documento.id;
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

export async function marcarReciboPendenteCadastrado(reciboId, clienteId) {
  if (!reciboId) return false;

  try {
    await updateDoc(doc(db, "recibosPendentes", reciboId), {
      status: "cadastrado",
      clienteId: clienteId || "",
      atualizadoEm: serverTimestamp(),
    });
    return true;
  } catch (erro) {
    console.error("Falha ao concluir recibo pendente: ", erro);
    throw erro;
  }
}

export async function descartarReciboPendente(reciboId) {
  if (!reciboId) return false;

  try {
    await updateDoc(doc(db, "recibosPendentes", reciboId), {
      status: "descartado",
      atualizadoEm: serverTimestamp(),
    });
    return true;
  } catch (erro) {
    console.error("Falha ao descartar recibo pendente: ", erro);
    throw erro;
  }
}
