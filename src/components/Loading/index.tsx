import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingProps {
  fullScreen?: boolean
  message?: string
  size?: number
}

export default function Loading({
  fullScreen = false,
  message = 'Carregando...',
  size = 40,
}: LoadingProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        ...(fullScreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }),
        ...(!fullScreen && {
          minHeight: '200px',
        }),
      }}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography color="text.secondary" align="center">
          {message}
        </Typography>
      )}
    </Box>
  )
} 