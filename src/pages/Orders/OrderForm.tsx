import { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Typography,
  Box,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { Form } from '@/components'
import type { Order, Product, Client, ClientAddress } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface OrderFormProps {
  initialData?: Partial<Order>
  onSubmit: (data: Partial<Order>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

interface OrderItemForm {
  product_id: string
  quantity: number // Agora será calculado
  unit_price: number
  total_price: number
  product?: Product // Pode vir da busca, mas não é uma coluna para inserção
  hectares: number // Tornar obrigatório se a quantidade depende deles
  dosagem: number // Tornar obrigatório se a quantidade depende deles
  discount_percentage?: number
  notes?: string // Adicionar campo de observações para o item
}

export default function OrderForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: OrderFormProps) {
  const { user, role } = useAuth()

  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'pending',
    notes: '',
    receipt_date: null,
    payment_date: null,
    discount: 0,
    discount_type: 'global',
    client_address_id: null, // Adicionar campo para endereço
    ...initialData,
  })

  const [items, setItems] = useState<OrderItemForm[]>(
    initialData?.items?.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      hectares: item.hectares || 0,
      dosagem: item.dosagem || 0,
      discount_percentage: item.discount_percentage || 0,
      notes: item.notes || '', // Incluir observações ao carregar dados
    })) || []
  )
  const [isGlobalDiscount, setIsGlobalDiscount] = useState(formData.discount_type === 'global')

  // Query para buscar produtos disponíveis
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]> ({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })

  // Query para buscar clientes com seus endereços
  const { data: clients, isLoading: isLoadingClients } = useQuery<Array<Client & { addresses: ClientAddress[] }>>({
    queryKey: ['clients', user?.id, role],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('clients')
        .select(`
          id,
          name,
          addresses:client_addresses(*)
        `)

      if (role === 'vendedor') {
        query = query.eq('seller_id', user.id)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Array<Client & { addresses: ClientAddress[] }>
    },
    enabled: !!user,
  })

  // Query para buscar vendedores (apenas para admin)
  const { data: sellers, isLoading: isLoadingSellers } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'vendedor')
        .order('name')

      if (error) throw error
      return data
    },
    enabled: role === 'admin', // Só busca vendedores se for admin
  })

  useEffect(() => {
      setFormData(initialData || {})
      setItems(initialData?.items?.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        hectares: item.hectares || 0,
        dosagem: item.dosagem || 0,
        discount_percentage: item.discount_percentage || 0,
        notes: item.notes || '', // Incluir observações ao carregar dados
      })) || [])
      setIsGlobalDiscount(initialData?.discount_type === 'global' || true) // Default to global if not set
  }, [initialData])

  const handleFormChange = <Field extends keyof Partial<Order>>(field: Field) => (
    event: SelectChangeEvent | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // Usando um tipo mais específico para o valor do evento
    let value: string | number | Date | null;
    const target = event.target;

    if ('value' in target) {
      value = target.value;
    } else {
      return; // Se não tiver value, sair
    }

    if (field === 'receipt_date' || field === 'payment_date') {
       value = value ? new Date(value as string).toISOString() : null;
           } else if (field === 'discount') {
               value = Number(value)
           } else if (field === 'client_id' || field === 'status' || field === 'notes' || field === 'client_address_id' || field === 'seller_id') {
               value = value as string
    } else {
        // Lidar com outros tipos de campo se necessário
        return;
    }

    // Se o cliente for alterado, limpar o endereço selecionado
    if (field === 'client_id') {
      setFormData(prev => ({ ...prev, [field]: value, client_address_id: null }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  }

  const handleItemChange = (index: number, field: keyof OrderItemForm, value: string | number) => {
    const newItems = [...items]
    const item = newItems[index]

    const updatedItem: OrderItemForm = {
      ...item,
      [field]: value, // Corrigido: removido 'as any'
    }

    // Atualizar unit_price ao mudar o product_id
    if (field === 'product_id') {
      const selectedProduct = products?.find(p => p.id === value);
      updatedItem.unit_price = selectedProduct?.price || 0;
    }

    // Recalcular quantity e total_price com base em hectares, dosagem e unit_price
    const hectares = field === 'hectares' ? Number(value) : updatedItem.hectares || 0;
    const dosagem = field === 'dosagem' ? Number(value) : updatedItem.dosagem || 0;
    const unit_price = updatedItem.unit_price || 0;
    const discount_percentage = field === 'discount_percentage' ? Number(value) : updatedItem.discount_percentage || 0;

    updatedItem.quantity = hectares * dosagem;
    updatedItem.total_price = (updatedItem.quantity || 0) * unit_price;

    if (!isGlobalDiscount && discount_percentage > 0) {
        updatedItem.total_price = updatedItem.total_price * (1 - discount_percentage / 100);
    }


    newItems[index] = updatedItem
    setItems(newItems)
  }

   const handleItemNotesChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      notes: value,
    };
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_id: '',
        quantity: 0, // Quantidade inicial 0, será calculada
        unit_price: 0,
        total_price: 0,
        hectares: 0,
        dosagem: 0,
        discount_percentage: 0,
        notes: '', // Adicionar campo de observações para o novo item
      } as OrderItemForm,
    ])
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  const calculateSubtotal = () => {
      return items.reduce((sum, item) => {
        const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
        const itemDiscountAmount = isGlobalDiscount ? 0 : itemSubtotal * ((item.discount_percentage || 0) / 100);
        return sum + (itemSubtotal - itemDiscountAmount);
      }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const globalDiscountPercentage = isGlobalDiscount ? (Number(formData.discount) || 0) : 0;
    const discountAmount = subtotal * (globalDiscountPercentage / 100);
    return Number(subtotal - discountAmount) || 0;
  }

  const handleSubmit = async () => {
    // Construir o objeto com apenas as colunas da tabela orders, excluindo 'client' e 'items'
    const orderDataToSubmit: Partial<Omit<Order, 'client' | 'items'>> & { items?: OrderItemForm[] } = {
      // Só incluir ID se estiver editando (não para criação)
      ...(formData.id && { id: formData.id }),
      client_id: formData.client_id,
      seller_id: formData.seller_id,
      status: formData.status,
      total_amount: calculateSubtotal(), // Usar o total calculado
      discount: isGlobalDiscount ? (Number(formData.discount) || 0) : 0,
      final_amount: calculateTotal(), // Usar o total final calculado
      notes: formData.notes,
      receipt_date: formData.receipt_date,
      payment_date: formData.payment_date,
      discount_type: isGlobalDiscount ? 'global' : 'item',
      client_address_id: formData.client_address_id,
      // Outras colunas diretas da tabela orders podem ser adicionadas aqui
      items: items.map(item => ({ // Incluir os itens para que a mutação em index.tsx possa processá-los
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        hectares: item.hectares || 0,
        dosagem: item.dosagem || 0,
        discount_percentage: isGlobalDiscount ? 0 : item.discount_percentage || 0,
        notes: item.notes || '',
        // Não incluir 'product' aqui. A mutação em index.tsx já filtra outras propriedades.
      })),
    };

    await onSubmit(orderDataToSubmit);
  }

  useEffect(() => {
      setFormData((prev) => ({
        ...prev,
        total_amount: calculateSubtotal(),
        final_amount: calculateTotal(),
        discount: isGlobalDiscount ? (Number(prev.discount) || 0) : 0,
        discount_type: isGlobalDiscount ? 'global' : 'item',
      }));
  }, [items, formData.discount, isGlobalDiscount]); // Depende dos itens, desconto global e tipo de desconto


  return (
    <Form
      title={initialData ? 'Editar Pedido' : 'Novo Pedido'}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
    >
      <Grid container spacing={2}>
         <Grid item xs={12} sm={6}>
           <FormControl fullWidth>
             <InputLabel>Cliente</InputLabel>
             <Select
               value={formData.client_id || ''}
               label="Cliente"
               onChange={handleFormChange('client_id')}
               required
               disabled={isLoadingClients}
             >
               {isLoadingClients ? (
                 <MenuItem disabled>Carregando clientes...</MenuItem>
               ) : (
                 clients?.map((client) => (
                   <MenuItem key={client.id} value={client.id}>
                     {client.name}
                   </MenuItem>
                 ))
               )}
             </Select>
           </FormControl>
         </Grid>

         {/* Campo de seleção de vendedor - apenas para admin */}
         {role === 'admin' && (
           <Grid item xs={12} sm={6}>
             <FormControl fullWidth>
               <InputLabel>Vendedor</InputLabel>
               <Select
                 value={formData.seller_id || ''}
                 label="Vendedor"
                 onChange={handleFormChange('seller_id')}
                 disabled={isLoadingSellers}
               >
                 {isLoadingSellers ? (
                   <MenuItem disabled>Carregando vendedores...</MenuItem>
                 ) : (
                   sellers?.map((seller) => (
                     <MenuItem key={seller.id} value={seller.id}>
                       {seller.name}
                     </MenuItem>
                   ))
                 )}
               </Select>
             </FormControl>
           </Grid>
         )}

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Endereço de Entrega</InputLabel>
            <Select
              value={formData.client_address_id || ''}
              label="Endereço de Entrega"
              onChange={handleFormChange('client_address_id')}
              required
              disabled={!formData.client_id} // Desabilitar se não houver cliente selecionado
            >
              {clients
                ?.find(client => client.id === formData.client_id)
                ?.addresses.map((address) => (
                  <MenuItem key={address.id} value={address.id}>
                    {`${address.street}, ${address.number || 'S/N'}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood || ''}, ${address.city}-${address.state}`}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status}
              label="Status"
              onChange={handleFormChange('status')}
              required
            >
              <MenuItem value="pending">Pendente</MenuItem>
              <MenuItem value="processing">Em Processamento</MenuItem>
              <MenuItem value="delivered">Entregue</MenuItem>
              <MenuItem value="cancelled">Cancelado</MenuItem>
            </Select>
          </FormControl>
        </Grid>

         <Grid item xs={12} sm={6}>
           <TextField
             label="Data de Entrega"
             type="date"
             fullWidth
             InputLabelProps={{ shrink: true }}
             value={formData.receipt_date ? new Date(formData.receipt_date).toISOString().split('T')[0] : ''}
             onChange={handleFormChange('receipt_date')}
           />
         </Grid>

         <Grid item xs={12} sm={6}>
           <TextField
             label="Data de Pagamento"
             type="date"
             fullWidth
             InputLabelProps={{ shrink: true }}
             value={formData.payment_date ? new Date(formData.payment_date).toISOString().split('T')[0] : ''}
             onChange={handleFormChange('payment_date')}
           />
         </Grid>

        <Grid item xs={12}>
          <TextField
            label="Observações do Pedido"
            fullWidth
            multiline
            rows={3}
            value={formData.notes}
            onChange={handleFormChange('notes')}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Itens do Pedido</Typography>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              variant="contained"
              size="small"
            >
              Adicionar Item
            </Button>
          </Box>

          <Box>
            {items.map((item, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: '4px' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6}>
                     <FormControl fullWidth size="small">
                       <InputLabel>Produto</InputLabel>
                       <Select
                         value={item.product_id}
                         label="Produto"
                         onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                         required
                         disabled={isLoadingProducts}
                       >
                         {isLoadingProducts ? (
                           <MenuItem disabled>Carregando produtos...</MenuItem>
                         ) : (
                           products?.map((product) => (
                             <MenuItem key={product.id} value={product.id}>
                               {product.name}
                             </MenuItem>
                           ))
                         )}
                       </Select>
                     </FormControl>
                  </Grid>

                   <Grid item xs={12} sm={6}>
                      <TextField
                         label="Quantidade Calculada"
                         fullWidth
                         size="small"
                         value={item.quantity.toFixed(2) || '0.00'}
                         InputProps={{
                           readOnly: true,
                         }}
                      />
                   </Grid>

                   <Grid item xs={12} sm={4}>
                     <TextField
                       label="Hectares"
                       type="number"
                       fullWidth
                       size="small"
                       value={item.hectares}
                       onChange={(e) => handleItemChange(index, 'hectares', Number(e.target.value))}
                       inputProps={{ min: 0, step: 0.01 }}
                     />
                   </Grid>

                   <Grid item xs={12} sm={4}>
                     <TextField
                       label="Dosagem"
                       type="number"
                       fullWidth
                       size="small"
                       value={item.dosagem}
                       onChange={(e) => handleItemChange(index, 'dosagem', Number(e.target.value))}
                       inputProps={{ min: 0, step: 0.01 }}
                     />
                   </Grid>

                   <Grid item xs={12} sm={4}>
                     <TextField
                       label="Preço Unitário"
                       type="number"
                       fullWidth
                       size="small"
                       value={item.unit_price.toFixed(2)}
                       onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                       inputProps={{ min: 0, step: 0.01 }}
                       required
                       disabled // Preço deve vir do produto, não ser editado aqui
                     />
                   </Grid>

                   {!isGlobalDiscount && (
                      <Grid item xs={12} sm={4}>
                          <TextField
                              label="Desconto (%)"
                              type="number"
                              fullWidth
                              size="small"
                              value={item.discount_percentage}
                              onChange={(e) => handleItemChange(index, 'discount_percentage', Number(e.target.value))}
                              inputProps={{ min: 0, max: 100, step: 0.01 }}
                          />
                      </Grid>
                   )}

                   <Grid item xs={12} sm={!isGlobalDiscount ? 8 : 12}>
                       <TextField
                          label="Observações do Item"
                          fullWidth
                          multiline
                          rows={1}
                          size="small"
                          value={item.notes}
                          onChange={(e) => handleItemNotesChange(index, e.target.value)}
                       />
                    </Grid>

                  <Grid item xs={12} sm={!isGlobalDiscount ? 4 : 6} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                     <Typography variant="subtitle1" sx={{ mr: 2 }}>
                       Subtotal: R$ {item.total_price.toFixed(2)}
                     </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveItem(index)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                  </Grid>

                </Grid>
              </Box>
            ))}

          </Box>

           <Box sx={{ mt: 3, p: 2, border: '1px solid #ccc', borderRadius: '4px', textAlign: 'right' }}>
              <Typography variant="subtitle1">Subtotal dos Itens: R$ {calculateSubtotal().toFixed(2)}</Typography>

               <FormControlLabel
                 control={
                   <Switch
                     checked={isGlobalDiscount}
                     onChange={() => setIsGlobalDiscount(!isGlobalDiscount)}
                   />
                 }
                 label="Aplicar Desconto Geral (%)?"
               />

              {isGlobalDiscount && (
                <TextField
                   label="Desconto Geral (%)"
                   type="number"
                   value={formData.discount}
                   onChange={handleFormChange('discount')}
                   inputProps={{ min: 0, max: 100, step: 0.01 }}
                   sx={{ width: 150, ml: 2 }}
                   size="small"
                />
              )}

               <Typography variant="h6" sx={{ mt: 1 }}>
                 Total Final: R$ {calculateTotal().toFixed(2)}
               </Typography>
           </Box>

        </Grid>
      </Grid>
    </Form>
  )
}