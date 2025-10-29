-- Script corrigido baseado no schema atual do banco
-- Execute este script no SQL Editor do Supabase Dashboard

-- Primeiro, vamos adicionar as colunas que estão faltando na tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Alterar o tipo da coluna type de USER-DEFINED para text
ALTER TABLE public.clients 
ALTER COLUMN type TYPE text USING type::text;

-- Adicionar constraint para user_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'clients_user_id_fkey'
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE public.clients 
        ADD CONSTRAINT clients_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END$$;

-- Habilitar RLS na tabela clients se não estiver habilitado
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.clients;

-- Criar políticas RLS para clients baseadas no schema atual
CREATE POLICY "Enable read access for authenticated users" ON public.clients
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Enable insert for authenticated users" ON public.clients
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Enable update for authenticated users" ON public.clients
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id OR 
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Enable delete for authenticated users" ON public.clients
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = seller_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Atualizar o cache do PostgREST para reconhecer as mudanças
NOTIFY pgrst, 'reload schema';
