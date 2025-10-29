import { useState, useEffect } from 'react'
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import type { Product, OrderItem } from '@/types'

export interface OrderItemFormProps {
  item?: OrderItem
  onUpdate: (item: OrderItem) => void
  onRemove: () => void
  products: Product[]
  showItemDiscount?: boolean;
}

export default function OrderItemForm({
  item,
  onUpdate,
  onRemove,
  products,
  showItemDiscount = false,
}: OrderItemFormProps) {
  const [hectares, setHectares] = useState(item?.hectares || 0);
  const [dosagem, setDosagem] = useState(item?.dosagem || 0);
  const [discountPercentage, setDiscountPercentage] = useState(item?.discount_percentage || 0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const quantidadeNecessaria = (hectares * dosagem) || 0;

  useEffect(() => {
    if (item?.product_id && products) {
      const product = products.find((p) => p.id === item.product_id)
      if (product) {
        setSelectedProduct(product)
      }
    }
  }, [item?.product_id, products])

  const handleProductChange = (productId: string) => {
    const product = products?.find((p) => p.id === productId)
    if (product) {
      onUpdate({
        ...(item && 'id' in item && { id: item.id }),
        product_id: product.id,
        quantity: quantidadeNecessaria,
        unit_price: product.price,
        total_price: product.price * quantidadeNecessaria,
        notes: item?.notes || '',
        hectares,
        dosagem,
        discount_percentage: discountPercentage,
      } as OrderItem)
    }
  }

  const handleOtherChange = () => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = event.target.value;
    onUpdate({
      ...(item && 'id' in item && { id: item.id }),
      product_id: item?.product_id,
      quantity: quantidadeNecessaria,
      unit_price: item?.unit_price,
      total_price: (item?.unit_price || 0) * quantidadeNecessaria,
      notes: value,
      hectares,
      dosagem,
      discount_percentage: discountPercentage,
    } as OrderItem)
  }

  const handleCalculationChange = (field: 'hectares' | 'dosagem' | 'discount_percentage') => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = Number(event.target.value) || 0;
    if (field === 'hectares') setHectares(value);
    else if (field === 'dosagem') setDosagem(value);
    else if (field === 'discount_percentage') setDiscountPercentage(value);

    if (selectedProduct) {
      onUpdate({
        ...(item && 'id' in item && { id: item.id }),
        product_id: selectedProduct.id,
        quantity: (field === 'hectares' || field === 'dosagem') ? value * dosagem : quantidadeNecessaria,
        unit_price: selectedProduct.price,
        total_price: selectedProduct.price * ((field === 'hectares' || field === 'dosagem') ? value * dosagem : quantidadeNecessaria),
        notes: item?.notes || '',
        hectares: field === 'hectares' ? value : hectares,
        dosagem: field === 'dosagem' ? value : dosagem,
        discount_percentage: field === 'discount_percentage' ? value : discountPercentage,
      } as OrderItem);
    }
  };

  useEffect(() => {
    if (selectedProduct) {
      const newQuantity = (hectares * dosagem) || 0;
      onUpdate({
        ...(item && 'id' in item && { id: item.id }),
        product_id: selectedProduct.id,
        quantity: newQuantity,
        unit_price: selectedProduct.price,
        total_price: selectedProduct.price * newQuantity,
        notes: item?.notes || '',
        hectares,
        dosagem,
        discount_percentage: discountPercentage,
      } as OrderItem);
    }
  }, [hectares, dosagem, selectedProduct, onUpdate, item, discountPercentage]);

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={showItemDiscount ? 3 : 4}>
          <FormControl fullWidth size="small">
            <InputLabel>Produto</InputLabel>
            <Select
              value={selectedProduct?.id || ''}
              label="Produto"
              onChange={(e) => handleProductChange(e.target.value)}
              required
            >
              {products?.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={showItemDiscount ? 1.5 : 2}>
          <TextField
            label="Estoque"
            type="number"
            fullWidth
            value={selectedProduct?.stock_quantity ?? ''}
            disabled
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        <Grid item xs={6} sm={showItemDiscount ? 1.5 : 2}>
          <TextField
            label="Hectares"
            type="number"
            fullWidth
            value={hectares}
            onChange={handleCalculationChange('hectares')}
            required
            inputProps={{ min: 0 }}
            size="small"
          />
        </Grid>

        <Grid item xs={6} sm={showItemDiscount ? 1.5 : 2}>
          <TextField
            label="Dosagem"
            type="number"
            fullWidth
            value={dosagem}
            onChange={handleCalculationChange('dosagem')}
            required
            inputProps={{ min: 0, step: 0.01 }}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={showItemDiscount ? 2 : 3}>
          <TextField
            label="Quant. Necessária"
            type="number"
            fullWidth
            value={quantidadeNecessaria}
            disabled
            size="small"
            InputProps={{
               endAdornment: selectedProduct?.unit || '',
            }}
          />
        </Grid>

        {showItemDiscount && (
           <Grid item xs={6} sm={1.5}>
             <TextField
               label="Desc. (%)"
               type="number"
               fullWidth
               value={discountPercentage}
               onChange={handleCalculationChange('discount_percentage')}
               inputProps={{ min: 0, max: 100, step: 0.01 }}
               size="small"
             />
           </Grid>
         )}

        <Grid item xs={12} sm={showItemDiscount ? 2 : 3}>
          <TextField
            label="Preço Unit."
            fullWidth
            value={(selectedProduct?.price || 0).toFixed(2)}
            disabled
            size="small"
            InputProps={{
              startAdornment: 'R$',
            }}
          />
        </Grid>

        <Grid item xs={12} sm={showItemDiscount ? 2 : 3}>
          <TextField
            label="Total Item"
            fullWidth
            value={(((selectedProduct?.price || 0) * quantidadeNecessaria) * (1 - (discountPercentage || 0) / 100) || 0).toFixed(2)}
            disabled
            size="small"
            InputProps={{
              startAdornment: 'R$',
            }}
          />
        </Grid>

        <Grid item xs={12} sm={1}>
          <IconButton
            color="error"
            onClick={onRemove}
            sx={{ mt: 1 }}
          >
            <DeleteIcon />
          </IconButton>
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Anotações do Item"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={item?.notes || ''}
            onChange={handleOtherChange()}
          />
        </Grid>
      </Grid>
    </Box>
  )
} 