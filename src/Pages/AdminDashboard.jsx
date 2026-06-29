import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DashboardCards } from "../components/DashboardCards";
import { useAdminEstatisticas } from "../hooks/useAdminEstatisticas";
import { useAuth } from "../hooks/useAuth";
import { useOrigensVenda } from "../hooks/useOrigensVenda";
import { ehAdminGeral, formatarTipoUsuario } from "../utils/perfis";

const formatarMoeda = (valor) => new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
}).format(valor || 0);

function PainelAdminGeral({ usuario }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <main className="page-shell app-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">Administrador geral</span>
          <h1>Controle de assinaturas</h1>
          <p>Ola, {usuario?.nome || usuario?.email}. Gerencie os administradores clientes.</p>
        </div>

        <div className="header-actions">
          <Link className="primary-button button-link" to="/admin/usuarios">
            Administradores
          </Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Clientes administradores</h2>
            <p className="muted-text">Ative, pause ou crie acessos de administradores clientes.</p>
          </div>
          <Link className="secondary-button button-link" to="/admin/usuarios">
            Abrir controle
          </Link>
        </div>
      </section>
    </main>
  );
}

function PainelAdminCliente({ usuario }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { erro, loading, porEquipe, resumoEquipe, resumoGeral } = useAdminEstatisticas(usuario);
  const { origensAtivas, loadingOrigens, erroOrigens } = useOrigensVenda();
  const [abaAtiva, setAbaAtiva] = useState("geral");
  const [usuarioSelecionadoId, setUsuarioSelecionadoId] = useState("");
  const resultadosEquipe = porEquipe;
  const estatisticasEquipe = resumoEquipe;

  const usuarioSelecionado = useMemo(() => (
    resultadosEquipe.find((resultado) => resultado.uid === usuarioSelecionadoId) || resultadosEquipe[0]
  ), [resultadosEquipe, usuarioSelecionadoId]);

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  const renderTabelaPerfis = () => (
    <section className="panel usuarios-lista">
      <div className="section-heading">
        <div>
          <h2>Ranking da equipe</h2>
          <p className="muted-text">Lista ordenada por faturamento dos funcionarios.</p>
        </div>
        <span className="muted-text">Funcionarios: {resumoGeral.funcionarios}</span>
      </div>

      {resultadosEquipe.length === 0 ? (
        <p className="muted-text">Nenhum funcionario encontrado.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Perfil</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Clientes</th>
                <th>Faturamento</th>
                <th>Ticket medio</th>
                <th>Origem principal</th>
              </tr>
            </thead>
            <tbody>
              {resultadosEquipe.map((resultado) => (
                <tr key={resultado.uid}>
                  <td data-label="Perfil">
                    <strong>{resultado.nome}</strong>
                    <span className="table-subtext">{resultado.email}</span>
                  </td>
                  <td data-label="Tipo">{formatarTipoUsuario(resultado)}</td>
                  <td data-label="Status">{resultado.ativo ? "Ativo" : "Inativo"}</td>
                  <td data-label="Clientes">{resultado.totalClientes}</td>
                  <td data-label="Faturamento">{formatarMoeda(resultado.faturamentoTotal)}</td>
                  <td data-label="Ticket medio">{formatarMoeda(resultado.ticketMedio)}</td>
                  <td data-label="Origem principal">{resultado.origemPrincipal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  return (
    <main className="page-shell app-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">Administrador cliente</span>
          <h1>Painel Administrativo</h1>
          <p>Ola, {usuario?.nome || usuario?.email}. Acompanhe sua equipe e configure acessos.</p>
        </div>

        <div className="header-actions">
          <Link className="primary-button button-link" to="/admin/usuarios">
            Opcoes
          </Link>
          <button type="button" className="secondary-button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {erro && <p className="form-error" role="alert">{erro}</p>}
      {erroOrigens && <p className="form-error" role="alert">{erroOrigens}</p>}

      {loading || loadingOrigens ? (
        <div className="auth-status">Carregando estatisticas administrativas...</div>
      ) : (
        <>
          <nav className="app-tabs" aria-label="Areas do painel administrativo">
            <button
              type="button"
              className={abaAtiva === "geral" ? "app-tab-button active" : "app-tab-button"}
              onClick={() => setAbaAtiva("geral")}
            >
              Geral
            </button>
            <button
              type="button"
              className={abaAtiva === "perfis" ? "app-tab-button active" : "app-tab-button"}
              onClick={() => setAbaAtiva("perfis")}
            >
              Perfis
            </button>
            <button
              type="button"
              className={abaAtiva === "ranking" ? "app-tab-button active" : "app-tab-button"}
              onClick={() => setAbaAtiva("ranking")}
            >
              Ranking
            </button>
          </nav>

          <section className="admin-summary-grid compact-summary" aria-label="Resumo geral">
            <article className="panel stat-card">
              <span>Clientes da equipe</span>
              <strong>{estatisticasEquipe.totalClientes}</strong>
            </article>
            <article className="panel stat-card">
              <span>Faturamento da equipe</span>
              <strong>{formatarMoeda(estatisticasEquipe.faturamentoTotal)}</strong>
            </article>
            <article className="panel stat-card">
              <span>Ticket medio da equipe</span>
              <strong>{formatarMoeda(estatisticasEquipe.ticketMedio)}</strong>
            </article>
            <article className="panel stat-card">
              <span>Funcionarios ativos</span>
              <strong>{resumoGeral.funcionariosAtivos}/{resumoGeral.funcionarios}</strong>
            </article>
          </section>

          {abaAtiva === "geral" && (
            <section className="app-tab-panel">
              <DashboardCards
                estatisticas={estatisticasEquipe}
                categorias={origensAtivas}
                titulo="Resultado da equipe"
                descricao="Soma dos clientes e faturamento cadastrados pelos funcionarios."
              />
            </section>
          )}

          {abaAtiva === "perfis" && (
            <section className="app-tab-panel">
              <div className="profile-browser">
                <aside className="panel profile-list">
                  <div className="section-heading">
                    <div>
                      <h2>Perfis</h2>
                      <p className="muted-text">Escolha um funcionario para abrir os graficos.</p>
                    </div>
                  </div>

                  {resultadosEquipe.length === 0 ? (
                    <p className="muted-text">Nenhum funcionario encontrado.</p>
                  ) : (
                    <div className="profile-button-list">
                      {resultadosEquipe.map((resultado) => (
                        <button
                          key={resultado.uid}
                          type="button"
                          className={usuarioSelecionado?.uid === resultado.uid ? "profile-select-button active" : "profile-select-button"}
                          onClick={() => setUsuarioSelecionadoId(resultado.uid)}
                        >
                          <strong>{resultado.nome}</strong>
                          <span>{resultado.totalClientes} clientes</span>
                        </button>
                      ))}
                    </div>
                  )}
                </aside>

                {usuarioSelecionado && (
                  <DashboardCards
                    estatisticas={usuarioSelecionado}
                    categorias={origensAtivas}
                    titulo={usuarioSelecionado.nome}
                    descricao={`${formatarTipoUsuario(usuarioSelecionado)} - ${usuarioSelecionado.ativo ? "Ativo" : "Inativo"} - ${usuarioSelecionado.email}`}
                  />
                )}
              </div>
            </section>
          )}

          {abaAtiva === "ranking" && (
            <section className="app-tab-panel">
              {renderTabelaPerfis()}
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default function AdminDashboard() {
  const { usuario } = useAuth();

  if (ehAdminGeral(usuario)) {
    return <PainelAdminGeral usuario={usuario} />;
  }

  return <PainelAdminCliente usuario={usuario} />;
}
