import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Avatar,
} from '@mui/material'
import {
  TrendingUp,
  People,
  ShoppingCart,
  AttachMoney,
  Star,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { BackupStatus } from '@/components'

interface VendedorStats {
  id: string
  name: string
  total_clientes: number
  total_pedidos: number
  valor_vendas_total: number
  maior_venda_unica: number
  comissao: number
  produtos_mais_vendidos: Array<{
    product_name: string
    total_quantity: number
    total_value: number
  }>
}

export default function AdminVendedores() {
  const { role, isLoading } = useAuth()

  const { data: vendedores, isLoading: isLoadingVendedores } = useQuery({
    queryKey: ['admin-vendedores-stats'],
    queryFn: async () => {
      // Buscar todos os vendedores
      const { data: vendedoresData, error: vendedoresError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'vendedor')
        .order('name')

      if (vendedoresError) throw vendedoresError

      // Para cada vendedor, buscar suas estatísticas
      const vendedoresComStats: VendedorStats[] = await Promise.all(
        vendedoresData.map(async (vendedor) => {
          // 1. Número de clientes
          const { count: totalClientes } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', vendedor.id)

          // 2. Número de pedidos e valores
          const { data: pedidosData } = await supabase
            .from('orders')
            .select('final_amount, items:order_items(product:products(name), quantity, total_price)')
            .eq('seller_id', vendedor.id)

          const totalPedidos = pedidosData?.length || 0
          const valorVendasTotal = pedidosData?.reduce((sum, pedido) => sum + (pedido.final_amount || 0), 0) || 0
          const maiorVendaUnica = Math.max(...(pedidosData?.map(p => p.final_amount || 0) || [0]))

          // 3. Produtos mais vendidos
          const produtosMap = new Map<string, { quantity: number; value: number; name: string }>()
          
          pedidosData?.forEach(pedido => {
            pedido.items?.forEach((item: any) => {
              const productName = item.product?.name || 'Produto Desconhecido'
              const existing = produtosMap.get(productName) || { quantity: 0, value: 0, name: productName }
              produtosMap.set(productName, {
                quantity: existing.quantity + (item.quantity || 0),
                value: existing.value + (item.total_price || 0),
                name: productName
              })
            })
          })

          const produtosMaisVendidos = Array.from(produtosMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)
            .map(produto => ({
              product_name: produto.name,
              total_quantity: produto.quantity,
              total_value: produto.value
            }))

          return {
            id: vendedor.id,
            name: vendedor.name || 'Nome não informado',
            total_clientes: totalClientes || 0,
            total_pedidos: totalPedidos,
            valor_vendas_total: valorVendasTotal,
            maior_venda_unica: maiorVendaUnica,
            comissao: valorVendasTotal * 0.05, // 5% de comissão
            produtos_mais_vendidos: produtosMaisVendidos
          }
        })
      )

      return vendedoresComStats
    },
  })

  // Mostrar loading enquanto carrega
  if (isLoading || isLoadingVendedores) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Verificar se é admin
  if (role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" color="error">
          Acesso Negado
        </Typography>
        <Typography>
          Esta página é restrita para administradores.
        </Typography>
      </Box>
    )
  }


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
          Relatório de Vendedores
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Análise completa de performance e métricas dos vendedores
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Resumo Geral */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Resumo Geral
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Visão consolidada de todos os vendedores
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2, width: 48, height: 48 }}>
                      <People />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total de Vendedores
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {vendedores?.length || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Avatar sx={{ bgcolor: 'secondary.main', mx: 'auto', mb: 2, width: 48, height: 48 }}>
                      <People />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total de Clientes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                      {vendedores?.reduce((sum, v) => sum + v.total_clientes, 0) || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 2, width: 48, height: 48 }}>
                      <ShoppingCart />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Total de Pedidos
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {vendedores?.reduce((sum, v) => sum + v.total_pedidos, 0) || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Avatar sx={{ bgcolor: 'success.main', mx: 'auto', mb: 2, width: 48, height: 48 }}>
                      <AttachMoney />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Faturamento Total
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      R$ {vendedores?.reduce((sum, v) => sum + v.valor_vendas_total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={2.4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 2, width: 48, height: 48 }}>
                      <AttachMoney />
                    </Avatar>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Comissões Totais (5%)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      R$ {vendedores?.reduce((sum, v) => sum + v.comissao, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Status do Backup */}
        <Grid item xs={12}>
          <BackupStatus />
        </Grid>

        {/* Tabela de Vendedores */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: 'info.main', mr: 2, width: 40, height: 40 }}>
                    <Star />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Performance dos Vendedores
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Análise detalhada de cada vendedor
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Vendedor</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Clientes</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Pedidos</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Faturamento</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Comissão (5%)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>Maior Venda</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Produtos Mais Vendidos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vendedores?.map((vendedor, index) => (
                      <TableRow 
                        key={vendedor.id}
                        sx={{ 
                          '&:hover': { 
                            backgroundColor: 'grey.50' 
                          },
                          '&:nth-of-type(even)': {
                            backgroundColor: 'grey.25',
                          }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: index % 2 === 0 ? 'primary.main' : 'secondary.main',
                                mr: 2,
                                width: 32,
                                height: 32,
                                fontSize: '0.875rem'
                              }}
                            >
                              {vendedor.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                              {vendedor.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={vendedor.total_clientes} 
                            color="primary" 
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={vendedor.total_pedidos} 
                            color="secondary" 
                            size="small"
                            sx={{ fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                            R$ {vendedor.valor_vendas_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>
                            R$ {vendedor.comissao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.main' }}>
                            R$ {vendedor.maior_venda_unica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {vendedor.produtos_mais_vendidos.slice(0, 3).map((produto, prodIndex) => (
                              <Chip
                                key={prodIndex}
                                label={`${produto.product_name} (${produto.total_quantity})`}
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.75rem',
                                  height: 24,
                                  '& .MuiChip-label': {
                                    px: 1
                                  }
                                }}
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
