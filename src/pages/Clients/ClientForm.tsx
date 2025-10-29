import { useState, useEffect } from 'react'
import {
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  IconButton,
  Box,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material'
import { Form } from '@/components'
import type { Client, ClientAddress } from '@/types'

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (data: Partial<Client> & { addresses?: ClientAddressFormState[] }) => Promise<void>;
  onCancel: () => void
  isLoading?: boolean
}

export interface ClientAddressFormState extends Omit<ClientAddress, 'id' | 'client_id' | 'created_at'> {
  id?: string | null;
  client_id?: string;
}

export default function ClientForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClientFormProps) {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '',
    type: 'individual',
    cpf_cnpj: '',
    email: '',
    phone: '',
    ...initialData,
  })

  const [clientAddresses, setClientAddresses] = useState<ClientAddressFormState[]>((initialData?.addresses || []) as ClientAddressFormState[])

  useEffect(() => {
    const { addresses, ...clientData } = initialData || {};
    setFormData(clientData);
    setClientAddresses((addresses || []) as ClientAddressFormState[]);
  }, [initialData]);

  console.log('Estado inicial dos endereços (depuração):', clientAddresses); // Log para depuração

  const handleChange = (field: keyof Partial<Client>, value: string | number | Date | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddressChange = (index: number, field: keyof ClientAddressFormState, value: string | number | null) => {
    const newAddresses = [...clientAddresses];
    newAddresses[index] = {
      ...newAddresses[index],
      [field]: value,
    };
    setClientAddresses(newAddresses);
  };

  const handleAddAddress = () => {
    setClientAddresses([
      ...clientAddresses,
      {
        street: '', city: '', state: '',
      } as ClientAddressFormState,
    ]);
  };

  const handleRemoveAddress = (index: number) => {
    setClientAddresses(clientAddresses.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const dataToSubmit: Partial<Client> & { addresses?: ClientAddressFormState[] } = {
      ...formData,
      addresses: clientAddresses,
    };

    console.log('Dados a serem submetidos (depuração):', dataToSubmit); // Log para depuração

    await onSubmit(dataToSubmit);
  }

  return (
    <Form
      title={initialData ? 'Editar Cliente' : 'Novo Cliente'}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      isLoading={isLoading}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            label="Nome"
            fullWidth
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={formData.type || 'individual'}
              label="Tipo"
              onChange={(e) => handleChange('type', e.target.value)}
              required
            >
              <MenuItem value="individual">Pessoa Física</MenuItem>
              <MenuItem value="company">Pessoa Jurídica</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label={formData.type === 'individual' ? 'CPF' : 'CNPJ'}
            fullWidth
            value={formData.cpf_cnpj || ''}
            onChange={(e) => handleChange('cpf_cnpj', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Telefone"
            fullWidth
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mt: 2, mb: 2, border: '1px solid #ccc', p: 2, borderRadius: '4px' }}>
            <Typography variant="h6" gutterBottom>Endereços</Typography>

            {clientAddresses.map((address, index) => (
              <Box key={address.id || index} sx={{ mb: 2, p: 2, border: '1px dashed #ddd', borderRadius: '4px' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Rua"
                      fullWidth
                      value={address.street || ''}
                      onChange={(e) => handleAddressChange(index, 'street', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                     <TextField label="Número" fullWidth value={address.number || ''} onChange={(e) => handleAddressChange(index, 'number', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                     <TextField label="Complemento" fullWidth value={address.complement || ''} onChange={(e) => handleAddressChange(index, 'complement', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                     <TextField label="Bairro" fullWidth value={address.neighborhood || ''} onChange={(e) => handleAddressChange(index, 'neighborhood', e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Cidade"
                      fullWidth
                      value={address.city || ''}
                      onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Estado"
                      fullWidth
                      value={address.state || ''}
                      onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                      <TextField label="CEP" fullWidth value={address.zip_code || ''} onChange={(e) => handleAddressChange(index, 'zip_code', e.target.value)} />
                  </Grid>
                   <Grid item xs={12}>
                      <TextField label="Observações do Endereço" fullWidth multiline rows={2} value={address.notes || ''} onChange={(e) => handleAddressChange(index, 'notes', e.target.value)} />
                   </Grid>
                  <Grid item xs={12} sx={{ textAlign: 'right' }}>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAddress(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            ))}

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddAddress}
              size="small"
            >
              Adicionar Endereço
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Form>
  )
} 