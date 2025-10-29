import { useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Table, Modal, ConfirmDialog, BackupStatus } from '@/components'
import type { Product } from '@/types'
import ProductForm from './ProductForm'
import { useApi } from '@/lib/api'
import ProductDetailsModal from '@/components/ProductDetailsModal'

export default function Products() {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { handleError } = useApi()

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', page, rowsPerPage],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('products')
        .select('id, name, description, category, segmento, fornecedor, unit, price, stock_quantity, is_active, created_at, updated_at', { count: 'exact' })
        .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1)
        .order('name', { ascending: true })

      if (error) {
        console.error('Erro ao carregar produtos:', error)
        handleError(error)
        throw error
      }

      console.log('Primeiro produto retornado pela query:', data?.[0]);

      return { data: data as Product[], count: count || 0 }
    },
  })

  const createMutation = useMutation({
    mutationFn: async (newProduct: Partial<Product>) => {
      const { error } = await supabase
        .from('products')
        .insert([newProduct])

      if (error) {
        handleError(error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
    },
    onError: (error) => {
      handleError(error)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedProduct: Partial<Product>) => {
      const { error } = await supabase
        .from('products')
        .update(updatedProduct)
        .eq('id', updatedProduct.id)

      if (error) {
        handleError(error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsFormOpen(false)
    },
    onError: (error) => {
      handleError(error)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (error) {
        handleError(error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsDeleteDialogOpen(false)
    },
    onError: (error) => {
      handleError(error)
    }
  })

  const handleCreate = () => {
    setSelectedProduct(null)
    setIsFormOpen(true)
  }

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsFormOpen(true)
  }

  const handleDelete = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (data: Partial<Product>) => {
    if (selectedProduct) {
      await updateMutation.mutateAsync({ ...data, id: selectedProduct.id })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailsModalOpen(true);
  };

  const columns = [
    { id: 'name', label: 'Nome', minWidth: 170 },
    { id: 'fornecedor', label: 'Fornecedor', minWidth: 130 },
    {
      id: 'stock_quantity',
      label: 'Estoque',
      minWidth: 100,
    },
    {
      id: 'actions',
      label: 'Ações',
      minWidth: 100,
      format: (value: unknown) => {
        const product = value as Product;
        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => handleEdit(product)}
              sx={{ mr: 1 }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => handleDelete(product)}
              color="error"
              disabled={deleteMutation.isPending}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      },
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Produtos</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Novo Produto
        </Button>
      </Box>

      <BackupStatus />

      <Table
        title="Lista de Produtos"
        columns={columns}
        data={products?.data?.map(product => ({ ...product, actions: product })) || []}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={products?.count || 0}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedProduct ? 'Editar Produto' : 'Novo Produto'}
      >
        <ProductForm
          initialData={selectedProduct || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      <ProductDetailsModal
        open={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        product={selectedProduct}
      />

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => selectedProduct && deleteMutation.mutateAsync(selectedProduct.id)}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir o produto "${selectedProduct?.name}"?`}
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </Box>
  )
} 