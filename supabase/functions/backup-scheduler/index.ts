import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2' // Não usado aqui após refatoração
import { executeScheduledBackup } from '../../src/lib/scheduler.ts'
import { createBackup, restoreBackup, listBackups, deleteBackup, StorageConfig } from './backupLogic.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Verificar a chave de API para todas as requisições
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const apiKey = authHeader.split(' ')[1]
  if (apiKey !== Deno.env.get('BACKUP_SCHEDULER_API_KEY')) {
     return new Response(JSON.stringify({ error: 'Invalid API key' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 403,
    });
  }


  try {
    let responseData; // responseData pode ser reatribuído, então mantém let
    let currentStatus = 200; // Usar uma variável diferente para status mutável

    if (path === '/backup-scheduler') {
      // Rota para o agendador de backup (executado via cron)
       if (req.method === 'POST') {
          // A requisição agendada do Supabase envia um POST vazio ou com payload específico
          // Executa o backup agendado
          await executeScheduledBackup();
          responseData = { message: 'Backup scheduled successfully' };
          // status pode ser 200 aqui, mas não há outra condição que mude para esta rota específica
       } else {
           // Método não permitido para esta rota
           return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 405,
            });
       }
    } else if (path === '/backup') {
      // Rota para operações de backup on-demand
      const config: StorageConfig = { type: 'supabase' }; // Default config
      // Em um cenário real, a configuração de storage viria do request body ou DB

      if (req.method === 'POST') {
        const { action, filename, isIncremental, storageConfig } = await req.json();

         // Usar storageConfig do body se fornecido
        const effectiveConfig = storageConfig || config;

        if (action === 'create') {
          responseData = await createBackup(isIncremental, effectiveConfig);
        } else if (action === 'restore') {
          if (!filename) { currentStatus = 400; throw new Error('Filename is required for restore'); }
          responseData = await restoreBackup(filename, effectiveConfig);
        } else if (action === 'delete') {
           if (!filename) { currentStatus = 400; throw new Error('Filename is required for delete'); }
           responseData = await deleteBackup(filename, effectiveConfig);
        } else {
          currentStatus = 400; throw new Error('Invalid action');
        }
      } else if (req.method === 'GET') {
         // Rota para listar backups
          const storageType = url.searchParams.get('storageType') || 'supabase';
          // Em um cenário real, outros parâmetros de filtro/paginação viriam da URL
           const listConfig: StorageConfig = { type: storageType as 'supabase' | 's3' };
           // Para S3, precisaríamos obter bucket e outras configs, possivelmente do DB ou env

          responseData = await listBackups(listConfig);
      } else {
        // Método não permitido para esta rota
         return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 405,
          });
      }
    } else {
      // Rota não encontrada
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    return new Response(
      JSON.stringify(responseData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: currentStatus,
      }
    );
  } catch (error) {
    console.error('Error handling request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: (error.message === 'Unauthorized' || error.message === 'Invalid API key') ? (error.message === 'Unauthorized' ? 401 : 403) : (error instanceof Error && error.message.includes('required') || error.message.includes('Invalid action')) ? 400 : 500,
      }
    );
  }
}) 