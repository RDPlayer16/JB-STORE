export const TIPO_ADMIN = "admin";
export const TIPO_FUNCIONARIO = "funcionario";

export function ehAdmin(usuario) {
  return usuario?.tipo === TIPO_ADMIN;
}

export function ehFuncionario(usuario) {
  return usuario?.tipo === TIPO_FUNCIONARIO;
}

export function ehAdminGeral(usuario) {
  return ehAdmin(usuario) && (
    usuario.adminGeral === true || !usuario.criadoPorUid
  );
}

export function ehAdminCliente(usuario) {
  return ehAdmin(usuario) && !ehAdminGeral(usuario);
}

export function formatarTipoUsuario(usuarioOuTipo) {
  const tipo = typeof usuarioOuTipo === "string" ? usuarioOuTipo : usuarioOuTipo?.tipo;

  if (tipo === TIPO_ADMIN) {
    return ehAdminGeral(usuarioOuTipo) ? "Administrador geral" : "Administrador cliente";
  }

  if (tipo === TIPO_FUNCIONARIO) {
    return "Funcionario";
  }

  return tipo || "Sem tipo";
}
