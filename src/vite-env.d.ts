/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_RESEND_API_KEY: string
  readonly VITE_ADMIN_EMAIL: string
  readonly VITE_BACKUP_ENCRYPTION_KEY: string
  // Adicione outras variáveis VITE_ aqui se necessário
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 