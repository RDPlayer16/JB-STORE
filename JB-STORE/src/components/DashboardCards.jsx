// src/components/DashboardCards.jsx
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartDataLabels);

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

function montarCategorias(estatisticas, categorias = []) {
  const nomesConfigurados = categorias.map((categoria) => (
    typeof categoria === "string" ? categoria : categoria?.nome
  ));

  return Array.from(new Set([
    ...nomesConfigurados,
    ...Object.keys(estatisticas?.origens || {}),
    ...Object.keys(estatisticas?.faturamentoPorOrigem || {}),
  ].filter(Boolean)));
}

function gerarInsightsEstrategicos(estatisticas, categoriasGrafico) {
  if (!estatisticas || estatisticas.totalClientes === 0) {
    return ["Aguardando dados suficientes para analise."];
  }

  if (categoriasGrafico.length === 0) {
    return ["Nenhuma origem de venda encontrada para analise."];
  }

  let maxVolCanal = "";
  let maxVol = 0;
  let maxRevCanal = "";
  let maxRev = 0;
  let maxTicketCanal = "";
  let maxTicket = 0;

  categoriasGrafico.forEach((canal) => {
    const vol = estatisticas.origens?.[canal] || 0;
    const rev = estatisticas.faturamentoPorOrigem?.[canal] || 0;
    const ticket = vol > 0 ? rev / vol : 0;

    if (vol > maxVol) {
      maxVol = vol;
      maxVolCanal = canal;
    }

    if (rev > maxRev) {
      maxRev = rev;
      maxRevCanal = canal;
    }

    if (ticket > maxTicket) {
      maxTicket = ticket;
      maxTicketCanal = canal;
    }
  });

  if (maxVol === 0) {
    return ["Nenhum dado valido para analise."];
  }

  const insights = [];

  if (maxVolCanal === maxRevCanal) {
    insights.push(`Dominancia: ${maxVolCanal} lidera em atracao (${maxVol}) e faturamento (${formatarMoeda(maxRev)}).`);
  } else {
    insights.push(`Descolamento: voce atrai mais clientes por ${maxVolCanal} (${maxVol}), mas a maior receita vem de ${maxRevCanal} (${formatarMoeda(maxRev)}).`);
  }

  if (maxTicketCanal && maxTicket > 0) {
    insights.push(`Alto padrao: clientes de ${maxTicketCanal} tem o maior ticket medio (${formatarMoeda(maxTicket)}).`);
  }

  return insights;
}

export function DashboardCards({
  estatisticas,
  categorias = [],
  titulo,
  descricao,
  exibirInsights = true,
}) {
  const dados = estatisticas || {
    totalClientes: 0,
    faturamentoTotal: 0,
    origens: {},
    faturamentoPorOrigem: {},
  };

  const categoriasGrafico = montarCategorias(dados, categorias);
  const valoresClientes = categoriasGrafico.map((cat) => dados.origens?.[cat] || 0);
  const valoresFaturamento = categoriasGrafico.map((cat) => dados.faturamentoPorOrigem?.[cat] || 0);
  const palette = ['#D4AF37', '#B8860B', '#FFD700', '#DAA520', '#70d670', '#4CAF50', '#80cbc4', '#90caf9'];
  const backgroundColors = categoriasGrafico.map((_, index) => palette[index % palette.length]);
  const totalClientesFormatado = dados.totalClientes > 0 ? dados.totalClientes : 1;

  const dataClientes = {
    labels: categoriasGrafico,
    datasets: [{ data: valoresClientes, backgroundColor: backgroundColors, borderColor: '#121212', borderWidth: 2 }]
  };

  const dataFaturamento = {
    labels: categoriasGrafico,
    datasets: [{ data: valoresFaturamento, backgroundColor: backgroundColors, borderColor: '#121212', borderWidth: 2 }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#a0a0a0' } },
      tooltip: { enabled: false },
      datalabels: {
        color: '#000',
        font: { weight: 'bold', size: 12 },
        textAlign: 'center',
        formatter: (valor) => valor === 0 ? null : `${valor}\n(${((valor / totalClientesFormatado) * 100).toFixed(1)}%)`
      }
    }
  };

  const barFaturamentoOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 35 } },
    scales: {
      y: { ticks: { color: '#a0a0a0', callback: (value) => formatarMoeda(value) }, grid: { color: '#2a2a2a' }, beginAtZero: true },
      x: { ticks: { color: '#a0a0a0' }, grid: { display: false } }
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      datalabels: {
        color: '#D4AF37',
        font: { weight: 'bold', size: 12 },
        align: 'top',
        anchor: 'end',
        formatter: (valor) => valor === 0 ? null : formatarMoeda(valor)
      }
    }
  };

  const insightsGerados = gerarInsightsEstrategicos(dados, categoriasGrafico);

  return (
    <div className="panel dashboard-card-panel">
      {(titulo || descricao) && (
        <div className="section-heading dashboard-card-heading">
          <div>
            {titulo && <h2>{titulo}</h2>}
            {descricao && <p className="muted-text">{descricao}</p>}
          </div>
        </div>
      )}

      <div className="grid-responsivo dashboard-total-row">
        <div>
          <h3 style={{ color: 'var(--text-secondary)' }}>Total de Clientes</h3>
          <h1 className="texto-destaque" style={{ color: 'var(--gold-primary)' }}>{dados.totalClientes || 0}</h1>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-secondary)' }}>Faturamento Geral</h3>
          <h1 className="texto-destaque" style={{ color: '#4CAF50' }}>{formatarMoeda(dados.faturamentoTotal)}</h1>
        </div>
      </div>

      {categoriasGrafico.length === 0 ? (
        <p className="muted-text">Nenhuma origem de venda cadastrada ainda.</p>
      ) : (
        <div className="grid-responsivo chart-grid">
          <div className="chart-card">
            <h4>Volume (Pizza)</h4>
            <div className="chart-frame pie-frame">
              <Pie data={dataClientes} options={pieOptions} />
            </div>
          </div>
          <div className="chart-card">
            <h4>Receita (Barras)</h4>
            <div className="chart-frame">
              <Bar data={dataFaturamento} options={barFaturamentoOptions} />
            </div>
          </div>
        </div>
      )}

      {exibirInsights && (
        <div className="insights-box">
          <h4>Resumo Estrategico</h4>
          <ul>
            {insightsGerados.map((insight, index) => (
              <li key={index}>{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
