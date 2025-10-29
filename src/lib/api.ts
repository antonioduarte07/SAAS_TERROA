// import { supabase } from './supabase'
import { useSnackbar } from 'notistack'

interface ApiError extends Error {
  code?: string
  details?: string
  hint?: string
}

export function handleApiError(error: unknown) {
  const apiError = error as ApiError
  let message = 'Ocorreu um erro inesperado'

  if (apiError.message) {
    switch (apiError.message) {
      case 'JWT expired':
        message = 'Sessão expirada. Por favor, faça login novamente.'
        break
      case 'Invalid JWT':
        message = 'Sessão inválida. Por favor, faça login novamente.'
        break
      case 'Not found':
        message = 'Registro não encontrado.'
        break
      case 'Duplicate key value violates unique constraint':
        message = 'Já existe um registro com este valor.'
        break
      default:
        message = apiError.message
    }
  }

  throw new Error(message)
}

export async function fetchWithError<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  try {
    const { data, error } = await queryFn()
    if (error) throw error
    if (!data) throw new Error('Dados não encontrados')
    return data
  } catch (error) {
    handleApiError(error)
    throw error // Re-throw para ser tratado pelo componente
  }
}

export function useApi() {
  const { enqueueSnackbar } = useSnackbar()

  const handleSuccess = (message: string) => {
    enqueueSnackbar(message, { variant: 'success' })
  }

  const handleError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Ocorreu um erro inesperado'
    enqueueSnackbar(message, { variant: 'error' })
  }

  return {
    handleSuccess,
    handleError,
  }
}

// Exemplo de uso:
// const { data } = await fetchWithError(() => 
//   supabase.from('table').select('*').single()
// ) 