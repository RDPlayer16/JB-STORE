import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useOrigensVenda } from "../hooks/useOrigensVenda";
import { cadastrarOrigemVenda, excluirOrigemVenda } from "../services/origemVendaService";
import { atualizarStatusUsuario, criarUsuario, listarUsuarios } from "../services/userService";
import {
  TIPO_ADMIN,
  TIPO_FUNCIONARIO,
  ehAdminGeral,
  formatarTipoUsuario,
} from "../utils/perfis";

function formatarData(timestamp) {
  const millis = timestamp?.toMillis?.();

  if (!millis) {
    return "Sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(millis));
}

function traduzirErro(error) {
  const mensagensErro = {
    "auth/email-already-in-use": "Este email ja esta cadastrado.",
    "auth/invalid-email": "Email invalido.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "permission-denied": "Sem permissao para gerenciar usuarios. Confira as regras do Firestore.",
  };

  return mensagensErro[error.code] || error.message || "Nao foi possivel salvar.";
}

function criarFormInicial() {
  return {
    nome: "",
    email: "",
    senha: "",
  };
}

export default function UsuariosAdmin() {
  const { usuario: usuarioLogado } = useAuth();
  const adminGeral = ehAdminGeral(usuarioLogado);
  const tipoPadrao = adminGeral ? TIPO_ADMIN : TIPO_FUNCIONARIO;
  const rotuloPerfil = adminGeral ? "administrador cliente" : "funcionario";
  const { origensAtivas, loadingOrigens, erroOrigens } = useOrigensVenda();
  const location = useLocation();
  const navigate = useNavigate();
  const abaUrl = new URLSearchParams(location.search).get("aba");
  const abaAtiva = adminGeral ? "perfis" : abaUrl === "origens" ? "origens" : "perfis";
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [criandoOrigem, setCriandoOrigem] = useState(false);
  const [excluindoOrigemId, setExcluindoOrigemId] = useState("");
  const [atualizandoUid, setAtualizandoUid] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [origemNome, setOrigemNome] = useState("");
  const [erroOrigem, setErroOrigem] = useState("");
  const [sucessoOrigem, setSucessoOrigem] = useState("");
  const [form, setForm] = useState(() => criarFormInicial());

  const tituloLista = adminGeral ? "Administradores clientes" : "Funcionarios cadastrados";
  const textoLista = adminGeral
    ? "Pausar uma assinatura tambem desativa os funcionarios vinculados a esse admin."
    : "Desativar bloqueia o acesso sem apagar o historico desse funcionario.";

  const carregarUsuarios = useCallback(async () => {
    if (!usuarioLogado?.uid) return;

    setLoading(true);

    try {
      const lista = await listarUsuarios(usuarioLogado);
      setUsuarios(lista);
      setErro("");
    } catch (error) {
      console.error("Erro ao listar usuarios:", error);
      setErro(traduzirErro(error));
    } finally {
      setLoading(false);
    }
  }, [usuarioLogado]);

  useEffect(() => {
    let componenteAtivo = true;

    async function carregar() {
      if (!usuarioLogado?.uid) return;

      setLoading(true);

      try {
        const lista = await listarUsuarios(usuarioLogado);

        if (!componenteAtivo) return;

        setUsuarios(lista);
        setErro("");
      } catch (error) {
        if (!componenteAtivo) return;

        console.error("Erro ao listar usuarios:", error);
        setErro(traduzirErro(error));
      } finally {
        if (componenteAtivo) {
          setLoading(false);
        }
      }
    }

    carregar();

    return () => {
      componenteAtivo = false;
    };
  }, [usuarioLogado]);

  const mudarAba = (aba) => {
    if (adminGeral) return;
    navigate(`/admin/usuarios?aba=${aba}`, { replace: true });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((formAtual) => ({
      ...formAtual,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro("");
    setSucesso("");
    setCriando(true);

    try {
      await criarUsuario({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        tipo: tipoPadrao,
        usuarioCriador: usuarioLogado,
      });

      setForm(criarFormInicial());
      setSucesso(`${formatarTipoUsuario(tipoPadrao)} criado com sucesso.`);
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao criar usuario:", error);
      setErro(traduzirErro(error));
    } finally {
      setCriando(false);
    }
  };

  const handleCadastrarOrigem = async (event) => {
    event.preventDefault();
    setErroOrigem("");
    setSucessoOrigem("");
    setCriandoOrigem(true);

    try {
      await cadastrarOrigemVenda(origemNome);
      setOrigemNome("");
      setSucessoOrigem("Origem de venda cadastrada com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar origem de venda:", error);
      setErroOrigem(traduzirErro(error));
    } finally {
      setCriandoOrigem(false);
    }
  };

  const handleExcluirOrigem = async (origem) => {
    const confirmar = window.confirm(`Deseja excluir a origem "${origem.nome}"? Clientes antigos continuam com esse historico.`);

    if (!confirmar) return;

    setErroOrigem("");
    setSucessoOrigem("");
    setExcluindoOrigemId(origem.id);

    try {
      await excluirOrigemVenda(origem.id);
      setSucessoOrigem("Origem de venda excluida com sucesso.");
    } catch (error) {
      console.error("Erro ao excluir origem de venda:", error);
      setErroOrigem(traduzirErro(error));
    } finally {
      setExcluindoOrigemId("");
    }
  };

  const handleAlternarStatus = async (usuarioAlvo) => {
    if (usuarioAlvo.uid === usuarioLogado?.uid) {
      setErro("Voce nao pode desativar o proprio usuario logado.");
      return;
    }

    const proximoStatus = usuarioAlvo.ativo !== true;
    const acao = proximoStatus ? "reativar" : "desativar";
    const complemento = usuarioAlvo.tipo === TIPO_ADMIN
      ? " Os funcionarios vinculados acompanham esse status."
      : "";
    const confirmar = window.confirm(`Deseja ${acao} ${usuarioAlvo.nome || usuarioAlvo.email}?${complemento}`);

    if (!confirmar) return;

    setErro("");
    setSucesso("");
    setAtualizandoUid(usuarioAlvo.uid);

    try {
      const resultado = await atualizarStatusUsuario(usuarioAlvo.uid, proximoStatus, usuarioLogado);
      const totalAfetados = resultado?.totalAfetados || 1;
      const complementoSucesso = totalAfetados > 1
        ? ` ${totalAfetados} perfis foram atualizados.`
        : "";

      setSucesso(`Usuario ${proximoStatus ? "reativado" : "desativado"} com sucesso.${complementoSucesso}`);
      await carregarUsuarios();
    } catch (error) {
      console.error("Erro ao atualizar status do usuario:", error);
      setErro(traduzirErro(error));
    } finally {
      setAtualizandoUid("");
    }
  };

  return (
    <main className="page-shell app-shell">
      <header className="page-header">
        <div>
          <span className="eyebrow">{adminGeral ? "Administrador geral" : "Administrador cliente"}</span>
          <h1>{adminGeral ? "Assinaturas" : "Opcoes"}</h1>
          <p>
            {adminGeral
              ? "Controle os administradores clientes ativos no sistema."
              : "Configure perfis de acesso e as origens usadas no cadastro de clientes."}
          </p>
        </div>

        <Link className="secondary-button button-link" to="/admin">
          Voltar ao painel
        </Link>
      </header>

      {!adminGeral && (
        <nav className="app-tabs" aria-label="Opcoes administrativas">
          <button
            type="button"
            className={abaAtiva === "perfis" ? "app-tab-button active" : "app-tab-button"}
            onClick={() => mudarAba("perfis")}
          >
            Funcionarios
          </button>
          <button
            type="button"
            className={abaAtiva === "origens" ? "app-tab-button active" : "app-tab-button"}
            onClick={() => mudarAba("origens")}
          >
            Origens de venda
          </button>
        </nav>
      )}

      {abaAtiva === "perfis" && (
        <section className="usuarios-grid app-tab-panel">
          <form className="panel usuarios-form" onSubmit={handleSubmit}>
            <h2>{adminGeral ? "Novo cliente administrador" : "Novo funcionario"}</h2>

            <label className="form-field">
              <span>Categoria do perfil</span>
              <input type="text" value={formatarTipoUsuario(tipoPadrao)} readOnly />
            </label>

            <label className="form-field">
              <span>Nome</span>
              <input
                type="text"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder={`Nome do ${rotuloPerfil}`}
                required
              />
            </label>

            <label className="form-field">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="email@empresa.com"
                autoComplete="off"
                required
              />
            </label>

            <label className="form-field">
              <span>Senha temporaria</span>
              <input
                type="password"
                name="senha"
                value={form.senha}
                onChange={handleChange}
                placeholder="Minimo 6 caracteres"
                minLength={6}
                autoComplete="new-password"
                required
              />
            </label>

            {erro && <p className="form-error" role="alert">{erro}</p>}
            {sucesso && <p className="form-success" role="status">{sucesso}</p>}

            <button type="submit" className="primary-button" disabled={criando}>
              {criando ? "Criando..." : `Criar ${rotuloPerfil}`}
            </button>
          </form>

          <section className="panel usuarios-lista">
            <div className="section-heading">
              <div>
                <h2>{tituloLista}</h2>
                <p className="muted-text">{textoLista}</p>
              </div>
            </div>

            {loading ? (
              <p className="muted-text">Carregando usuarios...</p>
            ) : usuarios.length === 0 ? (
              <p className="muted-text">Nenhum usuario cadastrado.</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Criado em</th>
                      <th>Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((usuario) => {
                      const ehUsuarioAtual = usuario.uid === usuarioLogado?.uid;
                      const atualizando = atualizandoUid === usuario.uid;
                      const textoBotao = usuario.ativo
                        ? adminGeral ? "Pausar" : "Desativar"
                        : adminGeral ? "Reativar" : "Reativar";

                      return (
                        <tr key={usuario.uid}>
                          <td data-label="Nome">{usuario.nome}</td>
                          <td data-label="Email">{usuario.email}</td>
                          <td data-label="Tipo">{formatarTipoUsuario(usuario)}</td>
                          <td data-label="Status">{usuario.ativo ? "Ativo" : "Inativo"}</td>
                          <td data-label="Criado em">{formatarData(usuario.criadoEm)}</td>
                          <td data-label="Acao">
                            {ehUsuarioAtual ? (
                              <span className="muted-text">Usuario atual</span>
                            ) : (
                              <button
                                type="button"
                                className={usuario.ativo ? "danger-button" : "secondary-button"}
                                onClick={() => handleAlternarStatus(usuario)}
                                disabled={atualizando}
                              >
                                {atualizando ? "Salvando..." : textoBotao}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      )}

      {!adminGeral && abaAtiva === "origens" && (
        <section className="origens-layout app-tab-panel">
          <form className="panel usuarios-form" onSubmit={handleCadastrarOrigem}>
            <h2>Nova origem</h2>
            <p className="muted-text">As opcoes do cadastro de clientes vem desta lista.</p>

            <label className="form-field">
              <span>Nome da origem</span>
              <input
                type="text"
                value={origemNome}
                onChange={(event) => setOrigemNome(event.target.value)}
                placeholder="Ex: Instagram, WhatsApp, Indicacao"
                required
              />
            </label>

            {erroOrigens && <p className="form-error" role="alert">{erroOrigens}</p>}
            {erroOrigem && <p className="form-error" role="alert">{erroOrigem}</p>}
            {sucessoOrigem && <p className="form-success" role="status">{sucessoOrigem}</p>}

            <button type="submit" className="primary-button" disabled={criandoOrigem}>
              {criandoOrigem ? "Salvando..." : "Cadastrar origem"}
            </button>
          </form>

          <section className="panel categorias-lista">
            <div className="section-heading">
              <div>
                <h2>Origens cadastradas</h2>
                <p className="muted-text">Excluir remove a opcao dos proximos cadastros.</p>
              </div>
            </div>

            {loadingOrigens ? (
              <p className="muted-text">Carregando origens...</p>
            ) : origensAtivas.length === 0 ? (
              <p className="muted-text">Nenhuma origem cadastrada ainda.</p>
            ) : (
              <div className="origin-list">
                {origensAtivas.map((origem) => {
                  const excluindo = excluindoOrigemId === origem.id;

                  return (
                    <div className="origin-item" key={origem.id}>
                      <strong>{origem.nome}</strong>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleExcluirOrigem(origem)}
                        disabled={excluindo}
                      >
                        {excluindo ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
