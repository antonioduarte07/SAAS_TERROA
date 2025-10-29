const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Supabase URL:', supabaseUrl ? 'Configurada' : 'NÃO CONFIGURADA')
    console.log('Service Key:', supabaseServiceKey ? 'Configurada' : 'NÃO CONFIGURADA')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ 
        error: 'Variáveis de ambiente não configuradas',
        details: {
          supabaseUrl: !!supabaseUrl,
          serviceKey: !!supabaseServiceKey
        }
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verificar se é um backup manual
    const { isIncremental = false } = req.body
    
    // Tabelas para backup
    const tables = [
      'profiles',
      'clients', 
      'products',
      'orders',
      'order_items',
      'commissions',
      'commission_configs',
      'audit_logs',
    ]

    const backupData = {
      tables: {},
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      isIncremental: isIncremental,
    }

    // Coletar dados de cada tabela
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) {
        console.error(`Erro ao coletar dados da tabela ${table}:`, error)
        continue
      }

      backupData.tables[table] = data || []
    }

    // Criar nome do arquivo
    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    
    // Fazer upload para o storage do Supabase
    const { error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, JSON.stringify(backupData), {
        contentType: 'application/json',
        upsert: false
      })

    if (uploadError) {
      console.error('Erro ao fazer upload do backup:', uploadError)
      return res.status(500).json({ error: 'Erro ao salvar backup' })
    }

    // Atualizar última execução na tabela backup_schedules
    await supabase
      .from('backup_schedules')
      .upsert({
        id: 1,
        last_run: new Date().toISOString()
      })

    res.status(200).json({
      success: true,
      filename,
      message: 'Backup criado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao criar backup:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
}
