// import { useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  useTheme,
  Avatar,
  Chip,
} from '@mui/material'
import {
  TrendingUp,
  ShoppingCart,
  AttachMoney,
  Assessment,
} from '@mui/icons-material'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
// import { ptBR } from 'date-fns/locale'
import { OrderItem, Product } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { BackupStatus } from '@/components'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

interface SalesData {
  date: string
  value: number
}

interface CategoryData {
  name: string
  value: number
}

interface SellerData {
  name: string
  value: number
}

export default function Dashboard() {
  const theme = useTheme()
  const { user, role } = useAuth()
  const dateRange = {
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  }

  // Consulta para métricas gerais
  const { data: metrics } = useQuery({
    queryKey: ['dashboard-metrics', dateRange, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      // Se for vendedor, filtrar apenas seus pedidos
      if (role === 'vendedor' && user?.id) {
        query = query.eq('seller_id', user.id)
      }

      const { data: orders, error: ordersError } = await query

      if (ordersError) throw ordersError

      const totalOrders = orders.length
      const totalRevenue = orders.reduce((sum, order) => sum + order.final_amount, 0)
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      return {
        totalOrders,
        totalRevenue,
        averageOrderValue,
        commission: totalRevenue * 0.05, // 5% de comissão
      }
    },
  })

  // Consulta para vendas por dia
  const { data: dailySales } = useQuery<SalesData[]>({
    queryKey: ['daily-sales', dateRange, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at')

      // Se for vendedor, filtrar apenas seus pedidos
      if (role === 'vendedor' && user?.id) {
        query = query.eq('seller_id', user.id)
      }

      const { data: orders, error: ordersError } = await query

      if (ordersError) throw ordersError

      const salesByDay = orders.reduce((acc, order) => {
        const date = format(new Date(order.created_at), 'dd/MM')
        if (!acc[date]) {
          acc[date] = 0
        }
        acc[date] += order.final_amount
        return acc
      }, {} as Record<string, number>)

      return Object.entries(salesByDay).map(([date, value]) => ({
        date,
        value,
      }))
    },
  })

  // Consulta para vendas por categoria
  const { data: categorySales } = useQuery<CategoryData[]>({
    queryKey: ['category-sales', dateRange, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(segmento)
          )
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      // Se for vendedor, filtrar apenas seus pedidos
      if (role === 'vendedor' && user?.id) {
        query = query.eq('seller_id', user.id)
      }

      const { data: orders, error: ordersError } = await query

      if (ordersError) throw ordersError

      const salesByCategory = orders.reduce((acc, order) => {
        order.items?.forEach((item: OrderItem & { product?: Product }) => {
          const category = item.product?.segmento || 'Outros'
          if (!acc[category]) {
            acc[category] = 0
          }
          acc[category] += item.total_price
        })
        return acc
      }, {} as Record<string, number>)

      return Object.entries(salesByCategory).map(([category, value]) => ({
        name: category,
        value,
      }))
    },
  })

  // Consulta para top vendedores
  const { data: topSellers } = useQuery<SellerData[]>({
    queryKey: ['top-sellers', dateRange, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          seller:profiles(name)
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      // Se for vendedor, filtrar apenas seus pedidos
      if (role === 'vendedor' && user?.id) {
        query = query.eq('seller_id', user.id)
      }

      const { data: orders, error: ordersError } = await query

      if (ordersError) throw ordersError

      const salesBySeller = orders.reduce((acc, order) => {
        const sellerName = order.seller?.name || 'Não identificado'
        if (!acc[sellerName]) {
          acc[sellerName] = 0
        }
        acc[sellerName] += order.final_amount
        return acc
      }, {} as Record<string, number>)

      return Object.entries(salesBySeller)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
    },
  })

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: 'text.primary' }}>
          Dashboard {role === 'vendedor' ? 'Individual' : 'Geral'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visão geral das suas métricas de vendas e performance
        </Typography>
      </Box>

      {/* Métricas Principais */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              transform: 'translate(30px, -30px)',
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <ShoppingCart />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total de Pedidos
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {metrics?.totalOrders || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              transform: 'translate(30px, -30px)',
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <AttachMoney />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Receita Total
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    R$ {metrics?.totalRevenue.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              transform: 'translate(30px, -30px)',
            }
          }}>
            <CardContent sx={{ position: 'relative', zIndex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Ticket Médio
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    R$ {metrics?.averageOrderValue.toFixed(2) || '0.00'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Card de Comissão - apenas para vendedores */}
        {role === 'vendedor' && (
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ 
              background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
              color: '#8b4513',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                right: 0,
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                transform: 'translate(30px, -30px)',
              }
            }}>
              <CardContent sx={{ position: 'relative', zIndex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(139, 69, 19, 0.2)', 
                    mr: 2,
                    width: 48,
                    height: 48
                  }}>
                    <AttachMoney />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Sua Comissão (5%)
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      R$ {metrics?.commission.toFixed(2) || '0.00'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Status do Backup */}
      <BackupStatus />

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Vendas por Dia */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Vendas por Dia
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Evolução das vendas nos últimos 30 dias
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Vendas"
                      stroke={theme.palette.primary.main}
                      strokeWidth={3}
                      dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: theme.palette.primary.main, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Vendas por Categoria */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2, width: 40, height: 40 }}>
                  <Assessment />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Vendas por Categoria
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distribuição por segmento
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categorySales?.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Vendedores */}
        {role === 'admin' && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', mr: 2, width: 40, height: 40 }}>
                    <TrendingUp />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Top 5 Vendedores
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ranking por volume de vendas
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topSellers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        }}
                        formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Vendas']}
                      />
                      <Bar
                        dataKey="value"
                        name="Vendas"
                        fill={theme.palette.primary.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  )
} 