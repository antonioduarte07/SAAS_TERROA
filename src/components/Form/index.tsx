import { ReactNode } from 'react'
import {
  Box,
  Button,
  Paper,
  Stack,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material'

interface FormProps {
  title: string
  children: ReactNode
  onSubmit: () => void
  isLoading?: boolean
  submitLabel?: string
  cancelLabel?: string
  onCancel?: () => void
  error?: string
  success?: string
}

export default function Form({
  title,
  children,
  onSubmit,
  isLoading = false,
  submitLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  onCancel,
  error,
  success,
}: FormProps) {
  return (
    <Paper
      component="form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      sx={{ p: 3 }}
    >
      <Stack spacing={3}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => {}}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => {}}>
            {success}
          </Alert>
        )}

        {isLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {children}

            <Box display="flex" gap={2} justifyContent="flex-end">
              {onCancel && (
                <Button
                  variant="outlined"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  {cancelLabel}
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={isLoading}
              >
                {submitLabel}
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  )
} 