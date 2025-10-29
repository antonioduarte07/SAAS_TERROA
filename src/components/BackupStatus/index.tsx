import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
} from '@mui/material'
import {
  CloudSync,
  CheckCircle,
  Error,
  Schedule,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

interface BackupStatusProps {
  compact?: boolean
}

export default function BackupStatus({ compact = false }: BackupStatusProps) {
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

  const { data: lastBackup } = useQuery({
    queryKey: ['last-backup'],
    queryFn: async () => {
      try {
        const { data: backups } = await supabase.storage
          .from('backups')
          .list()

        if (!backups || backups.length === 0) return null

        // Ordenar por data de criação (mais recente primeiro)
        const sortedBackups = backups.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

        return sortedBackups[0]
      } catch (error) {
        console.error('Erro ao obter último backup:', error)
        return null
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })

  if (isLoading) {
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
        <Chip
          icon={getStatusIcon()}
          label={getStatusText()}
          color={getStatusColor()}
          size="small"
          variant="outlined"
        />
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
          <Chip
            icon={getStatusIcon()}
            label={getStatusText()}
            color={getStatusColor()}
            variant="outlined"
          />
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
