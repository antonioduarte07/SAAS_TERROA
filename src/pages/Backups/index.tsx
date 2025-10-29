import React, { useState } from 'react'
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
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material'
import {
  Search as SearchIcon,
  Sort as SortIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { createBackup, listBackups, restoreBackup, deleteBackup } from '../../lib/backup'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

interface Backup {
  name: string
  created_at: string
  metadata: {
    size: number
  }
}

type SortField = 'name' | 'date' | 'size'
type SortOrder = 'asc' | 'desc'

export default function Backups() {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'restore' | 'delete'
    filename: string
  }>({
    open: false,
    type: 'restore',
    filename: '',
  })

  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean
    filename: string
    content: any
  }>({
    open: false,
    filename: '',
    content: null,
  })

  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null)
  const [dateFilter, setDateFilter] = useState<{
    start: Date | null
    end: Date | null
  }>({
    start: null,
    end: null,
  })

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: backups, isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: listBackups,
  })

  const createBackupMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
    },
  })

  const restoreBackupMutation = useMutation({
    mutationFn: restoreBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      setConfirmDialog({ open: false, type: 'restore', filename: '' })
    },
  })

  const deleteBackupMutation = useMutation({
    mutationFn: deleteBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] })
      setConfirmDialog({ open: false, type: 'delete', filename: '' })
    },
  })

  const handleCreateBackup = () => {
    createBackupMutation.mutate()
  }

  const handleRestoreBackup = (filename: string) => {
    setConfirmDialog({
      open: true,
      type: 'restore',
      filename,
    })
  }

  const handleDeleteBackup = (filename: string) => {
    setConfirmDialog({
      open: true,
      type: 'delete',
      filename,
    })
  }

  const handlePreviewBackup = async (filename: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('backups')
        .download(filename)

      if (error) throw error

      const text = await data.text()
      const content = JSON.parse(text)

      setPreviewDialog({
        open: true,
        filename,
        content,
      })
    } catch (error) {
      console.error('Erro ao carregar preview:', error)
    }
  }

  const handleConfirmAction = () => {
    if (confirmDialog.type === 'restore') {
      restoreBackupMutation.mutate(confirmDialog.filename)
    } else {
      deleteBackupMutation.mutate(confirmDialog.filename)
    }
  }

  const handleCloseDialog = () => {
    setConfirmDialog({ open: false, type: 'restore', filename: '' })
  }

  const handleClosePreview = () => {
    setPreviewDialog({ open: false, filename: '', content: null })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setSortAnchorEl(null)
  }

  const filteredAndSortedBackups = backups
    ?.filter((backup: Backup) => {
      const matchesSearch = backup.name.toLowerCase().includes(search.toLowerCase())
      const matchesDate =
        (!dateFilter.start ||
          new Date(backup.created_at) >= dateFilter.start) &&
        (!dateFilter.end || new Date(backup.created_at) <= dateFilter.end)
      return matchesSearch && matchesDate
    })
    .sort((a: Backup, b: Backup) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'date':
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'size':
          comparison = a.metadata.size - b.metadata.size
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Backups</Typography>
        <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            {createBackupMutation.isPending ? 'Criando...' : 'Criar Backup'}
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/backups/schedule')}
          >
            Agendamento
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/backups/storage')}
          >
            Armazenamento
          </Button>
        </Box>
      </Box>

      {createBackupMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao criar backup
        </Alert>
      )}

      {restoreBackupMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao restaurar backup
        </Alert>
      )}

      {deleteBackupMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao excluir backup
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Buscar backups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1 }}
        />
        <IconButton onClick={(e) => setSortAnchorEl(e.currentTarget)}>
          <SortIcon />
        </IconButton>
        <IconButton onClick={(e) => setFilterAnchorEl(e.currentTarget)}>
          <FilterIcon />
        </IconButton>
      </Box>

      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={() => setSortAnchorEl(null)}
      >
        <MenuItem onClick={() => handleSort('name')}>
          Nome {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
        </MenuItem>
        <MenuItem onClick={() => handleSort('date')}>
          Data {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
        </MenuItem>
        <MenuItem onClick={() => handleSort('size')}>
          Tamanho {sortField === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <MenuItem>
          <TextField
            type="date"
            label="Data Inicial"
            value={dateFilter.start?.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              setDateFilter({
                ...dateFilter,
                start: e.target.value ? new Date(e.target.value) : null,
              })
            }
            InputLabelProps={{ shrink: true }}
          />
        </MenuItem>
        <MenuItem>
          <TextField
            type="date"
            label="Data Final"
            value={dateFilter.end?.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              setDateFilter({
                ...dateFilter,
                end: e.target.value ? new Date(e.target.value) : null,
              })
            }
            InputLabelProps={{ shrink: true }}
          />
        </MenuItem>
      </Menu>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome do Arquivo</TableCell>
              <TableCell>Data de Criação</TableCell>
              <TableCell>Tamanho</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredAndSortedBackups?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  Nenhum backup encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedBackups?.map((backup: Backup) => (
                <TableRow key={backup.name}>
                  <TableCell>{backup.name}</TableCell>
                  <TableCell>
                    {format(new Date(backup.created_at), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    {(backup.metadata.size / 1024).toFixed(2)} KB
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Visualizar">
                      <IconButton
                        onClick={() => handlePreviewBackup(backup.name)}
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Restaurar">
                      <IconButton
                        onClick={() => handleRestoreBackup(backup.name)}
                        disabled={restoreBackupMutation.isPending}
                        size="small"
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        onClick={() => handleDeleteBackup(backup.name)}
                        disabled={deleteBackupMutation.isPending}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={confirmDialog.open} onClose={handleCloseDialog}>
        <DialogTitle>
          {confirmDialog.type === 'restore'
            ? 'Restaurar Backup'
            : 'Excluir Backup'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.type === 'restore'
              ? 'Tem certeza que deseja restaurar este backup? Todos os dados atuais serão substituídos.'
              : 'Tem certeza que deseja excluir este backup? Esta ação não pode ser desfeita.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleConfirmAction}
            color={confirmDialog.type === 'restore' ? 'primary' : 'error'}
            variant="contained"
            disabled={
              confirmDialog.type === 'restore'
                ? restoreBackupMutation.isPending
                : deleteBackupMutation.isPending
            }
          >
            {confirmDialog.type === 'restore' ? 'Restaurar' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewDialog.open}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Preview do Backup</DialogTitle>
        <DialogContent>
          {previewDialog.content && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Informações Gerais
              </Typography>
              <Typography>
                Data: {format(new Date(previewDialog.content.timestamp), 'dd/MM/yyyy HH:mm:ss')}
              </Typography>
              <Typography>Versão: {previewDialog.content.version}</Typography>

              <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
                Tabelas
              </Typography>
              {Object.entries(previewDialog.content.tables).map(([table, records]: [string, any]) => (
                <Box key={table} sx={{ mb: 2 }}>
                  <Chip
                    label={`${table} (${records.length} registros)`}
                    color="primary"
                    sx={{ mb: 1 }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
} 