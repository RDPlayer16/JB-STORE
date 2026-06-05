// src/hooks/useClientes.js
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export function useClientes() {
    const [clientes, setClientes] = useState([]);
    const [loadingClientes, setLoading] = useState(true);

    useEffect(() => {
        // Busca os clientes ordenados pela data de cadastro (mais recentes primeiro)
        const q = query(collection(db, 'clientes'), orderBy('dataCadastro', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lista = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setClientes(lista);
            setLoading(false);
        }, (error) => {
            console.error("Erro ao buscar clientes: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { clientes, loadingClientes };
}