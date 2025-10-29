import { StorageConfig } from '../../supabase/functions/backup-scheduler/backupLogic'

const BACKUP_SCHEDULER_API_KEY = import.meta.env.VITE_BACKUP_SCHEDULER_API_KEY;

async function callBackupEdgeFunction<T>(action: string, body?: any): Promise<T> {
  const url = '/backup'; // A rota da sua Edge Function no Supabase

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKUP_SCHEDULER_API_KEY}`,
      },
      body: JSON.stringify({ action, ...body }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Erro na Edge Function (${response.status}):`, errorData);
      throw new Error(errorData.error || `Erro na Edge Function: ${response.status}`);
    }

    return await response.json() as T;
  } catch (error) {
    console.error('Erro ao chamar Edge Function de backup:', error);
    throw error;
  }
}

export async function createBackup(isIncremental = false, config: StorageConfig) {
  console.log('Frontend: Chamando createBackup na Edge Function', { isIncremental, config });
  return callBackupEdgeFunction<{ filename: string; isIncremental: boolean }>('create', { isIncremental, storageConfig: config });
}

export async function restoreBackup(filename: string, config: StorageConfig) {
  console.log('Frontend: Chamando restoreBackup na Edge Function', { filename, config });
  return callBackupEdgeFunction<boolean>('restore', { filename, storageConfig: config });
}

export async function listBackups(config: StorageConfig) {
  console.log('Frontend: Chamando listBackups na Edge Function', { config });
  // Para listagem, podemos usar um método GET se a Edge Function suportar,
  // ou enviar a config no body de um POST se necessário.
  // Assumindo POST com body para consistência com outras operações por enquanto.
  // Em uma API RESTful típica, listagem seria GET com query params.
  // Vamos ajustar para GET e query params para melhor prática RESTful.
   const url = new URL('/backup', window.location.origin);
   url.searchParams.append('storageType', config.type);
   if (config.bucket) url.searchParams.append('bucket', config.bucket);
   // Adicionar outros parâmetros de storageConfig conforme necessário para GET

   try {
     const response = await fetch(url.toString(), {
       method: 'GET',
       headers: {
         'Authorization': `Bearer ${BACKUP_SCHEDULER_API_KEY}`,
       },
     });

     if (!response.ok) {
       const errorData = await response.json();
       console.error(`Erro na Edge Function (${response.status}):`, errorData);
       throw new Error(errorData.error || `Erro na Edge Function: ${response.status}`);
     }

     // Definir um tipo mais específico para o retorno da listagem, se soubermos a estrutura
     // Por enquanto, mantemos any[] como fallback seguro
     return await response.json() as any[];
   } catch (error) {
     console.error('Erro ao listar backups via Edge Function:', error);
     throw error;
   }
}

export async function deleteBackup(filename: string, config: StorageConfig) {
  console.log('Frontend: Chamando deleteBackup na Edge Function', { filename, config });
  return callBackupEdgeFunction<boolean>('delete', { filename, storageConfig: config });
} 