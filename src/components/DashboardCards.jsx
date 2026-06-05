// src/components/DashboardCards.jsx
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartDataLabels);

const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

function gerarInsightsEstrategicos(estatisticas) {
  if (!estatisticas || estatisticas.totalClientes === 0) return ["Aguardando dados suficientes para análise."];

  const categorias = ["Instagram", "WhatsApp", "Boca a Boca", "Passagem"];
  
  let maxVolCanal = ''; let maxVol = 0;
  let maxRevCanal = ''; let maxRev = 0;
  let maxTicketCanal = ''; let maxTicket = 0;

  categorias.forEach(canal => {
    const vol = estatisticas.origens?.[canal] || 0;
    const rev = estatisticas.faturamentoPorOrigem?.[canal] || 0;
    const ticket = vol > 0 ? rev / vol : 0;

    if (vol > maxVol) { maxVol = vol; maxVolCanal = canal; }
    if (rev > maxRev) { maxRev = rev; maxRevCanal = canal; }
    if (ticket > maxTicket) { maxTicket = ticket; maxTicketCanal = canal; }
  });

  if (maxVol === 0) return ["Nenhum dado válido para análise."];

  const insights = [];
  if (maxVolCanal === maxRevCanal) {
    insights.push(`Dominância: O ${maxVolCanal} é o motor principal, liderando em atração (${maxVol}) e faturamento (${formatarMoeda(maxRev)}).`);
  } else {
    insights.push(`Descolamento: Você atrai mais cabeças pelo ${maxVolCanal} (${maxVol}), mas a maior receita vem do ${maxRevCanal} (${formatarMoeda(maxRev)}).`);
  }

  if (maxTicketCanal && maxTicket > 0) {
    insights.push(`Alto Padrão: Os clientes de ${maxTicketCanal} são os mais valiosos (Ticket Médio: ${formatarMoeda(maxTicket)}).`);
  }

  return insights;
}

export function DashboardCards({ estatisticas }) {
  const categoriasFixas = ["Instagram", "WhatsApp", "Boca a Boca", "Passagem"];
  
  const valoresClientes = categoriasFixas.map(cat => estatisticas.origens?.[cat] || 0);
  const valoresFaturamento = categoriasFixas.map(cat => estatisticas.faturamentoPorOrigem?.[cat] || 0);
  
  const backgroundColors = ['#D4AF37', '#B8860B', '#FFD700', '#DAA520'];
  const totalClientesFormatado = estatisticas.totalClientes > 0 ? estatisticas.totalClientes : 1;

  const dataClientes = {
    labels: categoriasFixas,
    datasets: [{ data: valoresClientes, backgroundColor: backgroundColors, borderColor: '#121212', borderWidth: 2 }]
  };

  const dataFaturamento = {
    labels: categoriasFixas,
    datasets: [{ data: valoresFaturamento, backgroundColor: backgroundColors, borderColor: '#121212', borderWidth: 2 }]
  };

  const pieOptions = {
    plugins: { 
      legend: { labels: { color: '#a0a0a0' } }, tooltip: { enabled: false },
      datalabels: {
        color: '#000', font: { weight: 'bold', size: 12 }, textAlign: 'center',
        formatter: (valor) => valor === 0 ? null : `${valor}\n(${((valor / totalClientesFormatado) * 100).toFixed(1)}%)`
      }
    }
  };

  const barFaturamentoOptions = {
    responsive: true,
    layout: { padding: { top: 35 } },
    scales: {
      y: { ticks: { color: '#a0a0a0', callback: (value) => formatarMoeda(value) }, grid: { color: '#2a2a2a' }, beginAtZero: true },
      x: { ticks: { color: '#a0a0a0' }, grid: { display: false } }
    },
    plugins: { 
      legend: { display: false }, tooltip: { enabled: false },
      datalabels: {
        color: 'var(--gold-primary)', font: { weight: 'bold', size: 12 }, align: 'top', anchor: 'end',
        formatter: (valor) => valor === 0 ? null : formatarMoeda(valor)
      }
    }
  };

  const insightsGerados = gerarInsightsEstrategicos(estatisticas);

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Classe CSS assumiu o controlo aqui */}
      <div className="grid-responsivo" style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ color: 'var(--text-secondary)' }}>Total de Clientes</h3>
          <h1 className="texto-destaque" style={{ color: 'var(--gold-primary)' }}>{estatisticas.totalClientes || 0}</h1>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-secondary)' }}>Faturamento Geral</h3>
          <h1 className="texto-destaque" style={{ color: '#4CAF50' }}>{formatarMoeda(estatisticas.faturamentoTotal)}</h1>
        </div>
      </div>

      {/* Classe CSS assumiu o controlo dos gráficos */}
      <div className="grid-responsivo">
        <div>
          <h4 style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>Volume (Pizza)</h4>
          <Pie data={dataClientes} options={pieOptions} />
        </div>
        <div>
          <h4 style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>Receita (Barras)</h4>
          <Bar data={dataFaturamento} options={barFaturamentoOptions} />
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '16px', background: '#1a1a1a', borderRadius: '8px', borderLeft: '4px solid var(--gold-primary)' }}>
        <h4 style={{ color: 'var(--gold-primary)', marginBottom: '8px', textTransform: 'uppercase', fontSize: '14px' }}>Resumo Estratégico</h4>
        <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {insightsGerados.map((insight, index) => (
            <li key={index} style={{ color: '#e0e0e0', fontSize: '14px', lineHeight: '1.5' }}>• {insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}