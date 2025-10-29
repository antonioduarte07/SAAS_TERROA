-- Migração para corrigir a tabela clients e garantir que tenha a estrutura correta

-- Primeiro, vamos verificar se a tabela clients existe e criar se não existir
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'individual',
  cpf_cnpj text,
  email text NOT NULL,
  phone text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  vendedor_id uuid,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);

-- Adicionar constraints de chave estrangeira se não existirem
DO $$
BEGIN
    -- Adicionar constraint para vendedor_id se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'clients_vendedor_id_fkey'
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE public.clients 
        ADD CONSTRAINT clients_vendedor_id_fkey 
        FOREIGN KEY (vendedor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Adicionar constraint para user_id se não existir
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

-- Criar políticas RLS para clients se não existirem
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clients' 
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users" ON public.clients
            FOR SELECT
            TO authenticated
            USING (
                auth.uid() = user_id OR 
                auth.uid() = vendedor_id OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;

    -- Política para INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clients' 
        AND policyname = 'Enable insert for authenticated users'
    ) THEN
        CREATE POLICY "Enable insert for authenticated users" ON public.clients
            FOR INSERT
            TO authenticated
            WITH CHECK (
                auth.uid() = vendedor_id OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;

    -- Política para UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clients' 
        AND policyname = 'Enable update for authenticated users'
    ) THEN
        CREATE POLICY "Enable update for authenticated users" ON public.clients
            FOR UPDATE
            TO authenticated
            USING (
                auth.uid() = user_id OR 
                auth.uid() = vendedor_id OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            )
            WITH CHECK (
                auth.uid() = vendedor_id OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;

    -- Política para DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clients' 
        AND policyname = 'Enable delete for authenticated users'
    ) THEN
        CREATE POLICY "Enable delete for authenticated users" ON public.clients
            FOR DELETE
            TO authenticated
            USING (
                auth.uid() = vendedor_id OR 
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'admin'
                )
            );
    END IF;
END$$;

-- Atualizar o cache do PostgREST para reconhecer as mudanças
NOTIFY pgrst, 'reload schema';
