// src/components/FormCadastro.jsx
import { useState } from 'react';

export function FormCadastro({ onSubmitMock, origens = [], loadingOrigens = false }) {
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const semOrigens = !loadingOrigens && origens.length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (semOrigens) {
      alert('Cadastre pelo menos uma origem de venda no painel administrativo.');
      return;
    }

    if (!nome || !origem || !valorVenda) {
      alert('Preencha todos os campos.');
      return;
    }

    onSubmitMock({ nome, origem, valorVenda: parseFloat(valorVenda) });

    setNome('');
    setOrigem('');
    setValorVenda('');
  };

  return (
    <div className="panel cadastro-card">
      <h2>Novo Cliente</h2>
      <form onSubmit={handleSubmit} className="cadastro-form">
        <label className="form-field">
          <span>Nome do cliente</span>
          <input
            type="text"
            placeholder="Nome do Cliente"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Origem da venda</span>
          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            disabled={loadingOrigens || semOrigens}
          >
            <option value="" disabled>
              {loadingOrigens
                ? 'Carregando origens...'
                : semOrigens ? 'Nenhuma origem cadastrada' : 'Como conheceu a loja?'}
            </option>
            {origens.map((item) => (
              <option key={item.id || item.nome} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Valor da venda</span>
          <input
            type="number"
            step="0.01"
            placeholder="Valor da Venda (Ex: 150.50)"
            value={valorVenda}
            onChange={(e) => setValorVenda(e.target.value)}
          />
        </label>

        <button
          type="submit"
          className="primary-button"
          disabled={loadingOrigens || semOrigens}
        >
          CADASTRAR
        </button>
      </form>
    </div>
  );
}
