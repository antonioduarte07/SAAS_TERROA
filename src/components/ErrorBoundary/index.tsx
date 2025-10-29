import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { Error as ErrorIcon } from '@mui/icons-material'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2,
            p: 3,
          }}
        >
          <ErrorIcon color="error" sx={{ fontSize: 64 }} />
          <Typography variant="h5" color="error" align="center">
            Ops! Algo deu errado
          </Typography>
          <Typography color="text.secondary" align="center">
            {this.state.error?.message || 'Ocorreu um erro inesperado'}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleRetry}
            sx={{ mt: 2 }}
          >
            Tentar Novamente
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
} 