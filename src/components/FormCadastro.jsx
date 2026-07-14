// src/components/FormCadastro.jsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { CameraNotaScanner } from './CameraNotaScanner';
import { lerNota } from '../utils/leitorNota';
import { ORIGEM_CADASTRO } from '../utils/vendaAutomatica';

const valorParaCampo = (valor) => (
  valor === undefined || valor === null || valor === '' ? '' : String(valor)
);

export function FormCadastro({
  onSubmitMock,
  origens = [],
  loadingOrigens = false,
  recibosPendentes = [],
  loadingRecibosPendentes = false,
  erroRecibosPendentes = '',
  onDescartarRecibo,
}) {
  const arquivoNotaRef = useRef(null);
  const [nome, setNome] = useState('');
  const [origem, setOrigem] = useState('');
  const [produto, setProduto] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [desconto, setDesconto] = useState('');
  const [valorVenda, setValorVenda] = useState('');
  const [origemCadastro, setOrigemCadastro] = useState(ORIGEM_CADASTRO.MANUAL);
  const [reciboPendenteId, setReciboPendenteId] = useState('');
  const [reciboHash, setReciboHash] = useState('');
  const [arquivoOrigem, setArquivoOrigem] = useState('');
  const [lendoNota, setLendoNota] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [statusNota, setStatusNota] = useState('');
  const [erroNota, setErroNota] = useState('');
  const semOrigens = !loadingOrigens && origens.length === 0;
  const primeiroReciboPendente = recibosPendentes[0];
  const proximoReciboPendente = reciboPendenteId
    ? recibosPendentes.find((recibo) => recibo.id !== reciboPendenteId)
    : primeiroReciboPendente;
  const formularioLivreParaRecibo = !reciboPendenteId
    && !lendoNota
    && !nome
    && !produto
    && !valorOriginal
    && !desconto
    && !valorVenda;

  const preencherCampos = useCallback((dados, metadados = {}) => {
    setNome(valorParaCampo(dados.nome));
    setProduto(valorParaCampo(dados.produto));
    setValorOriginal(valorParaCampo(dados.valorOriginal));
    setDesconto(valorParaCampo(dados.desconto));
    setValorVenda(valorParaCampo(dados.valorVenda));

    setOrigemCadastro(metadados.origemCadastro || ORIGEM_CADASTRO.SCANNER);
    setReciboPendenteId(metadados.reciboPendenteId || '');
    setReciboHash(metadados.reciboHash || '');
    setArquivoOrigem(metadados.arquivoOrigem || '');
  }, []);

  const preencherComPendente = useCallback((recibo) => {
    if (!recibo) return;

    preencherCampos(recibo, {
      origemCadastro: ORIGEM_CADASTRO.AGENTE_PASTA,
      reciboPendenteId: recibo.id,
      reciboHash: recibo.reciboHash,
      arquivoOrigem: recibo.arquivoOrigem,
    });
    setOrigem('');
    setErroNota('');
    setStatusNota(`Recibo da pasta carregado: ${recibo.arquivoOrigem || 'arquivo recebido'}. Confira e escolha a origem.`);
  }, [preencherCampos]);

  const limparFormulario = () => {
    setNome('');
    setOrigem('');
    setProduto('');
    setValorOriginal('');
    setDesconto('');
    setValorVenda('');
    setOrigemCadastro(ORIGEM_CADASTRO.MANUAL);
    setReciboPendenteId('');
    setReciboHash('');
    setArquivoOrigem('');
    setStatusNota('');
    setErroNota('');
  };

  const descartarReciboAtual = async () => {
    if (!reciboPendenteId) return;

    await onDescartarRecibo?.(reciboPendenteId);
    limparFormulario();
  };

  useEffect(() => {
    if (!formularioLivreParaRecibo || !primeiroReciboPendente) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => preencherComPendente(primeiroReciboPendente), 0);
    return () => window.clearTimeout(timeoutId);
  }, [formularioLivreParaRecibo, preencherComPendente, primeiroReciboPendente]);

  const preencherComNota = async (arquivo) => {
    if (!arquivo) return;

    setLendoNota(true);
    setErroNota('');
    setStatusNota('Lendo nota...');

    try {
      const { dados } = await lerNota(arquivo, setStatusNota);

      preencherCampos(dados, { origemCadastro: ORIGEM_CADASTRO.SCANNER });

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (semOrigens) {
      alert('Cadastre pelo menos uma origem de venda no painel administrativo.');
      return;
    }

    if (!nome || !origem || !valorVenda) {
      alert('Preencha todos os campos.');
      return;
    }

    try {
      await onSubmitMock({
        nome: nome.trim(),
        origem,
        produto: produto.trim(),
        valorOriginal: parseFloat(valorOriginal) || 0,
        desconto: parseFloat(desconto) || 0,
        valorVenda: parseFloat(valorVenda) || 0,
        origemCadastro,
        reciboPendenteId,
        reciboHash,
        arquivoOrigem,
      });

      limparFormulario();
    } catch {
      setErroNota('Nao foi possivel cadastrar. Confira os campos e tente novamente.');
    }
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

        {(reciboPendenteId || proximoReciboPendente || loadingRecibosPendentes || erroRecibosPendentes) && (
          <div className="pending-receipt-box">
            {reciboPendenteId ? (
              <>
                <strong>Recibo aguardando confirmacao</strong>
                <span>{arquivoOrigem || 'Arquivo importado pelo agente'}</span>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={descartarReciboAtual}
                >
                  Descartar
                </button>
              </>
            ) : proximoReciboPendente ? (
              <>
                <strong>Novo recibo detectado</strong>
                <span>{proximoReciboPendente.arquivoOrigem || 'Arquivo importado pelo agente'}</span>
                <button
                  type="button"
                  className="secondary-button compact-button"
                  onClick={() => preencherComPendente(proximoReciboPendente)}
                >
                  Preencher
                </button>
              </>
            ) : erroRecibosPendentes ? (
              <p className="form-error">
                Nao consegui buscar os recibos pendentes: {erroRecibosPendentes}
              </p>
            ) : (
              <span className="muted-text">Verificando recibos da pasta...</span>
            )}
          </div>
        )}

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
