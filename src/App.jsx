// src/App.jsx
import { FormCadastro } from './components/FormCadastro';
import { DashboardCards } from './components/DashboardCards';
import { ListaClientes } from './components/ListaClientes';
import { useEstatisticas } from './hooks/useEstatisticas';
import { cadastrarClienteFirestore } from './services/funcoesDB';

export default function App() {
  // O hook agora conecta-se diretamente ao Firestore. 
  // O estado 'estatisticas' será atualizado automaticamente a cada alteração na nuvem.
  const { estatisticas, loading } = useEstatisticas(); 

  const lidarComCadastroReal = async (novoCliente) => {
    try {
      // Executa a transação no Firebase
      await cadastrarClienteFirestore(novoCliente);
      // Não é necessário atualizar o estado local (setEstatisticas). 
      // O Firestore onSnapshot no hook fará isso reagir em milissegundos.
    } catch (erro) {
      alert("Erro ao registar cliente. Verifique a consola.");
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--gold-primary)', textAlign: 'center', marginTop: '50px' }}>
        A carregar dados do sistema...
      </div>
    );
  }

  // Prevenção de falha de renderização caso a base de dados retorne undefined
  const dadosSeguros = estatisticas || { totalClientes: 0, origens: {} };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="dashboard-container">
        <FormCadastro onSubmitMock={lidarComCadastroReal} />
        <DashboardCards estatisticas={dadosSeguros} />
      </div>
      
      {/* Tabela de Clientes com a opção de exclusão */}
      <ListaClientes />
    </div>
  );
}