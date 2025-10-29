-- Adicionar chave estrangeira para products na tabela order_items
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_product
FOREIGN KEY (product_id)
REFERENCES products(id)
ON DELETE RESTRICT;

-- Adicionar chave estrangeira para orders na tabela order_items
ALTER TABLE order_items
ADD CONSTRAINT fk_order_items_order
FOREIGN KEY (order_id)
REFERENCES orders(id)
ON DELETE CASCADE;

-- Adicionar chave estrangeira para clients na tabela orders
ALTER TABLE orders
ADD CONSTRAINT fk_orders_client
FOREIGN KEY (client_id)
REFERENCES clients(id)
ON DELETE RESTRICT;

-- Adicionar chave estrangeira para profiles (seller) na tabela orders
ALTER TABLE orders
ADD CONSTRAINT fk_orders_seller
FOREIGN KEY (seller_id)
REFERENCES profiles(id)
ON DELETE RESTRICT; 