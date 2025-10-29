import { useState, useMemo } from 'react'
import {
  Box,
  Button,
  IconButton,
  Typography,
  Chip,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { supabase } from '@/lib/supabase'
import { Table, Modal, ConfirmDialog, BackupStatus } from '@/components'
import type { Column } from '@/components/Table'
import type { Order } from '@/types'
import OrderForm from './OrderForm'
import OrderPDF from './OrderPDF'
import { useApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

// Definir um tipo para os dados dos itens do pedido que serão inseridos
type OrderItemInsert = {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string | null;
  hectares?: number | null;
  dosagem?: number | null;
  discount_percentage?: number | null;
};

export default function Orders() {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const queryClient = useQueryClient()
  const { handleError, handleSuccess } = useApi()
  const { user, role } = useAuth()

  const { data: orders = { data: [], count: 0 }, isLoading } = useQuery({
    queryKey: ['orders', user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          client:clients!orders_client_id_fkey(*),
          items:order_items!order_items_order_id_fkey(*, product:products!fk_order_items_product(*))
        `, { count: 'exact' })
        .order('created_at', { ascending: false })

      if (role === 'vendedor' && user?.id) {
        query = query.eq('seller_id', user.id)
      }

      const { data, error, count } = await query
      if (error) {
        console.error('Erro ao buscar pedidos:', error)
        throw error
      }
      return { data: data as Order[], count }
    },
  })

  const dataForTable = useMemo(() => {
    return orders.data.map(order => ({
      ...order,
      client_name: order.client?.name || 'Cliente Desconhecido',
      formatted_discount: order.discount_type === 'global'
        ? `${Number(order.discount).toFixed(2) || 0}%`
        : `R$ ${Number(order.discount).toFixed(2) || 0}`,
      actions: order,
    })) as Record<string, unknown>[]
  }, [orders.data])

  const createMutation = useMutation({
    mutationFn: async (newOrder: Partial<Order>) => {
      console.log('Iniciando criação do pedido:', newOrder)
      const { items, id, ...orderData } = newOrder // Remover id e items

      // Garantir que apenas os campos necessários sejam enviados
      const orderDataToInsert = {
        client_id: orderData.client_id,
        status: orderData.status || 'pending',
        total_amount: orderData.total_amount || 0,
        discount: orderData.discount || 0,
        final_amount: orderData.final_amount || 0,
        notes: orderData.notes || null,
        receipt_date: orderData.receipt_date || null,
        payment_date: orderData.payment_date || null,
        discount_type: orderData.discount_type || 'global',
        client_address_id: orderData.client_address_id || null,
        // Lógica para seller_id:
        // - Se for vendedor: usar o próprio ID
        // - Se for admin: usar o seller_id selecionado no formulário
        // - Se não houver seller_id e for admin: usar o próprio ID como fallback
        seller_id: role === 'vendedor' && user?.id 
          ? user.id 
          : orderData.seller_id || user?.id
      }

      console.log('Dados do pedido para inserção:', orderDataToInsert)
      console.log('Role do usuário:', role)
      console.log('ID do usuário:', user?.id)

      let createdOrder;
      try {
        console.log('Tentando inserir pedido no banco...')
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([orderDataToInsert])
          .select()
          .single()

        if (orderError) {
          console.error('Erro ao criar pedido:', orderError)
          throw orderError
        }

        console.log('Pedido criado com sucesso:', order)
        createdOrder = order

        if (items && items.length > 0) {
          console.log('Inserindo itens do pedido:', items)
          const orderItems = items.map((item) => ({
            ...item,
            order_id: order.id,
          }))

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems)

          if (itemsError) {
            console.error('Erro ao inserir itens:', itemsError)
            // Se houver erro na inserção dos itens, excluir o pedido criado
            await supabase
              .from('orders')
              .delete()
              .eq('id', order.id)
            throw itemsError
          }
          console.log('Itens inseridos com sucesso')
        }

        return order
      } catch (error) {
        console.error('Erro capturado no try/catch:', error)
        // Se houver qualquer erro e o pedido foi criado, tentar excluí-lo
        if (createdOrder) {
          console.log('Tentando excluir pedido após erro:', createdOrder.id)
          await supabase
            .from('orders')
            .delete()
            .eq('id', createdOrder.id)
        }
        throw error
      }
    },
    onSuccess: () => {
      console.log('Pedido criado com sucesso - onSuccess')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsFormOpen(false)
      handleSuccess('Pedido criado com sucesso!')
    },
    onError: (error) => {
      console.error('Erro na mutação - onError:', error)
      handleError(error)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedOrderPayload: Partial<Order>) => {
      console.log('Iniciando atualização do pedido com payload:', updatedOrderPayload);

      // Construir explicitamente o objeto com APENAS as colunas da tabela orders
      const orderDataToUpdate = {
        id: updatedOrderPayload.id,
        client_id: updatedOrderPayload.client_id,
        seller_id: updatedOrderPayload.seller_id,
        status: updatedOrderPayload.status,
        total_amount: updatedOrderPayload.total_amount,
        discount: updatedOrderPayload.discount,
        final_amount: updatedOrderPayload.final_amount,
        notes: updatedOrderPayload.notes,
        receipt_date: updatedOrderPayload.receipt_date,
        payment_date: updatedOrderPayload.payment_date,
        discount_type: updatedOrderPayload.discount_type,
        // Adicionar outras colunas diretas de orders aqui, se houver
      };

      console.log('Dados do pedido para atualização (orderDataToUpdate - explicitamente construído):', orderDataToUpdate);

      if (role === 'vendedor' && orderDataToUpdate.seller_id !== user?.id) {
         console.warn('Vendedor tentou alterar seller_id de um pedido.');
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update(orderDataToUpdate)
        .eq('id', updatedOrderPayload.id);

      if (orderError) {
        console.error('Erro ao atualizar pedido principal:', orderError);
        throw orderError;
      }

      console.log('Pedido principal atualizado com sucesso.');

      // Tratar os itens separadamente, como já estamos fazendo
      const updatedItems = updatedOrderPayload.items; // Pegar os itens do payload original

      if (updatedItems !== undefined) { // Verificar se 'items' foi passado no payload
        console.log('Atualizando itens do pedido...');
        // Remover itens existentes antes de inserir os novos
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', updatedOrderPayload.id);

        if (deleteError) {
          console.error('Erro ao deletar itens antigos:', deleteError);
          throw deleteError;
        }
        console.log('Itens antigos deletados com sucesso.');

        if (updatedItems.length > 0) { // Inserir apenas se houver itens no payload
           const orderItemsToInsert: OrderItemInsert[] = updatedItems.map((item) => {
             // Criar um novo objeto apenas com as colunas que existem na tabela order_items
             // Garantir que apenas as colunas válidas sejam incluídas e no formato correto
             return {
               order_id: updatedOrderPayload.id as string,
               product_id: item.product_id as string,
               quantity: item.quantity as number,
               unit_price: item.unit_price as number,
               total_price: item.total_price as number,
               notes: item.notes || null,
               hectares: item.hectares || null,
               dosagem: item.dosagem || null,
               discount_percentage: item.discount_percentage || null,
               // Não incluir 'id' nem 'product' nem 'created_at' que vêm da busca
             };
           });

           console.log('Itens para inserir (filtrados, mapeados para colunas e tipados):', orderItemsToInsert);

           const { error: itemsError } = await supabase
             .from('order_items')
             .insert(orderItemsToInsert);

           if (itemsError) {
             console.error('Erro ao inserir itens novos:', itemsError);
             throw itemsError;
           }
           console.log('Itens novos inseridos com sucesso.');
        } else {
          console.log('Nenhum item para inserir.');
        }
      } else {
        console.log('Lista de itens não fornecida no payload de atualização.');
      }

      // Retornar o payload original para manter o fluxo onSuccess/onError
      return updatedOrderPayload;
    },
    onSuccess: () => {
      console.log('Pedido atualizado com sucesso - onSuccess');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsFormOpen(false);
      handleSuccess('Pedido atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro na mutação de atualização - onError:', error);
      handleError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (orderId: string) => {
       console.log('Excluindo pedido:', orderId)
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId)

      if (itemsError) throw itemsError

      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (orderError) throw orderError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsDeleteDialogOpen(false)
      handleSuccess('Pedido excluído com sucesso!')
    },
    onError: (error) => {
      handleError(error)
    },
  })

  const handleCreate = () => {
    setSelectedOrder(null)
    setIsFormOpen(true)
  }

  const handleEdit = async (order: Order) => {
    // Buscar os itens do pedido
    const { data: orderItems, error } = await supabase
      .from('order_items')
      .select('*, product:products(*)')
      .eq('order_id', order.id)

    if (error) {
      console.error('Erro ao buscar itens do pedido:', error)
      handleError(error)
      return
    }

    // Atualizar o pedido com os itens
    const orderWithItems = {
      ...order,
      items: orderItems
    }

    setSelectedOrder(orderWithItems)
    setIsFormOpen(true)
  }

  const handleDelete = (order: Order) => {
    setSelectedOrder(order)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (data: Partial<Order>) => {
    try {
      if (selectedOrder) {
        await updateMutation.mutateAsync({ ...data, id: selectedOrder.id })
      } else {
        await createMutation.mutateAsync(data)
      }
    } catch (error) {
      console.error('Erro no handleSubmit:', error)
      handleError(error)
    }
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'processing':
        return 'info'
      case 'delivered':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Pendente'
      case 'processing':
        return 'Em Processamento'
      case 'delivered':
        return 'Entregue'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const columns: Column[] = [
    {
      id: 'status',
      label: 'Status',
      minWidth: 130,
      format: (value: unknown) => {
        const status = value as Order['status']
        return status ? (
          <Chip
            label={getStatusLabel(status)}
            color={getStatusColor(status)}
            size="small"
          />
        ) : null
      },
    },
    {
      id: 'client_name',
      label: 'Cliente',
      minWidth: 170,
      format: (value: unknown) => {
        return value as string
      },
    },
    {
      id: 'total_amount',
      label: 'Total',
      minWidth: 130,
      format: (value: unknown) => {
        const totalAmount = value as number
        return totalAmount !== undefined && totalAmount !== null ? `R$ ${Number(totalAmount).toFixed(2)}` : 'R$ 0.00'
      },
    },
    {
      id: 'discount',
      label: 'Desconto',
      minWidth: 130,
      format: (value: unknown) => {
        return value as string
      },
    },
    {
      id: 'final_amount',
      label: 'Total Final',
      minWidth: 130,
      format: (value: unknown) => {
        const finalAmount = value as number
        return finalAmount !== undefined && finalAmount !== null ? `R$ ${Number(finalAmount).toFixed(2)}` : 'R$ 0.00'
      },
    },
    {
      id: 'created_at',
      label: 'Data Criação',
      minWidth: 130,
      format: (value: unknown) => {
        const createdAt = value as string
        return createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : 'Data Inválida'
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      minWidth: 100,
      format: (value: unknown) => {
        const order = value as Order
        if (!order) return null
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => handleEdit(order)}
              sx={{ mr: 1 }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(order)}
              color="error"
              disabled={deleteMutation.isPending}
            >
              <DeleteIcon />
            </IconButton>
            <PDFDownloadLink
              document={<OrderPDF order={order} />}
              fileName={`pedido_${order.id.slice(0, 8)}.pdf`}
            >
              {({ loading }) => (
                <IconButton size="small" disabled={loading}>
                  <PdfIcon />
                </IconButton>
              )}
            </PDFDownloadLink>
          </Box>
        )
      },
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Pedidos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Novo Pedido
        </Button>
      </Box>

      <BackupStatus />

      <Table
        title="Lista de Pedidos"
        columns={columns}
        data={dataForTable}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={orders.count || 0}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        isLoading={isLoading}
      />

      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedOrder ? 'Editar Pedido' : 'Novo Pedido'}
        maxWidth="md"
        fullWidth
      >
        <OrderForm
          initialData={selectedOrder || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => selectedOrder && deleteMutation.mutateAsync(selectedOrder.id)}
        title="Excluir Pedido"
        message={`Tem certeza que deseja excluir o pedido "${selectedOrder?.id.slice(0, 8)}"?`}
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </Box>
  )
} 