import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseConfig";

export function useOrigensVenda() {
  const [origens, setOrigens] = useState([]);
  const [loadingOrigens, setLoadingOrigens] = useState(true);
  const [erroOrigens, setErroOrigens] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "origensVenda"), (snapshot) => {
      const lista = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      setOrigens(lista);
      setErroOrigens("");
      setLoadingOrigens(false);
    }, (error) => {
      console.error("Erro ao carregar origens de venda:", error);
      setErroOrigens("Nao foi possivel carregar as origens de venda.");
      setLoadingOrigens(false);
    });

    return () => unsubscribe();
  }, []);

  const origensAtivas = useMemo(() => (
    origens
      .filter((origem) => origem.ativo !== false)
      .sort((origemA, origemB) => (origemA.nome || "").localeCompare(origemB.nome || "", "pt-BR"))
  ), [origens]);

  return {
    origens,
    origensAtivas,
    loadingOrigens,
    erroOrigens,
  };
}
