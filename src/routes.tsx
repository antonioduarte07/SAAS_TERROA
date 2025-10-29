import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Commissions from './pages/Commissions'
import Backups from './pages/Backups'
import BackupSchedule from './pages/Backups/Schedule'
import BackupStorage from './pages/Backups/Storage'
import Login from './pages/Login'
import AdminVendedores from './pages/Admin/Vendedores'

// Importar novas páginas (serão criadas depois)
import ClientOrders from './pages/ClientOrders';

// Componente para proteger rotas com base no papel
const ProtectedRoute = ({ element, allowedRoles }: { element: React.ReactNode; allowedRoles: string[] }) => {
  const { user, isLoading, role } = useAuth();

  // Enquanto carrega, pode retornar um spinner ou null
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Se não houver usuário logado, redirecionar para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se houver usuário mas ele não tiver um papel ou o papel não for permitido
  if (!role || !allowedRoles.includes(role)) {
    // Redirecionar para uma página de acesso negado ou dashboard, dependendo da lógica desejada
    // Por enquanto, redireciona para o dashboard, mas o ideal seria uma tela de erro 403
    return <Navigate to="/" replace />;
  }

  // Se o usuário estiver logado e tiver um papel permitido, renderizar o elemento da rota
  return <>{element}</>;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <AuthProvider>
        <Layout />
      </AuthProvider>
    ),
    children: [
      {
        path: '/',
        element: <ProtectedRoute element={<Dashboard />} allowedRoles={['admin', 'vendedor']} />, // Protegida para admin e vendedor
      },
      {
        path: '/clients',
        element: <ProtectedRoute element={<Clients />} allowedRoles={['admin', 'vendedor']} />, // Protegida para admin e vendedor
      },
      {
        path: '/products',
        element: <ProtectedRoute element={<Products />} allowedRoles={['admin', 'vendedor']} />, // Protegida para admin e vendedor
      },
      {
        path: '/orders',
        element: <ProtectedRoute element={<Orders />} allowedRoles={['admin', 'vendedor']} />, // Protegida para admin e vendedor
      },
      // Nova rota para clientes verem seus pedidos
      {
        path: '/client/orders',
        element: <ProtectedRoute element={<ClientOrders />} allowedRoles={['cliente']} />, // Protegida para clientes
      },
             // Rotas específicas do Admin
             {
               path: '/admin/vendedores',
               element: <ProtectedRoute element={<AdminVendedores />} allowedRoles={['admin']} />,
             },
      // Rotas de Comissões e Backups (ajustar permissões)
      {
        path: '/commissions',
        element: <ProtectedRoute element={<Commissions />} allowedRoles={['admin']} />, // Exemplo: apenas admin
      },
      {
        path: '/backups',
        element: <ProtectedRoute element={<Backups />} allowedRoles={['admin']} />, // Exemplo: apenas admin
      },
      {
        path: '/backups/schedule',
        element: <ProtectedRoute element={<BackupSchedule />} allowedRoles={['admin']} />, // Exemplo: apenas admin
      },
      {
        path: '/backups/storage',
        element: <ProtectedRoute element={<BackupStorage />} allowedRoles={['admin']} />, // Exemplo: apenas admin
      },
    ],
  },
]) 