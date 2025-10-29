import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useSnackbar } from 'notistack'

interface AuthContextData {
  user: User | null
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
  error: string | null
  role: string | null
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const { enqueueSnackbar } = useSnackbar()

  useEffect(() => {
    const fetchUserAndRole = async () => {
      setIsLoading(true)
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        setSession(session)
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()

          if (profileError) throw profileError
          setRole(profile?.role || null)
        } else {
          setRole(null)
        }

      } catch (error) {
        console.error('Erro ao obter sessão e papel do Supabase:', error)
        setError('Erro ao verificar autenticação')
        enqueueSnackbar('Erro ao verificar autenticação', { variant: 'error' })
        setRole(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserAndRole();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserAndRole();
    })

    return () => subscription.unsubscribe()
  }, [enqueueSnackbar])

  const handleAuthError = (error: AuthError) => {
    let message = 'Erro de autenticação'
    
    switch (error.message) {
      case 'Invalid login credentials':
        message = 'Email ou senha inválidos'
        break
      case 'Email not confirmed':
        message = 'Email não confirmado'
        break
      case 'User already registered':
        message = 'Usuário já cadastrado'
        break
      default:
        message = error.message
    }

    setError(message)
    enqueueSnackbar(message, { variant: 'error' })
    throw error
  }

  const signIn = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) handleAuthError(error)
      
      enqueueSnackbar('Login realizado com sucesso', { variant: 'success' })
    } catch (error) {
      handleAuthError(error as AuthError)
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      setError(null)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) handleAuthError(error)
      
      enqueueSnackbar('Cadastro realizado com sucesso', { variant: 'success' })
    } catch (error) {
      handleAuthError(error as AuthError)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      
      // Limpar estado local primeiro
      setUser(null)
      setSession(null)
      setRole(null)
      
      // Tentar fazer logout no Supabase, mas não falhar se a sessão já expirou
      const { error } = await supabase.auth.signOut()
      
      if (error && !error.message.includes('Auth session missing')) {
        handleAuthError(error)
        return
      }
      
      enqueueSnackbar('Logout realizado com sucesso', { variant: 'success' })
    } catch (error) {
      // Se der erro, ainda assim limpar o estado local
      setUser(null)
      setSession(null)
      setRole(null)
      
      const authError = error as AuthError
      if (!authError.message.includes('Auth session missing')) {
        handleAuthError(authError)
      } else {
        enqueueSnackbar('Logout realizado com sucesso', { variant: 'success' })
      }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        signIn,
        signUp,
        signOut,
        isLoading,
        error,
        role,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }

  return context
} 