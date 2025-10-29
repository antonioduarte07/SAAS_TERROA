import { useState } from 'react'
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery,
  Typography,
  Avatar,
  Divider,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  AttachMoney as AttachMoneyIcon,
  Settings as SettingsIcon,
  Backup as BackupIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  Business as BusinessIcon,
} from '@mui/icons-material'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const menuItems = [
  {
    title: 'Dashboard',
    path: '/',
    icon: <DashboardIcon />,
  },
  {
    title: 'Clientes',
    path: '/clients',
    icon: <PeopleIcon />,
  },
  {
    title: 'Produtos',
    path: '/products',
    icon: <InventoryIcon />,
  },
  {
    title: 'Pedidos',
    path: '/orders',
    icon: <ShoppingCartIcon />,
  },
  {
    title: 'Vendedores',
    path: '/admin/vendedores',
    icon: <BusinessIcon />,
    adminOnly: true,
  },
  {
    title: 'Comissões',
    path: '/commissions',
    icon: <AttachMoneyIcon />,
  },
  {
    title: 'Backups',
    path: '/backups',
    icon: <BackupIcon />,
    children: [
      {
        title: 'Lista',
        path: '/backups',
      },
      {
        title: 'Agendamento',
        path: '/backups/schedule',
      },
      {
        title: 'Armazenamento',
        path: '/backups/storage',
      },
    ],
  },
  {
    title: 'Configurações',
    path: '/settings',
    icon: <SettingsIcon />,
  },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, role } = useAuth()

  const handleMenuClick = (path: string) => {
    navigate(path)
    if (isMobile) {
      onClose()
    }
  }

  const handleSubMenuClick = (path: string) => {
    navigate(path)
    if (isMobile) {
      onClose()
    }
  }

  const handleExpandClick = (title: string) => {
    setOpenMenu(openMenu === title ? null : title)
  }

  // Filtrar itens do menu baseado no role
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && role !== 'admin') {
      return false
    }
    return true
  })

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={open}
      onClose={onClose}
      sx={{
        width: 280,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
        },
      }}
    >
      {/* Header da Sidebar */}
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid #e2e8f0',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: 'rgba(255,255,255,0.2)', 
            mr: 2,
            width: 40,
            height: 40
          }}>
            <BusinessIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              SAAS TERROA
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Sistema de Vendas
            </Typography>
          </Box>
        </Box>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ 
              bgcolor: 'rgba(255,255,255,0.2)', 
              mr: 2,
              width: 32,
              height: 32,
              fontSize: '0.875rem'
            }}>
              {user.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user.email}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {role === 'admin' ? 'Administrador' : role === 'vendedor' ? 'Vendedor' : 'Cliente'}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Menu Items */}
      <List sx={{ px: 2, py: 1 }}>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.title} disablePadding sx={{ mb: 0.5 }}>
            {item.children ? (
              <>
                <ListItemButton
                  onClick={() => handleExpandClick(item.title)}
                  selected={location.pathname.startsWith(item.path)}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                    '&:hover': {
                      backgroundColor: 'grey.100',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                  <ListItemText 
                    primary={item.title} 
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                  {openMenu === item.title ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openMenu === item.title} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.children.map((child) => (
                      <ListItemButton
                        key={child.title}
                        sx={{ 
                          pl: 4,
                          borderRadius: 2,
                          mb: 0.5,
                          '&.Mui-selected': {
                            backgroundColor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                              backgroundColor: 'primary.dark',
                            },
                          },
                          '&:hover': {
                            backgroundColor: 'grey.100',
                          },
                        }}
                        onClick={() => handleSubMenuClick(child.path)}
                        selected={location.pathname === child.path}
                      >
                        <ListItemText 
                          primary={child.title}
                          primaryTypographyProps={{ fontSize: '0.875rem' }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItemButton
                onClick={() => handleMenuClick(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'grey.100',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.title}
                  primaryTypographyProps={{ fontWeight: 500 }}
                />
              </ListItemButton>
            )}
          </ListItem>
        ))}
      </List>
    </Drawer>
  )
} 