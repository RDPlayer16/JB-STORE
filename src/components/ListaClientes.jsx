// src/components/ListaClientes.jsx
import { useState } from 'react';
import { excluirClienteFirestore } from '../services/funcoesDB';

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
}).format(valor || 0);

function formatarData(dataCadastro) {
  const millis = dataCadastro?.toMillis?.() || (dataCadastro ? Date.parse(dataCadastro) : 0);

  return millis ? new Date(millis).toLocaleDateString('pt-BR') : 'N/A';
}

function rotuloOrigemCadastro(origemCadastro) {
  const rotulos = {
    agente_pasta: 'Agente de pasta',
    scanner: 'Scanner',
    manual: 'Manual',
  };

  return rotulos[origemCadastro] || '';
}

export function ListaClientes({ clientes, loadingClientes }) {
  const [modoDev, setModoDev] = useState(false);

  const handleExcluir = async (id) => {
    const confirmar = window.confirm("Atencao: excluir este cliente abatera automaticamente o valor e a contagem dos graficos. Confirmar?");
    if (!confirmar) return;

    try {
      await excluirClienteFirestore(id);
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      alert("Erro ao excluir. Verifique o console.");
    }
  };

  if (loadingClientes) {
    return <div className="auth-status">Carregando lista...</div>;
  }

  return (
    <section className="panel client-list-panel">
      <div className="section-heading">
        <div>
          <h2>Historico de Clientes</h2>
          <p className="muted-text">Clientes cadastrados por este perfil.</p>
        </div>

        <label className="inline-toggle">
          <input type="checkbox" checked={modoDev} onChange={(e) => setModoDev(e.target.checked)} />
          <span>Habilitar exclusao</span>
        </label>
      </div>

      {clientes.length === 0 ? (
        <p className="empty-state">Nenhum cliente cadastrado.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table responsive-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Objeto</th>
                <th>Origem</th>
                <th>Valor</th>
                <th>Desconto</th>
                <th>Data</th>
                {modoDev && <th>Acao</th>}
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td data-label="Nome">{cliente.nome}</td>
                  <td data-label="Objeto">{cliente.produto || 'Nao informado'}</td>
                  <td data-label="Origem" className="highlight-cell">
                    {cliente.origem}
                    {rotuloOrigemCadastro(cliente.origemCadastro) && (
                      <span className="table-subtext">{rotuloOrigemCadastro(cliente.origemCadastro)}</span>
                    )}
                  </td>
                  <td data-label="Valor" className="success-cell">
                    {formatarMoeda(cliente.valorVenda)}
                    {cliente.valorOriginal > 0 && (
                      <span className="table-subtext">Original: {formatarMoeda(cliente.valorOriginal)}</span>
                    )}
                  </td>
                  <td data-label="Desconto">{formatarMoeda(cliente.desconto)}</td>
                  <td data-label="Data">{formatarData(cliente.dataCadastro)}</td>
                  {modoDev && (
                    <td data-label="Acao">
                      <button
                        type="button"
                        className="danger-button compact-button"
                        onClick={() => handleExcluir(cliente.id)}
                      >
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
