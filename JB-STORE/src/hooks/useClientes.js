// src/hooks/useClientes.js
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "./useAuth";
import { db } from "../services/firebaseConfig";

export function useClientes() {
  const { usuario } = useAuth();
  const usuarioId = usuario?.uid;
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoading] = useState(true);

  useEffect(() => {
    if (!usuarioId) {
      return undefined;
    }

    const q = query(collection(db, "clientes"), where("usuarioId", "==", usuarioId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .sort((clienteA, clienteB) => {
          const dataA = new Date(clienteA.dataCadastro || 0).getTime();
          const dataB = new Date(clienteB.dataCadastro || 0).getTime();
          return dataB - dataA;
        });

      setClientes(lista);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar clientes: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [usuarioId]);

  return { clientes, loadingClientes };
}
