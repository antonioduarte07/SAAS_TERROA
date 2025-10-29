import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verificar se é um backup manual
    const { isIncremental = false } = await request.json()
    
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

    const backupData: any = {
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
      return NextResponse.json(
        { error: 'Erro ao salvar backup' },
        { status: 500 }
      )
    }

    // Atualizar última execução na tabela backup_schedules
    await supabase
      .from('backup_schedules')
      .upsert({
        id: 1,
        last_run: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      filename,
      message: 'Backup criado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao criar backup:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
