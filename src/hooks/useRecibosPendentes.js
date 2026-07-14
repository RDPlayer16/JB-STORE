import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

export function useRecibosPendentes(usuario) {
  const [recibosPendentes, setRecibosPendentes] = useState([]);
  const [loadingRecibosPendentes, setLoadingRecibosPendentes] = useState(true);
  const [erroRecibosPendentes, setErroRecibosPendentes] = useState("");

  useEffect(() => {
    if (!usuario?.uid) {
      queueMicrotask(() => {
        setRecibosPendentes([]);
        setLoadingRecibosPendentes(false);
        setErroRecibosPendentes("");
      });
      return undefined;
    }

    queueMicrotask(() => {
      setLoadingRecibosPendentes(true);
      setErroRecibosPendentes("");
    });

    const consulta = query(
      collection(db, "recibosPendentes"),
      where("usuarioId", "==", usuario.uid),
      where("status", "==", "pendente"),
    );

    const unsubscribe = onSnapshot(consulta, (snapshot) => {
      const lista = snapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .sort((a, b) => {
          const dataA = a.criadoEm?.toMillis?.() || 0;
          const dataB = b.criadoEm?.toMillis?.() || 0;
          return dataA - dataB;
        });

      setRecibosPendentes(lista);
      setLoadingRecibosPendentes(false);
      setErroRecibosPendentes("");
    }, (erro) => {
      console.error("Erro ao buscar recibos pendentes:", erro);
      setRecibosPendentes([]);
      setLoadingRecibosPendentes(false);
      setErroRecibosPendentes(erro.message || "Nao foi possivel buscar os recibos pendentes.");
    });

    return () => unsubscribe();
  }, [usuario?.uid]);

  return { recibosPendentes, loadingRecibosPendentes, erroRecibosPendentes };
}
