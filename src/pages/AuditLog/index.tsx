import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

interface AuditLog {
  id: string
  user_id: string
  action: string
  table_name: string
  record_id: string
  old_data: any
  new_data: any
  created_at: string
  user?: {
    full_name: string
  }
}

export default function AuditLog() {
  const [search, setSearch] = useState('')

  // Consulta para histórico de alterações
  const { data: logs } = useQuery({
    queryKey: ['audit-logs', search],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:users(full_name)
        `)
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`
          action.ilike.%${search}%,
          table_name.ilike.%${search}%,
          record_id.ilike.%${search}%,
          user:users(full_name).ilike.%${search}%
        `)
      }

      const { data, error } = await query

      if (error) throw error
      return data as AuditLog[]
    },
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'success'
      case 'UPDATE':
        return 'warning'
      case 'DELETE':
        return 'error'
      default:
        return 'default'
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'Criação'
      case 'UPDATE':
        return 'Atualização'
      case 'DELETE':
        return 'Exclusão'
      default:
        return action
    }
  }

  const getTableLabel = (table: string) => {
    switch (table) {
      case 'clients':
        return 'Cliente'
      case 'products':
        return 'Produto'
      case 'orders':
        return 'Pedido'
      case 'users':
        return 'Usuário'
      default:
        return table
    }
  }

  const formatChanges = (oldData: any, newData: any) => {
    if (!oldData && !newData) return ''
    if (!oldData) return 'Criado'
    if (!newData) return 'Excluído'

    const changes: string[] = []
    Object.keys(newData).forEach((key) => {
      if (oldData[key] !== newData[key]) {
        changes.push(`${key}: ${oldData[key]} → ${newData[key]}`)
      }
    })
    return changes.join(', ')
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Histórico de Alterações
      </Typography>

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por ação, tabela, ID ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Data/Hora</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Tabela</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Alterações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
                  </TableCell>
                  <TableCell>{log.user?.full_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={getActionLabel(log.action)}
                      color={getActionColor(log.action) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{getTableLabel(log.table_name)}</TableCell>
                  <TableCell>{log.record_id}</TableCell>
                  <TableCell>{formatChanges(log.old_data, log.new_data)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
} 