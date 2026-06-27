import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, getSecondaryAuth } from "./firebaseConfig";

export async function login(email, senha) {
  const credenciais = await signInWithEmailAndPassword(auth, email, senha);
  return credenciais.user;
}

export async function logout() {
  await signOut(auth);
}

export function observarAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function getUsuarioAtual() {
  return auth.currentUser;
}

export async function criarUsuarioAuthSecundario(email, senha) {
  const secondaryAuth = getSecondaryAuth();
  const credenciais = await createUserWithEmailAndPassword(secondaryAuth, email, senha);

  await signOut(secondaryAuth);
  return credenciais.user;
}
