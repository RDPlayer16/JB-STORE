// src/components/FormCadastro.jsx
import { useRef, useState } from 'react';
import { CameraNotaScanner } from './CameraNotaScanner';
import { lerNota } from '../utils/leitorNota';

export function FormCadastro({ onSubmitMock, origens = [], loadingOrigens = false }) {
  const arquivoNotaRef = useRef(null);
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [produto, setProduto] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [desconto, setDesconto] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [lendoNota, setLendoNota] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [statusNota, setStatusNota] = useState('');
  const [erroNota, setErroNota] = useState('');
  const semOrigens = !loadingOrigens && origens.length === 0;

  const preencherComNota = async (arquivo) => {
    if (!arquivo) return;

    setLendoNota(true);
    setErroNota('');
    setStatusNota('Lendo nota...');

    try {
      const { dados } = await lerNota(arquivo, setStatusNota);

      if (dados.nome) setNome(dados.nome);
      if (dados.produto) setProduto(dados.produto);
      if (dados.valorOriginal) setValorOriginal(dados.valorOriginal);
      if (dados.desconto) setDesconto(dados.desconto);
      if (dados.valorVenda) setValorVenda(dados.valorVenda);

      setStatusNota('Nota preenchida. Confira os campos antes de cadastrar.');
    } catch (erro) {
      console.error('Erro ao ler nota:', erro);
      setErroNota(erro.message || 'Nao foi possivel ler a nota.');
      setStatusNota('');
    } finally {
      setLendoNota(false);
      if (arquivoNotaRef.current) {
        arquivoNotaRef.current.value = '';
      }
    }
  };

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

    onSubmitMock({
      nome: nome.trim(),
      origem,
      produto: produto.trim(),
      valorOriginal: parseFloat(valorOriginal) || 0,
      desconto: parseFloat(desconto) || 0,
      valorVenda: parseFloat(valorVenda) || 0,
    });

    setNome('');
    setOrigem('');
    setProduto('');
    setValorOriginal('');
    setDesconto('');
    setValorVenda('');
    setStatusNota('');
    setErroNota('');
  };

  return (
    <div className="panel cadastro-card">
      <h2>Novo Cliente</h2>
      <form onSubmit={handleSubmit} className="cadastro-form">
        <div className="scan-note-box">
          <input
            ref={arquivoNotaRef}
            className="hidden-file-input"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => preencherComNota(e.target.files?.[0])}
          />

          <div className="scan-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => setCameraAberta(true)}
              disabled={lendoNota}
            >
              Usar camera
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => arquivoNotaRef.current?.click()}
              disabled={lendoNota}
            >
              Enviar arquivo
            </button>
          </div>

          {statusNota && <p className="form-success">{statusNota}</p>}
          {erroNota && <p className="form-error">{erroNota}</p>}
        </div>

        <CameraNotaScanner
          aberto={cameraAberta}
          onFechar={() => setCameraAberta(false)}
          onCapturar={preencherComNota}
          processando={lendoNota}
        />

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
          <span>Objeto vendido</span>
          <input
            type="text"
            placeholder="Produto vendido"
            value={produto}
            onChange={(e) => setProduto(e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Valor original</span>
          <input
            type="number"
            step="0.01"
            placeholder="Valor antes do desconto"
            value={valorOriginal}
            onChange={(e) => setValorOriginal(e.target.value)}
          />
        </label>

        <label className="form-field">
          <span>Desconto</span>
          <input
            type="number"
            step="0.01"
            placeholder="Desconto aplicado"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
          />
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
