import { useState } from 'react'
import {
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import { Form } from '@/components'
import type { Product } from '@/types'

interface ProductFormProps {
  initialData?: Partial<Product>
  onSubmit: (data: Partial<Product>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    category: 'seeds',
    unit: 'bag',
    price: 0,
    stock_quantity: 0,
    ...initialData,
  })

  const handleChange = (field: keyof Product) => (
    event: React.ChangeEvent<HTMLInputElement | { value: unknown }>
  ) => {
    const value = event.target.value
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'price' || field === 'stock_quantity'
        ? Number(value)
        : value,
    }))
  }

  const handleSubmit = async () => {
    await onSubmit(formData)
  }

  return (
    <Form
      title={initialData ? 'Editar Produto' : 'Novo Produto'}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Nome"
            fullWidth
            value={formData.name}
            onChange={handleChange('name')}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            label="Descrição"
            fullWidth
            multiline
            rows={3}
            value={formData.description}
            onChange={handleChange('description')}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Categoria</InputLabel>
            <Select
              value={formData.category}
              label="Categoria"
              onChange={handleChange('category')}
              required
            >
              <MenuItem value="seeds">Sementes</MenuItem>
              <MenuItem value="fertilizers">Fertilizantes</MenuItem>
              <MenuItem value="pesticides">Defensivos</MenuItem>
              <MenuItem value="machinery">Maquinário</MenuItem>
              <MenuItem value="other">Outros</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Unidade</InputLabel>
            <Select
              value={formData.unit}
              label="Unidade"
              onChange={handleChange('unit')}
              required
            >
              <MenuItem value="bag">Saco</MenuItem>
              <MenuItem value="liter">Litro</MenuItem>
              <MenuItem value="ton">Tonelada</MenuItem>
              <MenuItem value="box">Caixa</MenuItem>
              <MenuItem value="unit">Unidade</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Preço"
            type="number"
            fullWidth
            value={formData.price}
            onChange={handleChange('price')}
            required
            InputProps={{
              startAdornment: 'R$',
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Quantidade em Estoque"
            type="number"
            fullWidth
            value={formData.stock_quantity}
            onChange={handleChange('stock_quantity')}
            required
          />
        </Grid>
      </Grid>
    </Form>
  )
} 