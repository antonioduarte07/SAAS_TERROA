import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import PrivateRoute from '@/components/PrivateRoute'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import Clients from '@/pages/Clients'
import Products from '@/pages/Products'
import Orders from '@/pages/Orders'

export const router = createBrowserRouter([
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
        element: (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        ),
      },
      {
        path: '/clients',
        element: (
          <PrivateRoute>
            <Clients />
          </PrivateRoute>
        ),
      },
      {
        path: '/products',
        element: (
          <PrivateRoute>
            <Products />
          </PrivateRoute>
        ),
      },
      {
        path: '/orders',
        element: (
          <PrivateRoute>
            <Orders />
          </PrivateRoute>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]) 