-- Migração para adicionar múltiplos endereços para clientes

-- Remover a coluna de endereço existente da tabela clients (se existir e não for mais necessária)
-- ATENÇÃO: Isso vai APAGAR os dados de endereço existentes dos clientes. Faça um backup ou migre antes se precisar deles.
ALTER TABLE public.clients DROP COLUMN IF EXISTS address;
ALTER TABLE public.clients DROP COLUMN IF EXISTS city;
ALTER TABLE public.clients DROP COLUMN IF EXISTS state;
ALTER TABLE public.clients DROP COLUMN IF EXISTS zip_code;
ALTER TABLE public.clients DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.clients DROP COLUMN IF EXISTS longitude;

-- Criar a nova tabela para múltiplos endereços de cliente
CREATE TABLE public.client_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  street text NOT NULL,
  number text, -- Adicionar número, comum em endereços
  complement text, -- Adicionar complemento
  neighborhood text, -- Adicionar bairro
  city text NOT NULL,
  state text NOT NULL,
  zip_code text,
  latitude numeric,
  longitude numeric,
  notes text, -- Adicionar campo de observações para o endereço
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT client_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT client_addresses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE -- Quando um cliente é deletado, seus endereços também são
);

-- Adicionar chave estrangeira na tabela orders para referenciar o endereço de entrega selecionado
ALTER TABLE public.orders
ADD COLUMN client_address_id uuid;

ALTER TABLE public.orders
ADD CONSTRAINT orders_client_address_id_fkey FOREIGN KEY (client_address_id) REFERENCES public.client_addresses(id) ON DELETE SET NULL; -- Se um endereço for deletado, o campo no pedido fica NULL

-- Opcional: Adicionar uma coluna booleana para marcar um endereço como padrão, se desejar ter um
-- ALTER TABLE public.client_addresses
-- ADD COLUMN is_default boolean DEFAULT false;

-- Habilitar RLS na nova tabela client_addresses
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para client_addresses:

-- Permitir select/read para usuários autenticados que são admin, ou o vendedor do cliente, ou o próprio cliente (se o perfil for 'cliente')
CREATE POLICY "Enable read access for authenticated users based on client/seller/admin" ON public.client_addresses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_addresses.client_id
      AND (
        clients.user_id = auth.uid() -- O próprio cliente (se o perfil for 'cliente')
        OR clients.seller_id = auth.uid() -- O vendedor do cliente
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        ) -- É um admin
      )
    )
  );

-- Permitir insert para usuários autenticados que são admin, ou o vendedor do cliente, ou o próprio cliente
CREATE POLICY "Enable insert for authenticated users based on client/seller/admin" ON public.client_addresses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_addresses.client_id
      AND (
        clients.user_id = auth.uid()
        OR clients.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Permitir update para usuários autenticados que são admin, ou o vendedor do cliente, ou o próprio cliente
CREATE POLICY "Enable update for authenticated users based on client/seller/admin" ON public.client_addresses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_addresses.client_id
      AND (
        clients.user_id = auth.uid()
        OR clients.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_addresses.client_id
      AND (
        clients.user_id = auth.uid()
        OR clients.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Permitir delete para usuários autenticados que são admin, ou o vendedor do cliente, ou o próprio cliente
CREATE POLICY "Enable delete for authenticated users based on client/seller/admin" ON public.client_addresses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = client_addresses.client_id
      AND (
        clients.user_id = auth.uid()
        OR clients.seller_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

-- Atualizar o cache do PostgREST para reconhecer as novas tabelas e colunas
NOTIFY pgrst, 'reload schema'; 