// src/services/funcoesDB.js
import { doc, collection, runTransaction } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Função de Cadastro Atômico (Inalterada)
export async function cadastrarClienteFirestore(dadosCliente) {
  const clienteRef = doc(collection(db, "clientes")); 
  const statsRef = doc(db, "sistema", "estatisticas");
  const origem = dadosCliente.origem;
  const valorVenda = parseFloat(dadosCliente.valorVenda) || 0;

  try {
    await runTransaction(db, async (transaction) => {
      const statsDoc = await transaction.get(statsRef);
      if (!statsDoc.exists()) throw new Error("Documento de estatísticas base não encontrado.");

      const dadosAtuais = statsDoc.data();
      
      const novasEstatisticas = {
        totalClientes: (dadosAtuais.totalClientes || 0) + 1,
        faturamentoTotal: (dadosAtuais.faturamentoTotal || 0) + valorVenda,
        origens: {
          ...dadosAtuais.origens,
          [origem]: (dadosAtuais.origens?.[origem] || 0) + 1
        },
        faturamentoPorOrigem: {
          ...(dadosAtuais.faturamentoPorOrigem || {}),
          [origem]: (dadosAtuais.faturamentoPorOrigem?.[origem] || 0) + valorVenda
        }
      };

      transaction.set(clienteRef, { 
        ...dadosCliente, 
        valorVenda, 
        dataCadastro: new Date().toISOString() 
      });
      transaction.update(statsRef, novasEstatisticas);
    });
    return true; 
  } catch (erro) {
    console.error("Falha na transação de cadastro: ", erro);
    throw erro; 
  }
}

// NOVA Função de Exclusão Atômica (Leitura Cega Confiável)
export async function excluirClienteFirestore(clienteId) {
  const clienteRef = doc(db, "clientes", clienteId);
  const statsRef = doc(db, "sistema", "estatisticas");

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Lê a verdade absoluta do cliente diretamente no banco ANTES de excluir
      const clienteDoc = await transaction.get(clienteRef);
      if (!clienteDoc.exists()) throw new Error("Cliente não encontrado no banco.");
      
      const dadosCliente = clienteDoc.data();
      const origem = dadosCliente.origem;
      const valorAbater = parseFloat(dadosCliente.valorVenda) || 0;

      // 2. Lê as estatísticas atuais
      const statsDoc = await transaction.get(statsRef);
      if (!statsDoc.exists()) throw new Error("Estatísticas não encontradas.");

      const dadosAtuais = statsDoc.data();

      // 3. Recálculo reverso matemático
      const novasEstatisticas = {
        totalClientes: Math.max((dadosAtuais.totalClientes || 0) - 1, 0),
        faturamentoTotal: Math.max((dadosAtuais.faturamentoTotal || 0) - valorAbater, 0),
        origens: {
          ...dadosAtuais.origens,
          [origem]: Math.max((dadosAtuais.origens?.[origem] || 0) - 1, 0)
        },
        faturamentoPorOrigem: {
          ...(dadosAtuais.faturamentoPorOrigem || {}),
          [origem]: Math.max((dadosAtuais.faturamentoPorOrigem?.[origem] || 0) - valorAbater, 0)
        }
      };

      // 4. Exclui o documento e atualiza o dashboard simultaneamente
      transaction.delete(clienteRef);
      transaction.update(statsRef, novasEstatisticas);
    });
    
    return true;
  } catch (erro) {
    console.error("Falha ao excluir cliente e recalcular: ", erro);
    throw erro;
  }
}