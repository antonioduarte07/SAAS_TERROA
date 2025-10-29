import { Modal } from '@/components';
import { Box, Typography } from '@mui/material';
import type { Product } from '@/types';

interface ProductDetailsModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function ProductDetailsModal({
  open,
  onClose,
  product,
}: ProductDetailsModalProps) {
  if (!product) {
    return null; // Don't render if no product is selected
  }

  return (
    <Modal open={open} onClose={onClose} title="Detalhes do Produto">
      <Box sx={{ p: 2 }}>
        <Typography variant="h6">{product.name}</Typography>
        <Typography variant="body1"><strong>Segmento:</strong> {product.segmento}</Typography>
        <Typography variant="body1"><strong>Fornecedor:</strong> {product.fornecedor}</Typography>
        <Typography variant="body1"><strong>Unidade:</strong> {product.unit}</Typography>
        <Typography variant="body1"><strong>Preço:</strong> R$ {product.price !== undefined && product.price !== null ? Number(product.price).toFixed(2) : '0.00'}</Typography>
        <Typography variant="body1"><strong>Estoque:</strong> {product.stock_quantity}</Typography>
        {product.description && <Typography variant="body1"><strong>Descrição:</strong> {product.description}</Typography>}
      </Box>
    </Modal>
  );
} 