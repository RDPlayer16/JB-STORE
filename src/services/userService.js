import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { criarUsuarioAuthSecundario } from "./authService";
import { db } from "./firebaseConfig";
import { TIPO_ADMIN, TIPO_FUNCIONARIO, ehAdminGeral } from "../utils/perfis";

const usuariosCollection = collection(db, "usuarios");
const tiposPermitidos = [TIPO_ADMIN, TIPO_FUNCIONARIO];
const LIMITE_ESCRITAS_LOTE = 450;

function montarResumoCriador(usuarioCriador) {
  return {
    criadoPorUid: usuarioCriador.uid,
    criadoPorNome: usuarioCriador.nome || usuarioCriador.email || "",
    criadoPorEmail: usuarioCriador.email || "",
  };
}

function montarDadosRelacionamento(tipoPerfil, usuarioCriador) {
  const resumoCriador = montarResumoCriador(usuarioCriador);

  if (tipoPerfil === TIPO_ADMIN) {
    return {
      ...resumoCriador,
      adminGeral: false,
    };
  }

  return {
    ...resumoCriador,
    adminDonoId: usuarioCriador.uid,
    adminDonoNome: usuarioCriador.nome || usuarioCriador.email || "",
    adminDonoEmail: usuarioCriador.email || "",
  };
}

function validarCriacaoUsuario(tipoPerfil, usuarioCriador) {
  if (!usuarioCriador?.uid || usuarioCriador.tipo !== TIPO_ADMIN) {
    throw new Error("Somente administradores podem criar perfis.");
  }

  if (ehAdminGeral(usuarioCriador) && tipoPerfil !== TIPO_ADMIN) {
    throw new Error("O administrador geral cria apenas administradores clientes.");
  }

  if (!ehAdminGeral(usuarioCriador) && tipoPerfil !== TIPO_FUNCIONARIO) {
    throw new Error("Administradores clientes criam apenas funcionarios.");
  }
}

function ordenarPorCriacao(usuarios) {
  return usuarios.sort((usuarioA, usuarioB) => {
    const dataA = usuarioA.criadoEm?.toMillis?.() || 0;
    const dataB = usuarioB.criadoEm?.toMillis?.() || 0;
    return dataB - dataA;
  });
}

async function atualizarStatusEmLotes(referencias, ativo) {
  for (let indice = 0; indice < referencias.length; indice += LIMITE_ESCRITAS_LOTE) {
    const lote = writeBatch(db);
    const fatia = referencias.slice(indice, indice + LIMITE_ESCRITAS_LOTE);

    fatia.forEach((referencia) => {
      lote.update(referencia, {
        ativo,
        atualizadoEm: serverTimestamp(),
      });
    });

    await lote.commit();
  }
}

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

export function observarPerfilUsuario(uid, onChange, onError) {
  const usuarioRef = doc(db, "usuarios", uid);

  return onSnapshot(usuarioRef, (usuarioSnap) => {
    if (!usuarioSnap.exists()) {
      onChange(null);
      return;
    }

    onChange({
      uid: usuarioSnap.id,
      ...usuarioSnap.data(),
    });
  }, onError);
}

export async function listarUsuarios(usuarioLogado) {
  if (!usuarioLogado?.uid || usuarioLogado.tipo !== TIPO_ADMIN) {
    throw new Error("Administrador logado nao encontrado.");
  }

  const consultaUsuarios = ehAdminGeral(usuarioLogado)
    ? query(usuariosCollection, where("tipo", "==", TIPO_ADMIN))
    : query(usuariosCollection, where("adminDonoId", "==", usuarioLogado.uid));

  const snapshot = await getDocs(consultaUsuarios);
  const usuarios = snapshot.docs.map((documento) => ({
    uid: documento.id,
    ...documento.data(),
  }));

  const usuariosFiltrados = ehAdminGeral(usuarioLogado)
    ? usuarios.filter((usuario) => (
      usuario.uid !== usuarioLogado.uid
    ))
    : usuarios.filter((usuario) => usuario.tipo === TIPO_FUNCIONARIO);

  return ordenarPorCriacao(usuariosFiltrados);
}

export async function criarPerfilUsuario(uid, dadosUsuario) {
  const usuarioRef = doc(db, "usuarios", uid);

  await setDoc(usuarioRef, {
    nome: dadosUsuario.nome,
    email: dadosUsuario.email,
    tipo: dadosUsuario.tipo,
    ativo: true,
    ...dadosUsuario.relacionamento,
    criadoEm: serverTimestamp(),
  });
}

export async function criarUsuario({
  nome,
  email,
  senha,
  tipo = TIPO_FUNCIONARIO,
  usuarioCriador,
}) {
  const tipoPerfil = tiposPermitidos.includes(tipo) ? tipo : TIPO_FUNCIONARIO;
  validarCriacaoUsuario(tipoPerfil, usuarioCriador);

  const usuarioAuth = await criarUsuarioAuthSecundario(email, senha);
  const relacionamento = montarDadosRelacionamento(tipoPerfil, usuarioCriador);

  await criarPerfilUsuario(usuarioAuth.uid, {
    nome,
    email,
    tipo: tipoPerfil,
    relacionamento,
  });

  return {
    uid: usuarioAuth.uid,
    nome,
    email,
    tipo: tipoPerfil,
    ativo: true,
    ...relacionamento,
  };
}

export async function criarFuncionario({ nome, email, senha, usuarioCriador }) {
  return criarUsuario({
    nome,
    email,
    senha,
    tipo: TIPO_FUNCIONARIO,
    usuarioCriador,
  });
}

export async function atualizarStatusUsuario(uid, ativo, usuarioLogado) {
  if (!usuarioLogado?.uid || usuarioLogado.tipo !== TIPO_ADMIN) {
    throw new Error("Administrador logado nao encontrado.");
  }

  if (uid === usuarioLogado.uid) {
    throw new Error("Voce nao pode alterar o status do proprio usuario logado.");
  }

  const usuarioAlvo = await buscarPerfilUsuario(uid);

  if (!usuarioAlvo) {
    throw new Error("Usuario nao encontrado.");
  }

  const usuarioRef = doc(db, "usuarios", uid);

  if (ehAdminGeral(usuarioLogado)) {
    if (usuarioAlvo.tipo !== TIPO_ADMIN) {
      throw new Error("O administrador geral altera apenas administradores.");
    }

    const funcionariosSnapshot = await getDocs(
      query(usuariosCollection, where("adminDonoId", "==", uid)),
    );
    const referencias = [
      usuarioRef,
      ...funcionariosSnapshot.docs.map((documento) => documento.ref),
    ];

    await atualizarStatusEmLotes(referencias, ativo);

    return {
      totalAfetados: referencias.length,
    };
  }

  if (
    usuarioAlvo.tipo !== TIPO_FUNCIONARIO
    || usuarioAlvo.adminDonoId !== usuarioLogado.uid
  ) {
    throw new Error("Voce pode alterar apenas funcionarios vinculados ao seu admin.");
  }

  await updateDoc(usuarioRef, {
    ativo,
    atualizadoEm: serverTimestamp(),
  });

  return {
    totalAfetados: 1,
  };
}
