-- Primeiro, remover as constraints existentes se houver
ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS fk_order_items_product;

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS fk_order_items_order;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS fk_orders_client;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS fk_orders_seller;

-- Agora, adicionar as constraints novamente
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_product
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE RESTRICT;

ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_order
FOREIGN KEY (order_id)
REFERENCES orders(id)
ON DELETE CASCADE;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_client
FOREIGN KEY (client_id)
REFERENCES clients(id)
ON DELETE RESTRICT;

ALTER TABLE orders
ADD CONSTRAINT fk_orders_seller
FOREIGN KEY (seller_id)
REFERENCES profiles(id)
ON DELETE RESTRICT;

-- Atualizar o cache do PostgREST
NOTIFY pgrst, 'reload schema'; 