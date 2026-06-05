// src/components/FormCadastro.jsx
import { useState } from 'react';

export function FormCadastro({ onSubmitMock }) {
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [valorVenda, setValorVenda] = useState(''); // Novo estado

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nome || !origem || !valorVenda) return alert('Preencha todos os campos.');
    
    onSubmitMock({ nome, origem, valorVenda: parseFloat(valorVenda) });
    
    setNome('');
    setOrigem('');
    setValorVenda('');
  };

  return (
    <div className="panel">
      <h2 style={{ color: 'var(--gold-primary)', marginBottom: '16px' }}>Novo Cliente</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <input 
          type="text" 
          placeholder="Nome do Cliente" 
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ padding: '12px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
        />

        <select 
          value={origem} 
          onChange={(e) => setOrigem(e.target.value)}
          style={{ padding: '12px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
        >
          <option value="" disabled>Como conheceu a loja?</option>
          <option value="Instagram">Instagram</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Boca a Boca">Indicação / Boca a Boca</option>
          <option value="Passagem">Passagem na rua</option>
        </select>

        {/* Novo input financeiro */}
        <input 
          type="number" 
          step="0.01"
          placeholder="Valor da Venda (Ex: 150.50)" 
          value={valorVenda}
          onChange={(e) => setValorVenda(e.target.value)}
          style={{ padding: '12px', background: '#000', border: '1px solid var(--border-color)', color: '#fff', borderRadius: '4px' }}
        />

        <button 
          type="submit" 
          style={{ padding: '12px', background: 'var(--gold-primary)', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          CADASTRAR
        </button>
      </form>
    </div>
  );
}