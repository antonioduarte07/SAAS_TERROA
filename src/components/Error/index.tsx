import { Box, Button, Typography } from '@mui/material'
import { Error as ErrorIcon } from '@mui/icons-material'

interface ErrorProps {
  message?: string
  onRetry?: () => void
}

export default function Error({
  message = 'Ocorreu um erro ao carregar os dados.',
  onRetry,
}: ErrorProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        gap: 2,
      }}
    >
      <ErrorIcon color="error" sx={{ fontSize: 48 }} />
      <Typography color="error" align="center">
        {message}
      </Typography>
      {onRetry && (
        <Button
          variant="contained"
          color="primary"
          onClick={onRetry}
        >
          Tentar Novamente
        </Button>
      )}
    </Box>
  )
} 