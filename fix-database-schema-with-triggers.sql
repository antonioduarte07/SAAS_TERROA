-- Script para corrigir inconsistências no schema do banco (com triggers)
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Primeiro, vamos verificar e remover triggers que dependem das colunas
-- Remover trigger que depende da coluna status
DROP TRIGGER IF EXISTS update_stock_after_order_update ON public.orders;

-- 2. Agora podemos alterar os tipos das colunas
ALTER TABLE public.orders 
ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE public.orders 
ALTER COLUMN discount_type TYPE text USING discount_type::text;

ALTER TABLE public.products 
ALTER COLUMN category TYPE text USING category::text;

ALTER TABLE public.products 
ALTER COLUMN unit TYPE text USING unit::text;

ALTER TABLE public.commission_rules 
ALTER COLUMN product_category TYPE text USING product_category::text;

ALTER TABLE public.users 
ALTER COLUMN role TYPE text USING role::text;

-- 3. Remover constraints problemáticas
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;

ALTER TABLE public.clients 
DROP CONSTRAINT IF EXISTS clients_seller_id_fkey;

ALTER TABLE public.commission_rules 
DROP CONSTRAINT IF EXISTS commission_rules_seller_id_fkey;

ALTER TABLE public.commissions 
DROP CONSTRAINT IF EXISTS commissions_seller_id_fkey;

-- 4. Adicionar constraints corretas (apontando para profiles)
ALTER TABLE public.orders 
ADD CONSTRAINT orders_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.clients 
ADD CONSTRAINT clients_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.commission_rules 
ADD CONSTRAINT commission_rules_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.commissions 
ADD CONSTRAINT commissions_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 5. Garantir que a tabela orders tenha valores padrão corretos
ALTER TABLE public.orders 
ALTER COLUMN status SET DEFAULT 'pending';

-- 6. Recriar o trigger (se necessário)
-- Se você tinha um trigger para atualizar estoque, pode recriá-lo aqui:
-- CREATE OR REPLACE FUNCTION update_stock_after_order_update()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Sua lógica de atualização de estoque aqui
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER update_stock_after_order_update
--   AFTER UPDATE ON public.orders
--   FOR EACH ROW
--   EXECUTE FUNCTION update_stock_after_order_update();

-- 7. Atualizar o cache do PostgREST
NOTIFY pgrst, 'reload schema';
