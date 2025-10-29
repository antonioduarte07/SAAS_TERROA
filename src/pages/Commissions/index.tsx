import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface Commission {
  id: string
  seller_id: string
  order_id: string
  amount: number
  percentage: number
  status: 'pending' | 'paid'
  payment_date?: string
  created_at: string
  seller?: {
    full_name: string
  }
  order?: {
    final_amount: number
  }
}

interface CommissionConfig {
  id: string
  seller_id: string
  percentage: number
  seller?: {
    full_name: string
  }
}

export default function Commissions() {
  const [openConfig, setOpenConfig] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<CommissionConfig | null>(null)
  const [percentage, setPercentage] = useState('')
  const queryClient = useQueryClient()

  // Consulta para configurações de comissão
  const { data: configs, isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['commission-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_configs')
        .select(`
          *,
          seller:users(full_name)
        `)

      if (error) throw error
      return data as CommissionConfig[]
    },
  })

  // Consulta para histórico de comissões
  const { data: commissions, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          *,
          seller:users(full_name),
          order:orders(final_amount)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Commission[]
    },
  })

  // Mutação para criar/atualizar configuração
  const { mutate: saveConfig, isPending: isSavingConfig } = useMutation({
    mutationFn: async (data: { seller_id: string; percentage: number }) => {
      if (selectedConfig) {
        const { error } = await supabase
          .from('commission_configs')
          .update({ percentage: data.percentage })
          .eq('id', selectedConfig.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('commission_configs')
          .insert([data])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-configs'] })
      handleCloseConfig()
    },
  })

  // Mutação para excluir configuração
  const { mutate: deleteConfig, isPending: isDeletingConfig } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commission_configs')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-configs'] })
    },
  })

  // Mutação para marcar comissão como paga
  const { mutate: markAsPaid, isPending: isMarkingAsPaid } = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          payment_date: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] })
    },
  })

  const handleOpenConfig = (config?: CommissionConfig) => {
    if (config) {
      setSelectedConfig(config)
      setPercentage(config.percentage.toString())
    } else {
      setSelectedConfig(null)
      setPercentage('')
    }
    setOpenConfig(true)
  }

  const handleCloseConfig = () => {
    setOpenConfig(false)
    setSelectedConfig(null)
    setPercentage('')
  }

  const handleSaveConfig = () => {
    if (!selectedConfig) {
      // Criar nova configuração
      saveConfig({
        seller_id: '', // TODO: Adicionar seleção de vendedor
        percentage: parseFloat(percentage),
      })
    } else {
      // Atualizar configuração existente
      saveConfig({
        seller_id: selectedConfig.seller_id,
        percentage: parseFloat(percentage),
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'paid':
        return 'success'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente'
      case 'paid':
        return 'Pago'
      default:
        return status
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Comissões</Typography>
        <Button
          variant="contained"
          onClick={() => handleOpenConfig()}
        >
          Nova Configuração
        </Button>
      </Box>

      {/* Configurações de Comissão */}
      <Paper sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ p: 2 }}>
          Configurações de Comissão
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendedor</TableCell>
                <TableCell>Percentual</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingConfigs ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : configs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    Nenhuma configuração encontrada
                  </TableCell>
                </TableRow>
              ) : (
                configs?.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>{config.seller?.full_name}</TableCell>
                    <TableCell>{config.percentage}%</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenConfig(config)}
                        disabled={isSavingConfig}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => deleteConfig(config.id)}
                        disabled={isDeletingConfig}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Histórico de Comissões */}
      <Paper>
        <Typography variant="h6" sx={{ p: 2 }}>
          Histórico de Comissões
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Vendedor</TableCell>
                <TableCell>Pedido</TableCell>
                <TableCell>Valor do Pedido</TableCell>
                <TableCell>Comissão</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingCommissions ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : commissions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma comissão encontrada
                  </TableCell>
                </TableRow>
              ) : (
                commissions?.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      {format(new Date(commission.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{commission.seller?.full_name}</TableCell>
                    <TableCell>{commission.order_id}</TableCell>
                    <TableCell>
                      R$ {commission.order?.final_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      R$ {commission.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(commission.status)}
                        color={getStatusColor(commission.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {commission.status === 'pending' && (
                        <Button
                          size="small"
                          onClick={() => markAsPaid(commission.id)}
                          disabled={isMarkingAsPaid}
                        >
                          {isMarkingAsPaid ? 'Processando...' : 'Marcar como Pago'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Modal de Configuração */}
      <Dialog open={openConfig} onClose={handleCloseConfig}>
        <DialogTitle>
          {selectedConfig ? 'Editar Configuração' : 'Nova Configuração'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Percentual"
            type="number"
            fullWidth
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            InputProps={{
              endAdornment: '%',
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfig} disabled={isSavingConfig}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveConfig} 
            variant="contained"
            disabled={isSavingConfig}
          >
            {isSavingConfig ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 