import { supabase } from './supabase'
import { createBackup } from './backup'

interface ScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly'
  time: string // HH:mm
  retention: number // dias
}

export async function setupBackupSchedule(config: ScheduleConfig) {
  try {
    const { error } = await supabase
      .from('backup_schedules')
      .upsert({
        id: 1, // Apenas uma configuração global
        ...config,
        last_run: null,
      })

    if (error) {
      console.error('Erro ao configurar agendamento:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Erro ao configurar agendamento:', error)
    throw error
  }
}

export async function getBackupSchedule() {
  try {
    const { data, error } = await supabase
      .from('backup_schedules')
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao obter agendamento:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Erro ao obter agendamento:', error)
    throw error
  }
}

export async function deleteBackupSchedule() {
  try {
    const { error } = await supabase
      .from('backup_schedules')
      .delete()
      .eq('id', 1)

    if (error) {
      console.error('Erro ao excluir agendamento:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error)
    throw error
  }
}

// Função que será executada pelo Edge Function
export async function executeScheduledBackup() {
  try {
    const schedule = await getBackupSchedule()
    if (!schedule) return

    const now = new Date()
    const lastRun = schedule.last_run ? new Date(schedule.last_run) : null

    // Verifica se é hora de executar o backup
    const shouldRun = checkIfShouldRun(now, lastRun, schedule)
    if (!shouldRun) return

    // Executa o backup
    await createBackup(false, { type: 'supabase' })

    // Atualiza última execução
    await supabase
      .from('backup_schedules')
      .update({ last_run: now.toISOString() })
      .eq('id', 1)

    // Limpa backups antigos
    await cleanupOldBackups(schedule.retention)
  } catch (error) {
    console.error('Erro ao executar backup agendado:', error)
    throw error
  }
}

function checkIfShouldRun(
  now: Date,
  lastRun: Date | null,
  schedule: ScheduleConfig
): boolean {
  if (!lastRun) return true

  const [hours, minutes] = schedule.time.split(':').map(Number)
  const scheduledTime = new Date(now)
  scheduledTime.setHours(hours, minutes, 0, 0)

  switch (schedule.frequency) {
    case 'daily':
      return now >= scheduledTime && lastRun < scheduledTime
    case 'weekly':
      return (
        now.getDay() === 0 && // Domingo
        now >= scheduledTime &&
        lastRun < scheduledTime
      )
    case 'monthly':
      return (
        now.getDate() === 1 && // Primeiro dia do mês
        now >= scheduledTime &&
        lastRun < scheduledTime
      )
    default:
      return false
  }
}

async function cleanupOldBackups(retentionDays: number) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { data: backups } = await supabase.storage
      .from('backups')
      .list()

    if (!backups) return

    const oldBackups = backups.filter(
      (backup) => new Date(backup.created_at) < cutoffDate
    )

    for (const backup of oldBackups) {
      await supabase.storage.from('backups').remove([backup.name])
    }
  } catch (error) {
    console.error('Erro ao limpar backups antigos:', error)
    throw error
  }
} 