import { useNavigate } from "react-router-dom";
import { DashboardCards } from "../components/DashboardCards";
import { FormCadastro } from "../components/FormCadastro";
import { ListaClientes } from "../components/ListaClientes";
import { useAuth } from "../hooks/useAuth";
import { useClientes } from "../hooks/useClientes";
import { useEstatisticas } from "../hooks/useEstatisticas";
import { useOrigensVenda } from "../hooks/useOrigensVenda";
import { cadastrarClienteFirestore } from "../services/funcoesDB";

export default function FuncionariosDashboard() {
  const navigate = useNavigate();
  const { logout, usuario } = useAuth();
  const { clientes, loadingClientes } = useClientes();
  const { origensAtivas, loadingOrigens } = useOrigensVenda();
  const { estatisticas, loading } = useEstatisticas(clientes, loadingClientes);

  const lidarComCadastroReal = async (novoCliente) => {
    try {
      await cadastrarClienteFirestore(novoCliente, usuario);
    } catch (erro) {
      console.error("Erro ao cadastrar cliente:", erro);
      alert("Erro ao registrar cliente. Verifique o console.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="auth-status">
        A carregar dados do sistema...
      </div>
    );
  }

  const dadosSeguros = estatisticas || { totalClientes: 0, origens: {} };

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">Area do funcionario</span>
          <h1>Dashboard de Clientes</h1>
          <p>Ola, {usuario?.nome || usuario?.email}. Cadastre clientes e acompanhe os indicadores.</p>
        </div>

        <button type="button" className="secondary-button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <div className="dashboard-container">
        <FormCadastro
          onSubmitMock={lidarComCadastroReal}
          origens={origensAtivas}
          loadingOrigens={loadingOrigens}
        />
        <DashboardCards estatisticas={dadosSeguros} categorias={origensAtivas} />
      </div>

      <ListaClientes clientes={clientes} loadingClientes={loadingClientes} />
    </main>
  );
}
