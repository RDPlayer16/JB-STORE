import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./auth/Login";
import AdminRoute from "./guards/AdminRoute";
import PrivateRoute from "./guards/PrivateRoute";
import AdminDashboard from "./Pages/AdminDashboard";
import FuncionariosDashboard from "./Pages/FuncionariosDashboard";
import UsuariosAdmin from "./Pages/UsuariosAdmin";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/funcionario"
          element={
            <PrivateRoute>
              <FuncionariosDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/usuarios"
          element={
            <AdminRoute>
              <UsuariosAdmin />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
