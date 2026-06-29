import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../hooks/useAuth";
import { login as loginFirebase, logout as logoutFirebase, observarAuth } from "../services/authService";
import { buscarPerfilUsuario, observarPerfilUsuario } from "../services/userService";

function criarMensagemPerfil(perfil) {
  if (!perfil) {
    return "Perfil de usuario nao encontrado no Firestore.";
  }

  if (perfil.ativo !== true) {
    return "Usuario inativo. Fale com o administrador.";
  }

  if (perfil.tipo !== "admin" && perfil.tipo !== "funcionario") {
    return "Tipo de usuario invalido.";
  }

  return null;
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroPerfil, setErroPerfil] = useState("");

  const carregarPerfil = useCallback(async (user) => {
    const perfil = await buscarPerfilUsuario(user.uid);
    const mensagemPerfil = criarMensagemPerfil(perfil);

    if (mensagemPerfil) {
      throw new Error(mensagemPerfil);
    }

    return {
      ...perfil,
      uid: user.uid,
      email: perfil.email || user.email,
    };
  }, []);

  useEffect(() => {
    let unsubscribePerfil = null;

    const unsubscribe = observarAuth(async (user) => {
      setLoading(true);
      setFirebaseUser(user);

      if (unsubscribePerfil) {
        unsubscribePerfil();
        unsubscribePerfil = null;
      }

      if (!user) {
        setUsuario(null);
        setLoading(false);
        return;
      }

      setErroPerfil("");

      unsubscribePerfil = observarPerfilUsuario(user.uid, async (perfil) => {
        const mensagemPerfil = criarMensagemPerfil(perfil);

        if (mensagemPerfil) {
          setUsuario(null);
          setErroPerfil(mensagemPerfil);
          setLoading(false);
          await logoutFirebase();
          return;
        }

        setUsuario({
          ...perfil,
          uid: user.uid,
          email: perfil.email || user.email,
        });
        setLoading(false);
      }, async (error) => {
        console.error("Erro ao acompanhar perfil do usuario:", error);
        setUsuario(null);
        setErroPerfil("Nao foi possivel acompanhar o perfil do usuario.");
        setLoading(false);
        await logoutFirebase();
      });
    });

    return () => {
      if (unsubscribePerfil) {
        unsubscribePerfil();
      }

      unsubscribe();
    };
  }, []);

  const login = useCallback(async (email, senha) => {
    setLoading(true);
    setErroPerfil("");

    try {
      const user = await loginFirebase(email, senha);
      const perfil = await carregarPerfil(user);

      setFirebaseUser(user);
      setUsuario(perfil);

      return perfil;
    } catch (error) {
      setUsuario(null);
      setErroPerfil(error.message);

      if (!error.code?.startsWith("auth/")) {
        await logoutFirebase();
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [carregarPerfil]);

  const logout = useCallback(async () => {
    await logoutFirebase();
    setFirebaseUser(null);
    setUsuario(null);
    setErroPerfil("");
  }, []);

  const valor = useMemo(() => ({
    firebaseUser,
    usuario,
    loading,
    erroPerfil,
    login,
    logout,
    isAdmin: usuario?.tipo === "admin",
  }), [erroPerfil, firebaseUser, loading, login, logout, usuario]);

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  );
}
