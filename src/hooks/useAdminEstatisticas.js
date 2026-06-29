import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import { ehAdminGeral } from "../utils/perfis";

const formatarOrigem = (origens) => {
  const entradas = Object.entries(origens);

  if (entradas.length === 0) {
    return "Sem dados";
  }

  const [origem, total] = entradas.sort((origemA, origemB) => origemB[1] - origemA[1])[0];
  return `${origem} (${total})`;
};

function criarResumoUsuario(usuario) {
  return {
    uid: usuario.uid,
    nome: usuario.nome || "Sem nome",
    email: usuario.email || "Sem email",
    tipo: usuario.tipo || "funcionario",
    ativo: usuario.ativo === true,
    totalClientes: 0,
    faturamentoTotal: 0,
    ticketMedio: 0,
    origens: {},
    faturamentoPorOrigem: {},
    origemPrincipal: "Sem dados",
  };
}

function somarResultados(resultados) {
  return resultados.reduce((resumo, resultado) => {
    resumo.totalClientes += resultado.totalClientes;
    resumo.faturamentoTotal += resultado.faturamentoTotal;

    Object.entries(resultado.origens).forEach(([origem, total]) => {
      resumo.origens[origem] = (resumo.origens[origem] || 0) + total;
    });

    Object.entries(resultado.faturamentoPorOrigem).forEach(([origem, total]) => {
      resumo.faturamentoPorOrigem[origem] = (resumo.faturamentoPorOrigem[origem] || 0) + total;
    });

    return resumo;
  }, {
    totalClientes: 0,
    faturamentoTotal: 0,
    origens: {},
    faturamentoPorOrigem: {},
  });
}

export function useAdminEstatisticas(usuarioLogado) {
  const usuarioId = usuarioLogado?.uid;
  const adminGeral = ehAdminGeral(usuarioLogado);
  const [usuarios, setUsuarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [loadingClientes, setLoadingClientes] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!usuarioId || adminGeral) {
      return undefined;
    }

    const consultaUsuarios = query(
      collection(db, "usuarios"),
      where("adminDonoId", "==", usuarioId),
    );

    const unsubscribe = onSnapshot(consultaUsuarios, (snapshot) => {
      const lista = snapshot.docs.map((documento) => ({
        uid: documento.id,
        ...documento.data(),
      }));

      setUsuarios(lista);
      setLoadingUsuarios(false);
    }, (error) => {
      console.error("Erro ao carregar usuarios para estatisticas:", error);
      setErro("Nao foi possivel carregar os usuarios.");
      setLoadingUsuarios(false);
    });

    return () => unsubscribe();
  }, [adminGeral, usuarioId]);

  useEffect(() => {
    if (!usuarioId || adminGeral) {
      return undefined;
    }

    const consultaClientes = query(
      collection(db, "clientes"),
      where("adminDonoId", "==", usuarioId),
    );

    const unsubscribe = onSnapshot(consultaClientes, (snapshot) => {
      const lista = snapshot.docs.map((documento) => ({
        id: documento.id,
        ...documento.data(),
      }));

      setClientes(lista);
      setLoadingClientes(false);
    }, (error) => {
      console.error("Erro ao carregar clientes para estatisticas:", error);
      setErro("Nao foi possivel carregar os clientes.");
      setLoadingClientes(false);
    });

    return () => unsubscribe();
  }, [adminGeral, usuarioId]);

  const estatisticas = useMemo(() => {
    const mapaUsuarios = new Map();

    usuarios.forEach((usuario) => {
      mapaUsuarios.set(usuario.uid, criarResumoUsuario(usuario));
    });

    clientes.forEach((cliente) => {
      const usuarioId = cliente.usuarioId || "sem-usuario";

      if (!mapaUsuarios.has(usuarioId)) {
        mapaUsuarios.set(usuarioId, criarResumoUsuario({
          uid: usuarioId,
          nome: "Sem usuario vinculado",
          email: "Cliente legado",
          tipo: "legado",
          ativo: false,
        }));
      }

      const resumoUsuario = mapaUsuarios.get(usuarioId);
      const valorVenda = parseFloat(cliente.valorVenda) || 0;
      const origem = cliente.origem || "Nao informado";

      resumoUsuario.totalClientes += 1;
      resumoUsuario.faturamentoTotal += valorVenda;
      resumoUsuario.origens[origem] = (resumoUsuario.origens[origem] || 0) + 1;
      resumoUsuario.faturamentoPorOrigem[origem] = (
        resumoUsuario.faturamentoPorOrigem[origem] || 0
      ) + valorVenda;
    });

    const porUsuario = Array.from(mapaUsuarios.values())
      .map((usuario) => ({
        ...usuario,
        ticketMedio: usuario.totalClientes > 0
          ? usuario.faturamentoTotal / usuario.totalClientes
          : 0,
        origemPrincipal: formatarOrigem(usuario.origens),
      }))
      .sort((usuarioA, usuarioB) => {
        if (usuarioB.faturamentoTotal !== usuarioA.faturamentoTotal) {
          return usuarioB.faturamentoTotal - usuarioA.faturamentoTotal;
        }

        return usuarioB.totalClientes - usuarioA.totalClientes;
      });

    const porEquipe = porUsuario.filter((usuario) => usuario.tipo === "funcionario");
    const resumoEquipeBase = somarResultados(porEquipe);

    const totalClientes = clientes.length;
    const resumoOrigens = clientes.reduce((acumulador, cliente) => {
      const origem = cliente.origem || "Nao informado";
      const valorVenda = parseFloat(cliente.valorVenda) || 0;

      acumulador.faturamentoTotal += valorVenda;
      acumulador.origens[origem] = (acumulador.origens[origem] || 0) + 1;
      acumulador.faturamentoPorOrigem[origem] = (
        acumulador.faturamentoPorOrigem[origem] || 0
      ) + valorVenda;

      return acumulador;
    }, {
      faturamentoTotal: 0,
      origens: {},
      faturamentoPorOrigem: {},
    });

    return {
      resumoGeral: {
        totalClientes,
        faturamentoTotal: resumoOrigens.faturamentoTotal,
        ticketMedio: totalClientes > 0 ? resumoOrigens.faturamentoTotal / totalClientes : 0,
        origens: resumoOrigens.origens,
        faturamentoPorOrigem: resumoOrigens.faturamentoPorOrigem,
        totalUsuarios: usuarios.length,
        usuariosAtivos: usuarios.filter((usuario) => usuario.ativo === true).length,
        administradores: usuarios.filter((usuario) => usuario.tipo === "admin").length,
        funcionarios: usuarios.filter((usuario) => usuario.tipo === "funcionario").length,
        funcionariosAtivos: usuarios.filter((usuario) => (
          usuario.tipo === "funcionario" && usuario.ativo === true
        )).length,
      },
      resumoEquipe: {
        ...resumoEquipeBase,
        ticketMedio: resumoEquipeBase.totalClientes > 0
          ? resumoEquipeBase.faturamentoTotal / resumoEquipeBase.totalClientes
          : 0,
      },
      porUsuario,
      porEquipe,
    };
  }, [clientes, usuarios]);

  return {
    ...estatisticas,
    erro,
    loading: loadingUsuarios || loadingClientes,
  };
}
