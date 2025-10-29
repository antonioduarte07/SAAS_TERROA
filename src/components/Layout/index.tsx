import { useState, useMemo } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Button,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Logout as LogoutIcon,
  PeopleAlt as PeopleAltIcon,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'

const drawerWidth = 240

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { signOut, user, role } = useAuth()
  const navigate = useNavigate()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  const menuItems = useMemo(() => {
    const baseItems = [
      { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['admin', 'vendedor'] },
      { text: 'Clientes', icon: <PeopleIcon />, path: '/clients', roles: ['admin', 'vendedor'] },
      { text: 'Produtos', icon: <InventoryIcon />, path: '/products', roles: ['admin', 'vendedor'] },
      { text: 'Pedidos', icon: <ShoppingCartIcon />, path: '/orders', roles: ['admin', 'vendedor'] },
      { text: 'Meus Pedidos', icon: <ShoppingCartIcon />, path: '/client/orders', roles: ['cliente'] },
    ];

    if (role === 'admin') {
      baseItems.push(
        { text: 'Vendedores', icon: <PeopleAltIcon />, path: '/admin/vendedores', roles: ['admin'] },
      );
    }

    return baseItems.filter(item => item.roles.includes(role || ''));
  }, [role]);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Terroa Vendas
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {user && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Sair" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </div>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Terroa Vendas
          </Typography>
          {user && (
            <Typography variant="body1" sx={{ mr: 2 }}>
              Olá, {user.user_metadata.full_name || user.email}
            </Typography>
          )}
          {user && (
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Sair
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  )
} 