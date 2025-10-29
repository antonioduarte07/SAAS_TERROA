import { useMemo } from 'react'
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Order, Client } from '@/types' // Importar tipos

// Definir uma interface local para as colunas da tabela de pedidos do cliente
interface ClientOrderColumn {
  id: keyof PedidoClienteView; // O id da coluna deve ser uma chave da interface PedidoClienteView
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center'; // Adicionar propriedade align
  format?: (value: unknown) => React.ReactNode; // Usar unknown aqui
}

// Definir uma interface para o tipo de Pedido retornado pela query com informações detalhadas
interface PedidoClienteView extends Order {
  client_name?: string;
  seller_id?: string;
  receipt_date?: string;
  payment_date?: string;
  discount?: number;
  discount_type?: string;
  updated_at?: string;
}

export default function ClientOrders() {
  const { user, isLoading: isLoadingUser } = useAuth(); // Obter usuário logado

  // Query para buscar o ID do cliente associado ao usuário logado
  const { data: clientData, isLoading: isLoadingClient, error: errorClient } = useQuery<Client[]> ({
    queryKey: ['clientForUser', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('clients')
        // Assumindo que a tabela clients tem uma coluna user_id ligada a auth.users(id)
        .select('id') // Buscar apenas o ID do cliente
        .eq('user_id', user.id)
        .single(); // Assumindo que cada usuário cliente está ligado a um único registro de cliente

      if (error) throw error;
      return [data as Client]; // Retornar como array para consistência, ou ajustar conforme necessário
    },
    enabled: !!user?.id, // Habilitar esta query apenas se o usuário estiver logado
  });

  const clientId = clientData?.[0]?.id; // Obter o ID do cliente

  // Query para buscar vendedores (apenas os que aparecem nos pedidos)
  const { data: sellersData } = useQuery({
    queryKey: ['sellers-for-orders'],
    queryFn: async () => {
      if (!clientId) return [];
      
      // Primeiro buscar os seller_ids dos pedidos do cliente
      const { data: ordersData } = await supabase
        .from('orders')
        .select('seller_id')
        .eq('client_id', clientId);
      
      if (!ordersData?.length) return [];
      
      const sellerIds = [...new Set(ordersData.map(o => o.seller_id))];
      
      // Buscar dados dos vendedores
      const { data: sellers } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', sellerIds);
      
      return sellers || [];
    },
    enabled: !!clientId,
  });

  // Query para buscar pedidos associados a este client_id
  const { data: orders, isLoading: isLoadingOrders, error: errorOrders } = useQuery<PedidoClienteView[]> ({
    queryKey: ['clientOrders', clientId],
    queryFn: async () => {
      if (!clientId) {
        console.log('❌ clientId não encontrado:', clientId);
        return [];
      }
      
      console.log('🔍 Buscando pedidos para clientId:', clientId);
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, 
          client_id, 
          seller_id,
          status, 
          total_amount, 
          final_amount, 
          discount,
          discount_type,
          created_at, 
          updated_at,
          notes,
          receipt_date,
          payment_date
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      console.log('📊 Resultado da query de pedidos:', { data, error });

      if (error) {
        console.error('❌ Erro ao buscar pedidos:', error);
        throw error;
      }
      
      console.log('✅ Pedidos encontrados:', data?.length || 0);
      // Mapear dados se precisar adicionar campos calculados ou formatar
      return data as PedidoClienteView[];
    },
    enabled: !!clientId, // Habilitar esta query apenas se o client_id estiver disponível
  });

   const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'Pendente'
      case 'processing':
        return 'Em Processamento'
      case 'completed':
        return 'Concluído'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

   const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'processing':
        return 'info'
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'error'
      default:
        return 'default'
    }
  }

  // Definir colunas visíveis para o cliente
  const columns: ClientOrderColumn[] = useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      align: 'left',
      format: (value: unknown) => {
        const status = value as Order['status'];
        return status ? (
          <Chip
            label={getStatusLabel(status)}
            color={getStatusColor(status)}
            size="small"
          />
        ) : null;
      },
    },
    {
      id: 'total_amount',
      label: 'Valor Original',
      minWidth: 120,
      align: 'right',
      format: (value: unknown) => {
        const totalAmount = value as number;
        return totalAmount !== undefined && totalAmount !== null ? `R$ ${Number(totalAmount).toFixed(2)}` : 'R$ 0.00';
      },
    },
    {
      id: 'discount',
      label: 'Desconto (%)',
      minWidth: 100,
      align: 'right',
      format: (value: unknown, row: any) => {
        const discount = value as number;
        if (discount && discount > 0) {
          return `${discount}%`;
        }
        return '-';
      },
    },
    {
      id: 'final_amount',
      label: 'Valor Final',
      minWidth: 120,
      align: 'right',
      format: (value: unknown) => {
        const finalAmount = value as number;
        return finalAmount !== undefined && finalAmount !== null ? `R$ ${Number(finalAmount).toFixed(2)}` : 'R$ 0.00';
      },
    },
    {
      id: 'seller_id',
      label: 'Vendedor',
      minWidth: 150,
      align: 'left',
      format: (value: unknown, row: any) => {
        const sellerId = value as string;
        const seller = sellersData?.find(s => s.id === sellerId);
        return seller?.name || 'Não informado';
      },
    },
    {
      id: 'created_at',
      label: 'Data do Pedido',
      minWidth: 120,
      align: 'left',
      format: (value: unknown) => {
        const createdAt = value as string;
        return createdAt ? new Date(createdAt).toLocaleDateString('pt-BR') : '-';
      },
    },
    {
      id: 'receipt_date',
      label: 'Data de Entrega',
      minWidth: 120,
      align: 'left',
      format: (value: unknown) => {
        const receiptDate = value as string;
        return receiptDate ? new Date(receiptDate).toLocaleDateString('pt-BR') : 'Não agendada';
      },
    },
    {
      id: 'payment_date',
      label: 'Data de Pagamento',
      minWidth: 120,
      align: 'left',
      format: (value: unknown) => {
        const paymentDate = value as string;
        return paymentDate ? new Date(paymentDate).toLocaleDateString('pt-BR') : 'Pendente';
      },
    },
    {
      id: 'notes',
      label: 'Observações',
      minWidth: 200,
      align: 'left',
      format: (value: unknown) => value as string || '-',
    }
  ], []); // As colunas são estáticas para esta view

  // Mapear os dados dos pedidos para o formato esperado pela tabela (se necessário formatação específica)
  const formattedOrders = useMemo(() => {
      return orders?.map(order => ({
        ...order,
        // Formatar campos adicionais aqui se necessário para exibição
        // Por exemplo, se quiser mostrar produtos do pedido, precisaria de mais uma query e formatação
      })) || [];
  }, [orders]); // Depende dos dados de orders

  if (isLoadingUser || isLoadingClient || isLoadingOrders) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorClient || errorOrders) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">Erro ao carregar pedidos: {(errorClient || errorOrders as Error).message}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Meus Pedidos</Typography>

       <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  style={{ minWidth: column.minWidth }}
                  align={column.align}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {formattedOrders.map((row) => {
              return (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                  {columns.map((column) => {
                    const value = row[column.id];
                    return (
                      <TableCell key={column.id} align={column.align}>
                        {column.format ? column.format(value) : value as string | number | undefined | null}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

       {/* Mensagem se não houver pedidos */}
      {formattedOrders.length === 0 && !isLoadingOrders && !errorOrders && (
         <Box sx={{ mt: 2 }}>
            <Typography>Nenhum pedido encontrado.</Typography>
         </Box>
      )}
    </Box>
  );
} 