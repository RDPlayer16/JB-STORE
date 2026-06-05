// src/components/ListaClientes.jsx
import { useState } from 'react';
import { useClientes } from '../hooks/useClientes';
import { excluirClienteFirestore } from '../services/funcoesDB';

export function ListaClientes() {
  const { clientes, loadingClientes } = useClientes();
  const [modoDev, setModoDev] = useState(false);

  // Função simplificada: O Firebase cuidará de ler os valores exatos a estornar
  const handleExcluir = async (id) => {
    const confirmar = window.confirm("Atenção: Excluir este cliente abaterá automaticamente o valor e a contagem dos gráficos. Confirmar?");
    if (!confirmar) return;

    try {
      await excluirClienteFirestore(id);
    } catch (error) {
      alert("Erro ao excluir. Verifique o console.");
    }
  };

  if (loadingClientes) return <div style={{ color: 'var(--text-secondary)' }}>Carregando lista...</div>;

  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="header-tabela" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: 'var(--gold-primary)' }}>Histórico de Clientes</h3>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="checkbox" checked={modoDev} onChange={(e) => setModoDev(e.target.checked)} />
          Modo Dev (Habilitar Exclusão)
        </label>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '12px' }}>Nome</th>
              <th style={{ padding: '12px' }}>Origem</th>
              <th style={{ padding: '12px' }}>Valor (R$)</th>
              <th style={{ padding: '12px' }}>Data</th>
              {modoDev && <th style={{ padding: '12px', textAlign: 'right' }}>Ação</th>}
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '12px', textAlign: 'center', color: '#555' }}>Nenhum cliente cadastrado.</td></tr>
            ) : (
              clientes.map(cliente => (
                <tr key={cliente.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '12px', color: '#fff' }}>{cliente.nome}</td>
                  <td style={{ padding: '12px', color: 'var(--gold-primary)' }}>{cliente.origem}</td>
                  <td style={{ padding: '12px', color: '#4CAF50' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cliente.valorVenda || 0)}
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    {cliente.dataCadastro ? new Date(cliente.dataCadastro).toLocaleDateString('pt-BR') : 'N/A'}
                  </td>
                  {modoDev && (
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <button 
                        onClick={() => handleExcluir(cliente.id)} // Passa apenas o ID
                        style={{ background: '#3a0000', color: '#ff4444', border: '1px solid #ff4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        EXCLUIR
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}