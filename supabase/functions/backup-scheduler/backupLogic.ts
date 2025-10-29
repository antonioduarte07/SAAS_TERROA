import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { format } from 'https://esm.sh/date-fns@2.29.3'
import { gzip, gunzip } from 'https://deno.land/x/compress@v0.4.5/gzip/mod.ts'
// A função sendEmail precisará ser implementada ou movida para cá e adaptada
// import { sendEmail } from './email' 
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from 'https://deno.land/x/aws_sdk@v3.703.0-supabase/client/s3.ts'

// const gzipAsync = promisify(gzip)
// const ungzipAsync = promisify(ungzip)

// Definindo um tipo genérico para os dados das tabelas
export type TableData = Record<string, any>[] | null; // Pode ser um array de objetos ou null

export interface BackupData {
  tables: {
    [key: string]: TableData // Usando o tipo TableData
  }
  timestamp: string
  version: string
  checksum: string
  isIncremental: boolean
  baseBackup?: string
  changes: {
    [table: string]: {
      added: Record<string, any>[] // Melhorando a tipagem
      modified: Record<string, any>[] // Melhorando a tipagem
      deleted: string[]
    }
  }
}

export interface StorageConfig {
  type: 'supabase' | 's3'
  bucket?: string
  region?: string
  accessKeyId?: string
  secretAccessKey?: string
}

// Inicializa o cliente Supabase para uso na função
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ENCRYPTION_KEY = new TextEncoder().encode(Deno.env.get('BACKUP_ENCRYPTION_KEY') || 'your-encryption-key')
const ENCRYPTION_IV_LENGTH = 16

// Configuração do S3 (usando Deno.env)
const s3Client = new S3Client({
  region: Deno.env.get('AWS_REGION'),
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') || '',
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') || '',
  },
})

// Função dummy para enviar email - adaptada para usar Resend API
async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  console.log(`Simulando envio de email para ${to} com assunto: ${subject}`)
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const adminEmail = Deno.env.get('ADMIN_EMAIL');

  if (resendApiKey && adminEmail) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: adminEmail, // O remetente deve ser um domínio verificado no Resend
          to: to,
          subject: subject,
          html: html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Erro ao enviar email via Resend:', data);
      } else {
        console.log('Email enviado via Resend com sucesso:', data);
      }
    } catch (error) {
      console.error('Erro na requisição para Resend:', error);
    }
  } else {
    console.warn('Variáveis de ambiente RESEND_API_KEY ou ADMIN_EMAIL não configuradas. Email não enviado.');
  }
}

async function uploadToStorage(
  filename: string,
  data: Uint8Array,
  config: StorageConfig
): Promise<void> {
  if (config.type === 's3' && config.bucket) {
    const command = new PutObjectCommand({
      Bucket: config.bucket,
      Key: filename,
      Body: data,
      ContentType: 'application/octet-stream', // Tipo genérico para dados binários
    })

    await s3Client.send(command)
  } else {
    // Para Supabase Storage, upload de Uint8Array/Blob é o padrão
    const { error } = await supabase.storage
      .from('backups') // Nome do bucket de backups no Supabase Storage
      .upload(filename, data, {
        contentType: 'application/octet-stream', // Tipo genérico para dados binários
        upsert: true,
      })

    if (error) throw error
  }
}

async function downloadFromStorage(
  filename: string,
  config: StorageConfig
): Promise<Uint8Array> {
  if (config.type === 's3' && config.bucket) {
    const command = new GetObjectCommand({
      Bucket: config.bucket,
      Key: filename,
    })

    const response = await s3Client.send(command)
    if (!response.Body) throw new Error('Erro ao baixar arquivo do S3: corpo vazio')

    // S3 GetObjectCommand retorna ReadableStream, precisamos ler para Uint8Array
    const blob = await response.Body.transformToBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);

  } else {
    const { data, error } = await supabase.storage
      .from('backups') // Nome do bucket de backups no Supabase Storage
      .download(filename)

    if (error) throw error

    // Supabase download retorna Blob, precisamos converter para Uint8Array
    const arrayBuffer = await data.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}

async function deleteFromStorage(
  filename: string,
  config: StorageConfig
): Promise<void> {
  if (config.type === 's3' && config.bucket) {
    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: filename,
    })

    await s3Client.send(command)
  } else {
    const { error } = await supabase.storage
      .from('backups') // Nome do bucket de backups no Supabase Storage
      .remove([filename])

    if (error) throw error
  }
}

// Funções de compressão e criptografia (adaptadas para Deno)
async function compressData(data: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const originalData = encoder.encode(data);
  // gzip retorna Promise<Uint8Array>
  return gzip(originalData);
}

async function decompressData(data: Uint8Array): Promise<string> {
  // gunzip retorna Promise<Uint8Array>
  const decompressed = await gunzip(data);
  const decoder = new TextDecoder();
  return decoder.decode(decompressed);
}

async function encryptData(data: string): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(ENCRYPTION_IV_LENGTH));
  const algorithm = { name: "AES-CBC", iv: iv };
  const key = await crypto.subtle.importKey(
    "raw",
    ENCRYPTION_KEY,
    { name: "AES-CBC" },
    false,
    ["encrypt"]
  );
  const encoder = new TextEncoder();
  const encryptedData = await crypto.subtle.encrypt(
    algorithm,
    key,
    encoder.encode(data)
  );
  // Converter ArrayBuffer para base64
  return { encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedData))), iv: btoa(String.fromCharCode(...new Uint8Array(iv))) };
}

async function decryptData(encrypted: string, iv: string): Promise<string> {
  const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const algorithm = { name: "AES-CBC", iv: ivBuffer };
  const key = await crypto.subtle.importKey(
    "raw",
    ENCRYPTION_KEY,
    { name: "AES-CBC" },
    false,
    ["decrypt"]
  );
  // Converter base64 para Uint8Array
  const encryptedBuffer = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const decryptedData = await crypto.subtle.decrypt(
    algorithm,
    key,
    encryptedBuffer
  );
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

// Refatorando calculateChecksum para ser assíncrona e usar crypto.subtle
async function calculateChecksumAsync(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  // Converter ArrayBuffer para string hexadecimal
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function validateBackupData(data: BackupData): Promise<boolean> {
  try {
    // Validar estrutura básica
    if (!data.tables || !data.timestamp || !data.version || !data.checksum) {
      console.error('Falha na validação: estrutura básica ausente');
      return false;
    }

    // Validar timestamp
    const timestamp = new Date(data.timestamp);
    if (isNaN(timestamp.getTime())) {
      console.error('Falha na validação: timestamp inválido');
      return false;
    }

    // Validar versão
    if (!/^\d+\.\d+\.\d+$/.test(data.version)) {
      console.error('Falha na validação: versão inválida');
      return false;
    }

    // Validar checksum (agora usando a função assíncrona)
    const { checksum, ...dataWithoutChecksum } = data;
    const calculatedChecksum = await calculateChecksumAsync(JSON.stringify(dataWithoutChecksum));
    if (checksum !== calculatedChecksum) {
       console.error(`Falha na validação: checksum inválido. Calculado: ${calculatedChecksum}, Esperado: ${checksum}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro interno ao validar dados do backup:', error);
    return false;
  }
}

async function getLastBackup(config: StorageConfig): Promise<{ filename: string; data: BackupData } | null> {
  try {
    // Usando Partial para permitir propriedades opcionais e unindo tipos de Storage e S3
    let backups: (Partial<Storage.FileObject> & Partial<S3.Object>)[] = []

    if (config.type === 's3' && config.bucket) {
      const command = new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: 'backup_',
      })

      const response = await s3Client.send(command)
      backups = response.Contents || []
    } else {
      const { data } = await supabase.storage
        .from('backups') // Nome do bucket de backups no Supabase Storage
        .list()

      backups = data || []
    }

    if (backups.length === 0) return null

    // Ordenar por data de criação (mais recente primeiro)
    // Acessando propriedades de forma mais segura ou com type guards/assertions
    backups.sort((a, b) => {
      const dateA = new Date(a.LastModified || a.created_at || '').getTime();
      const dateB = new Date(b.LastModified || b.created_at || '').getTime();
      return dateB - dateA;
    });

    const lastBackup = backups[0]
    const filename = lastBackup.Key || lastBackup.name
    if (!filename) throw new Error('Nome do arquivo do último backup não encontrado');

    const dataBuffer = await downloadFromStorage(filename, config)
    const text = new TextDecoder().decode(dataBuffer)
    const { encrypted, iv } = JSON.parse(text)
    const decryptedText = await decryptData(encrypted, iv)
    // DecompressData agora espera Uint8Array
    const decompressedDataBuffer = await decompressData(Uint8Array.from(atob(decryptedText), c => c.charCodeAt(0)))
    const decompressedText = new TextDecoder().decode(decompressedDataBuffer)
    const backupData: BackupData = JSON.parse(decompressedText)

    // Validar dados do último backup antes de retorná-lo
    if (!await validateBackupData(backupData)) {
       console.warn('Último backup encontrado inválido ou corrompido, tratando como se não houvesse backup base.');
       return null;
    }

    return {
      filename,
      data: backupData,
    }
  } catch (error) {
    console.error('Erro ao obter último backup:', error)
    // Se houver erro ao buscar/processar o último backup, tratamos como se não houvesse backup base
    return null;
  }
}

export async function createBackup(
  isIncremental = false,
  config: StorageConfig = { type: 'supabase' }
) {
  try {
    // Use a chave de role de serviço para acessar todas as tabelas
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const tables = [
      'users',
      'clients',
      'products',
      'orders',
      'order_items',
      'commissions',
      'commission_configs',
      'audit_logs',
    ]

    let backupData: BackupData
    const lastBackup = isIncremental ? await getLastBackup(config) : null

    if (isIncremental && lastBackup) {
      // Backup incremental
      backupData = {
        tables: {},
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checksum: '',
        isIncremental: true,
        baseBackup: lastBackup.filename,
        changes: {},
      }

      for (const table of tables) {
        const { data: currentData, error } = await supabaseService
          .from(table)
          .select('*')

        if (error) {
          console.error(`Erro ao coletar dados da tabela ${table}:`, error)
          continue
        }

        const lastData: TableData = lastBackup.data.tables[table] || [] // Usando TableData
        const changes: BackupData['changes'][string] = {
          added: [],
          modified: [],
          deleted: [],
        }

        // Encontrar registros adicionados ou modificados
        // Assumindo que cada registro tem uma propriedade 'id' para comparação
        for (const record of currentData || []) { // Adicionado fallback para array vazio
          const lastRecord = lastData?.find((r) => r.id === record.id) // Acesso seguro com ?. e assumindo 'id'
          if (!lastRecord) {
            changes.added.push(record)
          } else if (JSON.stringify(record) !== JSON.stringify(lastRecord)) {
            changes.modified.push(record)
          }
        }

        // Encontrar registros deletados
        for (const record of lastData || []) { // Adicionado fallback para array vazio
           if (!currentData?.find((r) => r.id === record.id)) { // Acesso seguro com ?. e assumindo 'id'
            changes.deleted.push(record.id) // Assumindo 'id' existe e é string/number
          }
        }

        backupData.changes[table] = changes
      }
    } else {
      // Backup completo
      backupData = {
        tables: {},
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        checksum: '',
        isIncremental: false,
        changes: {},
      }

      for (const table of tables) {
        const { data, error } = await supabaseService
          .from(table)
          .select('*')

        if (error) {
          console.error(`Erro ao coletar dados da tabela ${table}:`, error)
          continue
        }

        backupData.tables[table] = data as TableData; // Usando TableData
      }
    }

    // Calcular checksum
    const { checksum: _, ...dataWithoutChecksum } = backupData // Ignorar checksum existente para calcular o novo
    backupData.checksum = await calculateChecksumAsync(JSON.stringify(dataWithoutChecksum))

    // Converter dados para JSON, comprimir e criptografar
    const jsonData = JSON.stringify(backupData)
    const compressedData = await compressData(jsonData)
    const { encrypted, iv } = await encryptData(new TextDecoder().decode(compressedData))
    const encryptedData = JSON.stringify({ encrypted, iv })

    const filename = `backup_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}${isIncremental ? '_inc' : ''}.enc`

    // Fazer upload para o storage
    // Converter a string JSON criptografada de volta para Uint8Array para upload
     await uploadToStorage(filename, new TextEncoder().encode(encryptedData), config);

    // Enviar notificação por email
    await sendEmail({
      to: Deno.env.get('ADMIN_EMAIL') || '',
      subject: 'Backup Criado com Sucesso',
      html: `
        <h1>Backup Criado</h1>
        <p>Um novo backup foi criado com sucesso.</p>
        <ul>
          <li>Nome do arquivo: ${filename}</li>
          <li>Tipo: ${isIncremental ? 'Incremental' : 'Completo'}</li>
          <li>Data: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</li>
        </ul>
      `,
    })

    return { filename, isIncremental }
  } catch (error) {
    console.error('Erro ao criar backup:', error)

    // Enviar notificação de erro
    await sendEmail({
      to: Deno.env.get('ADMIN_EMAIL') || '',
      subject: 'Erro ao Criar Backup',
      html: `
        <h1>Erro ao Criar Backup</h1>
        <p>Ocorreu um erro ao criar o backup.</p>
        <pre>${error.message}</pre>
      `,
    })

    throw error
  }
}

export async function restoreBackup(
  filename: string,
  config: StorageConfig = { type: 'supabase' }
) {
  try {
    // Use a chave de role de serviço para restaurar dados
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Baixar arquivo do storage
    const dataBuffer = await downloadFromStorage(filename, config)
    const text = new TextDecoder().decode(dataBuffer)

    // Decriptografar e descomprimir dados
    const { encrypted, iv } = JSON.parse(text)
    const decryptedText = await decryptData(encrypted, iv)
    const decompressedDataBuffer = await decompressData(Uint8Array.from(atob(decryptedText), c => c.charCodeAt(0)))
    const decompressedText = new TextDecoder().decode(decompressedDataBuffer)
    const backupData: BackupData = JSON.parse(decompressedText)

    // Validar dados
    if (!await validateBackupData(backupData)) {
      throw new Error('Dados do backup inválidos ou corrompidos')
    }

    if (backupData.isIncremental) {
      // Restaurar backup base primeiro
      if (backupData.baseBackup) {
        // Chamar a função de restauração recursivamente para o backup base
        await restoreBackup(backupData.baseBackup, config)
      }

      // Aplicar mudanças incrementais
      for (const [table, changes] of Object.entries(backupData.changes)) {
        // Adicionar novos registros
        if (changes.added.length > 0) {
          const { error: insertError } = await supabaseService
            .from(table)
            .insert(changes.added)

          if (insertError) {
            console.error(`Erro ao adicionar registros na tabela ${table}:`, insertError)
          }
        }

        // Atualizar registros modificados
        for (const record of changes.modified) {
          // Remover o registro antigo e inserir o modificado para garantir a atomicidade (simplificado)
          // Em um sistema de produção, idealmente você usaria transações e upserts
          const { error: deleteOldError } = await supabaseService
            .from(table)
            .delete()
            .eq('id', (record as any).id) // Type assertion provisório para 'id'

          if (deleteOldError) {
             console.error(`Erro ao deletar registro antigo na tabela ${table}:`, deleteOldError)
          }

          const { error: insertModifiedError } = await supabaseService
            .from(table)
            .insert([record])

          if (insertModifiedError) {
            console.error(`Erro ao inserir registro modificado na tabela ${table}:`, insertModifiedError)
          }
        }

        // Remover registros deletados
        if (changes.deleted.length > 0) {
          const { error: deleteError } = await supabaseService
            .from(table)
            .delete()
            .in('id', changes.deleted)

          if (deleteError) {
            console.error(`Erro ao remover registros da tabela ${table}:`, deleteError)
          }
        }
      }
    } else {
      // Restaurar backup completo
      for (const [table, records] of Object.entries(backupData.tables)) {
        // Limpar tabela atual (usando truncate para ser mais eficiente, requer permissões)
         const { error: truncateError } = await supabaseService.rpc('truncate_table', { table_name: table });

         if (truncateError) {
           console.error(`Erro ao limpar tabela ${table} com truncate:`, truncateError);
            // Fallback para delete se truncate falhar (menos eficiente)
            const { error: deleteError } = await supabaseService
              .from(table)
              .delete()
              .neq('id', 'dummy'); // Força a exclusão de todos os registros

            if (deleteError) {
              console.error(`Erro ao limpar tabela ${table} com delete:`, deleteError);
              continue;
            }
         }

        // Inserir registros do backup
        if (records && records.length > 0) { // Adicionado checagem para records ser null/undefined
          // Inserção em lotes para melhor performance
          const chunkSize = 1000;
          for (let i = 0; i < records.length; i += chunkSize) {
              const chunk = records.slice(i, i + chunkSize);
               const { error: insertError } = await supabaseService
                .from(table)
                .insert(chunk);

               if (insertError) {
                console.error(`Erro ao restaurar dados na tabela ${table} (chunk ${i / chunkSize}):`, insertError);
                // Dependendo da necessidade, pode-se decidir parar ou continuar em caso de erro em um chunk
               }
          }
        }
      }
    }

    // Enviar notificação por email
    await sendEmail({
      to: Deno.env.get('ADMIN_EMAIL') || '',
      subject: 'Backup Restaurado com Sucesso',
      html: `
        <h1>Backup Restaurado</h1>
        <p>O backup foi restaurado com sucesso.</p>
        <ul>
          <li>Nome do arquivo: ${filename}</li>
          <li>Data: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</li>
        </ul>
      `,
    })

    return true
  } catch (error) {
    console.error('Erro ao restaurar backup:', error)

    // Enviar notificação de erro
    await sendEmail({
      to: Deno.env.get('ADMIN_EMAIL') || '',
      subject: 'Erro ao Restaurar Backup',
      html: `
        <h1>Erro ao Restaurar Backup</h1>
        <p>Ocorreu um erro ao restaurar o backup.</p>
        <pre>${error.message}</pre>
      `,
    })

    throw error
  }
}

export async function listBackups(
  config: StorageConfig = { type: 'supabase' }
) {
  try {
    // Use a chave de role de serviço para listar backups no storage
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Usando Partial para permitir propriedades opcionais e unindo tipos de Storage e S3
    let backups: (Partial<Storage.FileObject> & Partial<S3.Object>)[] = []

    if (config.type === 's3' && config.bucket) {
      // A listagem no S3 pode precisar de credenciais no ambiente da função
      const command = new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: 'backup_',
      })

      const response = await s3Client.send(command)
      backups = response.Contents || []
    } else {
      const { data, error } = await supabaseService.storage
        .from('backups') // Nome do bucket de backups no Supabase Storage
        .list()

      if (error) throw error
      backups = data || []
    }

    // Formatar a saída para o frontend
    return backups.map(b => ({
      name: (b as any).name || (b as any).Key, // S3 usa Key
      created_at: (b as any).created_at || (b as any).LastModified, // S3 usa LastModified
      metadata: { size: (b as any).size || (b as any).Size } // S3 usa Size
    }))

  } catch (error) {
    console.error('Erro ao listar backups:', error)
    throw error
  }
}

export async function deleteBackup(
  filename: string,
  config: StorageConfig = { type: 'supabase' }
) {
  try {
     // Use a chave de role de serviço para excluir backups no storage
     const supabaseService = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     )

    await deleteFromStorage(filename, config)

    // Enviar notificação por email
    await sendEmail({
      to: Deno.env.get('ADMIN_EMAIL') || '',
      subject: 'Backup Excluído',
      html: `
        <h1>Backup Excluído</h1>
        <p>O backup foi excluído com sucesso.</p>
        <ul>
          <li>Nome do arquivo: ${filename}</li>
          <li>Data: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</li>
        </ul>
      `,
    })

    return true
  } catch (error) {
    console.error('Erro ao excluir backup:', error)

    // Enviar notificação de erro
    await sendEmail({
      to: Deno.env.get('ADMIN_EMAIL') || '',
      subject: 'Erro ao Excluir Backup',
      html: `
        <h1>Erro ao Excluir Backup</h1>
        <p>Ocorreu um erro ao excluir o backup.</p>
        <pre>${error.message}</pre>
      `,
    })

    throw error
  }
} 