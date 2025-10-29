import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material'
import {
  CloudSync,
  CheckCircle,
  Error,
  Schedule,
  Backup,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase com service role para acessar storage
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'

interface BackupStatusProps {
  compact?: boolean
}

export default function BackupStatus({ compact = false }: BackupStatusProps) {
  const { role } = useAuth()
  const queryClient = useQueryClient()

  // Só mostrar para administradores
  if (role !== 'admin') {
    return null
  }
  const { data: backupSchedule, isLoading } = useQuery({
    queryKey: ['backup-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_schedules')
        .select('*')
        .single()

      if (error) {
        console.error('Erro ao obter agendamento de backup:', error)
        return null
      }

      return data
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })

  const { data: lastBackup, isLoading: isLoadingBackup } = useQuery({
    queryKey: ['last-backup'],
    queryFn: async () => {
      try {
        console.log('Buscando backups no storage...')
        console.log('Supabase client:', supabase)
        
        const { data: backups, error } = await supabaseAdmin.storage
          .from('backups')
          .list()

        console.log('Response completa:', { data: backups, error })

        if (error) {
          console.error('Erro ao listar backups:', error)
          return null
        }

        console.log('Backups encontrados:', backups)
        console.log('Tipo de backups:', typeof backups, 'Array?', Array.isArray(backups))

        if (!backups || backups.length === 0) {
          console.log('Nenhum backup encontrado')
          return null
        }

        // Ordenar por data de criação (mais recente primeiro)
        const sortedBackups = backups.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        console.log('Último backup:', sortedBackups[0])
        return sortedBackups[0]
      } catch (error) {
        console.error('Erro ao obter último backup:', error)
        return null
      }
    },
    refetchInterval: 10000, // Atualiza a cada 10 segundos
    retry: 3,
  })

  // Mutação para fazer backup manual
  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isIncremental: false }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar backup')
      }

      return response.json()
    },
    onSuccess: () => {
      console.log('Backup realizado com sucesso, atualizando queries...')
      // Atualizar as queries relacionadas ao backup
      queryClient.invalidateQueries({ queryKey: ['backup-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['last-backup'] })
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['last-backup'] })
    },
    onError: (error) => {
      console.error('Erro ao fazer backup:', error)
    },
  })

  if (isLoading || isLoadingBackup) {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: compact ? 2 : 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Carregando status do backup...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  const lastBackupDate = lastBackup?.created_at 
    ? new Date(lastBackup.created_at)
    : null

  const getStatusColor = () => {
    if (!lastBackupDate) return 'error'
    
    const hoursSinceLastBackup = (new Date().getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceLastBackup < 24) return 'success'
    if (hoursSinceLastBackup < 72) return 'warning'
    return 'error'
  }

  const getStatusText = () => {
    if (!lastBackupDate) return 'Nunca executado'
    
    const hoursSinceLastBackup = (new Date().getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceLastBackup < 1) return 'Executado há menos de 1 hora'
    if (hoursSinceLastBackup < 24) return `Executado há ${Math.floor(hoursSinceLastBackup)} horas`
    if (hoursSinceLastBackup < 72) return `Executado há ${Math.floor(hoursSinceLastBackup / 24)} dias`
    return 'Executado há mais de 3 dias'
  }

  const getStatusIcon = () => {
    const statusColor = getStatusColor()
    
    switch (statusColor) {
      case 'success':
        return <CheckCircle color="success" />
      case 'warning':
        return <Schedule color="warning" />
      case 'error':
        return <Error color="error" />
      default:
        return <CloudSync />
    }
  }

  if (compact) {
    return (
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        p: 2, 
        bgcolor: 'grey.50', 
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'grey.200'
      }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 32, height: 32 }}>
          <CloudSync />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Backup Automático
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {lastBackupDate 
              ? `Último: ${format(lastBackupDate, 'dd/MM/yyyy HH:mm')}`
              : 'Nunca executado'
            }
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            variant="outlined"
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<Backup />}
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            sx={{ minWidth: 'auto' }}
          >
            {backupMutation.isPending ? 'Fazendo...' : 'Backup'}
          </Button>
        </Box>
      </Box>
    )
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 40, height: 40 }}>
            <CloudSync />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Status do Backup Automático
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Informações sobre o sistema de backup
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Último Backup Executado
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500 }}>
              {lastBackupDate 
                ? format(lastBackupDate, 'dd/MM/yyyy HH:mm')
                : 'Nunca executado'
              }
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={getStatusIcon()}
              label={getStatusText()}
              color={getStatusColor()}
              variant="outlined"
            />
            <Button
              variant="contained"
              startIcon={<Backup />}
              onClick={() => backupMutation.mutate()}
              disabled={backupMutation.isPending}
              sx={{ minWidth: 'auto' }}
            >
              {backupMutation.isPending ? 'Fazendo Backup...' : 'Fazer Backup'}
            </Button>
          </Box>
        </Box>

        {backupSchedule && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Configuração Atual
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={`Frequência: ${backupSchedule.frequency === 'daily' ? 'Diário' : backupSchedule.frequency === 'weekly' ? 'Semanal' : 'Mensal'}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Horário: ${backupSchedule.time}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Retenção: ${backupSchedule.retention} dias`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
