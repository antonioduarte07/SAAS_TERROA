import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface StorageConfig {
  type: 'supabase' | 's3'
  bucket?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
}

export default function BackupStorage() {
  const [config, setConfig] = useState<StorageConfig>({
    type: 'supabase',
  })
  const queryClient = useQueryClient()

  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['backupStorageConfig'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_config')
        .select('*')
        .single()

      if (error) throw error
      return data as StorageConfig
    },
  })

  const setupMutation = useMutation({
    mutationFn: async (config: StorageConfig) => {
      const { error } = await supabase
        .from('backup_config')
        .upsert({
          id: 1,
          ...config,
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backupStorageConfig'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setupMutation.mutate(config)
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Configuração de Armazenamento
      </Typography>

      {setupMutation.isError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao configurar armazenamento: {setupMutation.error.message}
        </Alert>
      )}

      {setupMutation.isSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Configuração salva com sucesso!
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Tipo de Armazenamento</InputLabel>
              <Select
                value={config.type}
                label="Tipo de Armazenamento"
                onChange={(e) => setConfig({ ...config, type: e.target.value as 'supabase' | 's3' })}
              >
                <MenuItem value="supabase">Supabase Storage</MenuItem>
                <MenuItem value="s3">Amazon S3</MenuItem>
              </Select>
            </FormControl>

            {config.type === 's3' && (
              <>
                <TextField
                  fullWidth
                  label="Bucket"
                  value={config.bucket || ''}
                  onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Região"
                  value={config.region || ''}
                  onChange={(e) => setConfig({ ...config, region: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Access Key ID"
                  value={config.accessKeyId || ''}
                  onChange={(e) => setConfig({ ...config, accessKeyId: e.target.value })}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Secret Access Key"
                  type="password"
                  value={config.secretAccessKey || ''}
                  onChange={(e) => setConfig({ ...config, secretAccessKey: e.target.value })}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {currentConfig && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Configuração Atual
            </Typography>
            <Typography>
              <strong>Tipo:</strong> {currentConfig.type}
            </Typography>
            {currentConfig.type === 's3' && (
              <>
                <Typography>
                  <strong>Bucket:</strong> {currentConfig.bucket}
                </Typography>
                <Typography>
                  <strong>Região:</strong> {currentConfig.region}
                </Typography>
                <Typography>
                  <strong>Access Key ID:</strong> {currentConfig.accessKeyId}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
} 