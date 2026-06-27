import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { criarUsuarioAuthSecundario } from "./authService";
import { db } from "./firebaseConfig";

const usuariosCollection = collection(db, "usuarios");

export async function buscarPerfilUsuario(uid) {
  const usuarioRef = doc(db, "usuarios", uid);
  const usuarioSnap = await getDoc(usuarioRef);

  if (!usuarioSnap.exists()) {
    return null;
  }

  return {
    uid: usuarioSnap.id,
    ...usuarioSnap.data(),
  };
}

export async function listarUsuarios() {
  const snapshot = await getDocs(usuariosCollection);
  const usuarios = snapshot.docs.map((documento) => ({
    uid: documento.id,
    ...documento.data(),
  }));

  return usuarios.sort((usuarioA, usuarioB) => {
    const dataA = usuarioA.criadoEm?.toMillis?.() || 0;
    const dataB = usuarioB.criadoEm?.toMillis?.() || 0;
    return dataB - dataA;
  });
}

export async function criarPerfilUsuario(uid, dadosUsuario) {
  const usuarioRef = doc(db, "usuarios", uid);

  await setDoc(usuarioRef, {
    nome: dadosUsuario.nome,
    email: dadosUsuario.email,
    tipo: dadosUsuario.tipo,
    ativo: true,
    criadoEm: serverTimestamp(),
  });
}

const tiposPermitidos = ["admin", "funcionario"];

export async function criarUsuario({ nome, email, senha, tipo = "funcionario" }) {
  const tipoPerfil = tiposPermitidos.includes(tipo) ? tipo : "funcionario";
  const usuarioAuth = await criarUsuarioAuthSecundario(email, senha);

  await criarPerfilUsuario(usuarioAuth.uid, {
    nome,
    email,
    tipo: tipoPerfil,
  });

  return {
    uid: usuarioAuth.uid,
    nome,
    email,
    tipo: tipoPerfil,
    ativo: true,
  };
}

export async function criarFuncionario({ nome, email, senha }) {
  return criarUsuario({ nome, email, senha, tipo: "funcionario" });
}

export async function atualizarStatusUsuario(uid, ativo) {
  const usuarioRef = doc(db, "usuarios", uid);
  await updateDoc(usuarioRef, { ativo });
}
