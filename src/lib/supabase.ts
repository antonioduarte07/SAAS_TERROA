import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL and Key must be defined in environment variables.')
  // Dependendo da necessidade, você pode lançar um erro aqui
  // throw new Error('Supabase URL and Key not defined.');
}

// A conversão para string é segura pois já validamos que não são undefined
export const supabase = createClient(supabaseUrl, supabaseKey) 