import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseConfig";

const origensCollection = collection(db, "origensVenda");

function normalizarNome(nome) {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function cadastrarOrigemVenda(nome) {
  const nomeLimpo = nome.trim();

  if (!nomeLimpo) {
    throw new Error("Informe o nome da origem de venda.");
  }

  const nomeNormalizado = normalizarNome(nomeLimpo);
  const snapshot = await getDocs(origensCollection);
  const origemJaExiste = snapshot.docs.some((documento) => (
    normalizarNome(documento.data().nome || "") === nomeNormalizado
  ));

  if (origemJaExiste) {
    throw new Error("Esta origem de venda ja esta cadastrada.");
  }

  await addDoc(origensCollection, {
    nome: nomeLimpo,
    nomeNormalizado,
    ativo: true,
    criadoEm: serverTimestamp(),
  });
}

export async function excluirOrigemVenda(origemId) {
  if (!origemId) {
    throw new Error("Origem de venda nao encontrada.");
  }

  await deleteDoc(doc(db, "origensVenda", origemId));
}
