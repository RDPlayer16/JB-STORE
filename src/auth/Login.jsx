import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const mensagensErro = {
  "auth/invalid-credential": "Email ou senha invalidos.",
  "auth/user-disabled": "Este usuario esta desativado.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
};

function traduzirErro(error) {
  return mensagensErro[error.code] || error.message || "Nao foi possivel fazer login.";
}

function destinoPorTipo(tipo) {
  return tipo === "admin" ? "/admin" : "/funcionario";
}

export default function Login() {
  const navigate = useNavigate();
  const { erroPerfil, loading, login, usuario } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (usuario) {
      navigate(destinoPorTipo(usuario.tipo), { replace: true });
    }
  }, [navigate, usuario]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      const perfil = await login(email.trim(), senha);
      navigate(destinoPorTipo(perfil.tipo), { replace: true });
    } catch (error) {
      setErro(traduzirErro(error));
    } finally {
      setEnviando(false);
    }
  };

  const bloqueado = enviando || loading;

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">Area de Login</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="form-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="Digite o seu email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label className="form-field">
            <span>Senha</span>
            <input
              type="password"
              name="senha"
              placeholder="Digite a sua senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {(erro || erroPerfil) && (
            <p className="form-error" role="alert">
              {erro || erroPerfil}
            </p>
          )}

          <button type="submit" className="primary-button" disabled={bloqueado}>
            {bloqueado ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
