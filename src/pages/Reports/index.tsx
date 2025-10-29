import { useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Order, OrderItem, Product, Client } from '@/types'
import * as XLSX from 'xlsx'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`report-tabpanel-${index}`}
      aria-labelledby={`report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function Reports() {
  const [tabValue, setTabValue] = useState(0)
  const [dateRange, setDateRange] = useState({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  })
  const [category, setCategory] = useState('all')
  const [seller, setSeller] = useState('all')

  // Consulta para categorias
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .distinct()

      if (error) throw error
      return data.map((item) => item.category)
    },
  })

  // Consulta para vendedores
  const { data: sellers } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'seller')

      if (error) throw error
      return data
    },
  })

  // Consulta para relatório de vendas
  const { data: salesReport } = useQuery({
    queryKey: ['sales-report', dateRange, category, seller],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            product:products(*)
          ),
          client:clients(*),
          seller:users(*)
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      if (category !== 'all') {
        query = query.contains('items', [{ product: { category } }])
      }

      if (seller !== 'all') {
        query = query.eq('seller_id', seller)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })

  // Consulta para relatório de comissões
  const { data: commissionsReport } = useQuery({
    queryKey: ['commissions-report', dateRange, seller],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          seller:users(*)
        `)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      if (seller !== 'all') {
        query = query.eq('seller_id', seller)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })

  // Consulta para relatório de estoque
  const { data: stockReport } = useQuery({
    queryKey: ['stock-report', category],
    queryFn: async () => {
      let query = supabase.from('products').select('*')

      if (category !== 'all') {
        query = query.eq('category', category)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    },
  })

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleExport = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  const formatSalesReport = (data: any[]) => {
    return data.map((order) => ({
      'Número do Pedido': order.id,
      'Data': format(new Date(order.created_at), 'dd/MM/yyyy'),
      'Cliente': order.client?.name,
      'Vendedor': order.seller?.full_name,
      'Status': order.status,
      'Subtotal': order.subtotal,
      'Desconto': order.discount,
      'Total': order.final_amount,
      'Itens': order.items?.map((item: any) => 
        `${item.product?.name} (${item.quantity} x R$ ${item.unit_price})`
      ).join(', '),
    }))
  }

  const formatCommissionsReport = (data: any[]) => {
    return data.map((order) => ({
      'Número do Pedido': order.id,
      'Data': format(new Date(order.created_at), 'dd/MM/yyyy'),
      'Vendedor': order.seller?.full_name,
      'Total': order.final_amount,
      'Comissão': order.final_amount * 0.1, // 10% de comissão
    }))
  }

  const formatStockReport = (data: any[]) => {
    return data.map((product) => ({
      'Código': product.id,
      'Nome': product.name,
      'Categoria': product.category,
      'Unidade': product.unit,
      'Preço': product.price,
      'Estoque': product.stock_quantity,
      'Status': product.stock_quantity > 0 ? 'Disponível' : 'Indisponível',
    }))
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Relatórios
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Vendas" />
          <Tab label="Comissões" />
          <Tab label="Estoque" />
        </Tabs>

        {/* Filtros */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Data Inicial"
                value={dateRange.start}
                onChange={(date) => setDateRange({ ...dateRange, start: date || dateRange.start })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DatePicker
                label="Data Final"
                value={dateRange.end}
                onChange={(date) => setDateRange({ ...dateRange, end: date || dateRange.end })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={category}
                  label="Categoria"
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  {categories?.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Vendedor</InputLabel>
                <Select
                  value={seller}
                  label="Vendedor"
                  onChange={(e) => setSeller(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {sellers?.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.full_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        {/* Relatório de Vendas */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleExport(formatSalesReport(salesReport || []), 'relatorio-vendas')}
            >
              Exportar para Excel
            </Button>
          </Box>
          <Box sx={{ height: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {salesReport?.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{format(new Date(order.created_at), 'dd/MM/yyyy')}</td>
                    <td>{order.client?.name}</td>
                    <td>{order.seller?.full_name}</td>
                    <td>{order.status}</td>
                    <td>R$ {order.final_amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </TabPanel>

        {/* Relatório de Comissões */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleExport(formatCommissionsReport(commissionsReport || []), 'relatorio-comissoes')}
            >
              Exportar para Excel
            </Button>
          </Box>
          <Box sx={{ height: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Data</th>
                  <th>Vendedor</th>
                  <th>Total</th>
                  <th>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {commissionsReport?.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>{format(new Date(order.created_at), 'dd/MM/yyyy')}</td>
                    <td>{order.seller?.full_name}</td>
                    <td>R$ {order.final_amount.toFixed(2)}</td>
                    <td>R$ {(order.final_amount * 0.1).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </TabPanel>

        {/* Relatório de Estoque */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              onClick={() => handleExport(formatStockReport(stockReport || []), 'relatorio-estoque')}
            >
              Exportar para Excel
            </Button>
          </Box>
          <Box sx={{ height: 400, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nome</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stockReport?.map((product) => (
                  <tr key={product.id}>
                    <td>{product.id}</td>
                    <td>{product.name}</td>
                    <td>{product.category}</td>
                    <td>{product.unit}</td>
                    <td>R$ {product.price.toFixed(2)}</td>
                    <td>{product.stock_quantity}</td>
                    <td>{product.stock_quantity > 0 ? 'Disponível' : 'Indisponível'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  )
} 