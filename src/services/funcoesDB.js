// src/services/funcoesDB.js
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { normalizarVendaFirestore, ORIGEM_CADASTRO } from "../utils/vendaAutomatica";

function montarClienteCompativelRegrasAtuais(venda) {
  return {
    nome: venda.nome,
    origem: venda.origem,
    produto: venda.produto,
    valorOriginal: venda.valorOriginal,
    desconto: venda.desconto,
    valorVenda: venda.valorVenda,
    usuarioId: venda.usuarioId,
    usuarioNome: venda.usuarioNome,
    usuarioEmail: venda.usuarioEmail,
    adminDonoId: venda.adminDonoId,
    adminDonoNome: venda.adminDonoNome,
    adminDonoEmail: venda.adminDonoEmail,
  };
}

export async function cadastrarClienteFirestore(dadosCliente, usuario) {
  try {
    const venda = normalizarVendaFirestore(dadosCliente, usuario, {
      origemCadastro: dadosCliente.origemCadastro || ORIGEM_CADASTRO.MANUAL,
    });
    const cliente = montarClienteCompativelRegrasAtuais(venda);

    const documento = await addDoc(collection(db, "clientes"), {
      ...cliente,
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
