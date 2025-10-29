-- Limpar chaves estrangeiras duplicadas e garantir consistência

-- Remover chave estrangeira duplicada em order_items para orders
ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_order;

-- Remover chaves estrangeiras duplicadas em orders para clients
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS fk_orders_client;

-- Remover chaves estrangeiras duplicadas/alternativas em orders para profiles (seller/vendedor)
-- Manter 'orders_seller_id_fkey' pois é a usada na query
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_vendedor_id_fkey;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS fk_orders_seller;

-- Garantir que as chaves estrangeiras principais existam (adicionar caso tenham sido acidentalmente removidas ou renomeadas antes)
-- Nota: Baseado no schema fornecido, a maioria já existe. Esta seção é mais uma garantia.

-- Verifica e adiciona fk_order_items_product se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_order_items_product'
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items ADD CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;
    END IF;
END$$;

-- Verifica e adiciona order_items_order_id_fkey se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'order_items_order_id_fkey'
        AND table_name = 'order_items'
    ) THEN
        ALTER TABLE public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
    END IF;
END$$;

-- Verifica e adiciona orders_client_id_fkey se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_client_id_fkey'
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;
    END IF;
END$$;

-- Verifica e adiciona orders_seller_id_fkey se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_seller_id_fkey'
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;
    END IF;
END$$;

-- Atualizar o cache do PostgREST
NOTIFY pgrst, 'reload schema'; 