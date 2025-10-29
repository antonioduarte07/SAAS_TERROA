import React, { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { setupBackupSchedule, getBackupSchedule, deleteBackupSchedule } from '../../lib/scheduler'

type Frequency = 'daily' | 'weekly' | 'monthly'

interface ScheduleState {
  frequency: Frequency
  time: string
  retention: number
}

export default function BackupSchedule() {
  const [schedule, setSchedule] = useState<ScheduleState>({
    frequency: 'daily',
    time: '00:00',
    retention: 30,
  })

  const queryClient = useQueryClient()

  const { data: currentSchedule, isLoading } = useQuery({
    queryKey: ['backupSchedule'],
    queryFn: getBackupSchedule,
  })

  const setupMutation = useMutation({
    mutationFn: setupBackupSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupSchedule'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBackupSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupSchedule'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setupMutation.mutate(schedule)
  }

  const handleDelete = () => {
    deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Agendamento de Backups
      </Typography>

      {setupMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao configurar agendamento
        </Alert>
      )}

      {deleteMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao excluir agendamento
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        {currentSchedule ? (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Agendamento Atual
            </Typography>
            <Typography>
              Frequência: {currentSchedule.frequency === 'daily' ? 'Diário' : 
                currentSchedule.frequency === 'weekly' ? 'Semanal' : 'Mensal'}
            </Typography>
            <Typography>
              Horário: {currentSchedule.time}
            </Typography>
            <Typography>
              Retenção: {currentSchedule.retention} dias
            </Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              Última execução:{' '}
              {currentSchedule.last_run
                ? new Date(currentSchedule.last_run).toLocaleString()
                : 'Nunca'}
            </Typography>
            <Button
              color="error"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              sx={{ mt: 2 }}
            >
              {deleteMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Excluir Agendamento'
              )}
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Frequência</InputLabel>
              <Select
                value={schedule.frequency}
                label="Frequência"
                onChange={(e) =>
                  setSchedule({ ...schedule, frequency: e.target.value as Frequency })
                }
              >
                <MenuItem value="daily">Diário</MenuItem>
                <MenuItem value="weekly">Semanal</MenuItem>
                <MenuItem value="monthly">Mensal</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Horário (HH:mm)"
              type="time"
              value={schedule.time}
              onChange={(e) =>
                setSchedule({ ...schedule, time: e.target.value })
              }
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="Dias de Retenção"
              type="number"
              value={schedule.retention}
              onChange={(e) =>
                setSchedule({
                  ...schedule,
                  retention: parseInt(e.target.value),
                })
              }
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Configurar Agendamento'
              )}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  )
} 