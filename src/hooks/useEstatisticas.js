// src/hooks/useEstatisticas.js
import { useMemo } from "react";

const estatisticasVazias = {
  totalClientes: 0,
  faturamentoTotal: 0,
  origens: {},
  faturamentoPorOrigem: {},
};

export function useEstatisticas(clientes = [], loadingClientes = false) {
  const estatisticas = useMemo(() => {
    return clientes.reduce((acumulador, cliente) => {
      const origem = cliente.origem || "Nao informado";
      const valorVenda = parseFloat(cliente.valorVenda) || 0;

      return {
        totalClientes: acumulador.totalClientes + 1,
        faturamentoTotal: acumulador.faturamentoTotal + valorVenda,
        origens: {
          ...acumulador.origens,
          [origem]: (acumulador.origens[origem] || 0) + 1,
        },
        faturamentoPorOrigem: {
          ...acumulador.faturamentoPorOrigem,
          [origem]: (acumulador.faturamentoPorOrigem[origem] || 0) + valorVenda,
        },
      };
    }, estatisticasVazias);
  }, [clientes]);

  return { estatisticas, loading: loadingClientes };
}
