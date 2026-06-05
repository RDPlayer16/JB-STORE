// src/hooks/useEstatisticas.js
import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig'; // Sua instância do Firestore

export function useEstatisticas() {
    const [estatisticas, setEstatisticas] = useState({ totalClientes: 0, origens: {} });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const statsRef = doc(db, 'sistema', 'estatisticas');
        
        // onSnapshot retorna uma função de unsubscribe
        const unsubscribe = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                setEstatisticas(docSnap.data());
            }
            setLoading(false);
        }, (error) => {
            console.error("Erro na leitura em tempo real: ", error);
            setLoading(false);
        });

        // Limpeza essencial: cancela a escuta do Firestore ao desmontar o componente
        return () => unsubscribe();
    }, []);

    return { estatisticas, loading };
}