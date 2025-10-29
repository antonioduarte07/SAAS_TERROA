import { useState } from 'react'
import {
  Box,
  Button,
  IconButton,
  Typography,
} from '@mui/material'
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Table, Modal, ConfirmDialog, BackupStatus } from '@/components'
import type { Client } from '@/types'
import ClientForm, { ClientAddressFormState } from './ClientForm'
import { useAuth } from '@/contexts/AuthContext'

export default function Clients() {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const queryClient = useQueryClient()
  const { user, role } = useAuth()

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', page, rowsPerPage, user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('clients')
        .select(`
          *,
          addresses:client_addresses(*)
        `, { count: 'exact' })

      if (role === 'vendedor' && user?.id) {
        query = query.eq('seller_id', user.id)
      }

      const { data, error, count } = await query
        .range(page * rowsPerPage, (page + 1) * rowsPerPage - 1)
        .order('created_at', { ascending: false })

      if (error) throw error
      const dataWithActions = data?.map(client => ({
        ...client,
        actions: client,
      })) as Record<string, unknown>[];

      return { data: dataWithActions, count: count || 0 }
    },
  })

  const createMutation = useMutation({
    mutationFn: async (newClientData: Partial<Client> & { addresses?: ClientAddressFormState[] }) => {
      console.log('Dados recebidos para criação:', newClientData)
      const { addresses, ...clientData } = newClientData;
      console.log('clientData:', clientData)
      
      // Garantir que apenas os campos corretos sejam enviados para o banco
      const clientDataToInsert = {
        name: clientData.name,
        type: clientData.type || 'individual',
        cpf_cnpj: clientData.cpf_cnpj,
        email: clientData.email,
        phone: clientData.phone,
        is_active: clientData.is_active !== undefined ? clientData.is_active : true,
        ...(role === 'vendedor' && user?.id ? { seller_id: user.id } : {}),
        ...(clientData.user_id ? { user_id: clientData.user_id } : {})
      };
      
      console.log('Dados do cliente a serem inseridos:', clientDataToInsert);

      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert([clientDataToInsert])
        .select()
        .single();

      if (clientError) {
        console.error('Erro ao criar cliente:', clientError);
        throw clientError;
      }

      console.log('Cliente criado:', client);

      if (addresses && addresses.length > 0) {
        console.log('Processando endereços para inserção:', addresses);
        const addressesToInsert = addresses.map(address => {
          const { id, ...addressWithoutId } = address;
          return {
            ...addressWithoutId,
            client_id: client.id,
          };
        });

        console.log('Endereços a serem inseridos (debug - create):', addressesToInsert);

        const { error: addressesError } = await supabase
          .from('client_addresses')
          .insert(addressesToInsert);

        if (addressesError) {
          console.error('Erro ao inserir endereços do cliente:', addressesError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setIsFormOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (updatedClientData: Partial<Client> & { addresses?: ClientAddressFormState[] }) => {
      const { addresses: updatedAddresses, ...clientData } = updatedClientData;
      console.log('Dados recebidos para atualização:', { clientData, updatedAddresses });

      if (role === 'vendedor' && clientData.seller_id !== user?.id) {
        console.warn('Vendedor tentou alterar seller_id de um cliente.');
      }

      // Garantir que apenas os campos corretos sejam enviados para o banco
      const clientDataToUpdate = {
        name: clientData.name,
        type: clientData.type,
        cpf_cnpj: clientData.cpf_cnpj,
        email: clientData.email,
        phone: clientData.phone,
        is_active: clientData.is_active,
        ...(clientData.seller_id ? { seller_id: clientData.seller_id } : {}),
        ...(clientData.user_id ? { user_id: clientData.user_id } : {})
      };

      const { error: clientError } = await supabase
        .from('clients')
        .update(clientDataToUpdate)
        .eq('id', updatedClientData.id);

      if (clientError) throw clientError;

      if (updatedAddresses !== undefined) {
        console.log('Processando endereços:', updatedAddresses);
        
        // Separar endereços em existentes e novos
        const existingAddresses = updatedAddresses.filter(addr => addr.id);
        const newAddresses = updatedAddresses.filter(addr => !addr.id);
        
        console.log('Endereços existentes (depuração):', existingAddresses);
        console.log('Novos endereços (depuração):', newAddresses);

        // Atualizar endereços existentes
        for (const address of existingAddresses) {
          console.log('Atualizando endereço existente:', address);
          const { error: updateError } = await supabase
            .from('client_addresses')
            .update({
              street: address.street,
              number: address.number,
              complement: address.complement,
              neighborhood: address.neighborhood,
              city: address.city,
              state: address.state,
              zip_code: address.zip_code,
              notes: address.notes,
            })
            .eq('id', address.id)
            .eq('client_id', updatedClientData.id);

          if (updateError) {
            console.error('Erro ao atualizar endereço:', updateError);
          }
        }

        // Inserir novos endereços
        if (newAddresses.length > 0) {
          console.log('Inserindo novos endereços:', newAddresses);
          const addressesToInsert = newAddresses.map(address => {
            const { id, ...addressWithoutId } = address;
            return {
              ...addressWithoutId,
              client_id: updatedClientData.id,
            };
          });

          console.log('Endereços a serem inseridos (debug - update):', addressesToInsert);

          const { error: insertError } = await supabase
            .from('client_addresses')
            .insert(addressesToInsert);

          if (insertError) {
            console.error('Erro ao inserir novos endereços:', insertError);
          }
        }

        // Buscar endereços atuais para verificar quais foram removidos
        const { data: currentAddresses, error: fetchError } = await supabase
          .from('client_addresses')
          .select('id')
          .eq('client_id', updatedClientData.id);

        if (fetchError) {
          console.error('Erro ao buscar endereços atuais:', fetchError);
        } else {
          console.log('Endereços atuais no banco:', currentAddresses);
          
          // Identificar endereços que foram removidos
          const currentIds = currentAddresses?.map(addr => addr.id) || [];
          const updatedIds = existingAddresses.map(addr => addr.id);
          const removedIds = currentIds.filter(id => !updatedIds.includes(id));
          
          console.log('IDs atuais:', currentIds);
          console.log('IDs atualizados:', updatedIds);
          console.log('IDs a serem removidos:', removedIds);

          // Remover endereços que não estão mais na lista
          if (removedIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('client_addresses')
              .delete()
              .in('id', removedIds);

            if (deleteError) {
              console.error('Erro ao remover endereços:', deleteError);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setIsFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (clientId: string) => {
       console.log('Deletando cliente:', clientId)
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setIsDeleteDialogOpen(false)
    },
  })

  const handleCreate = () => {
    setSelectedClient(null)
    setIsFormOpen(true)
  }

  const handleEdit = (client: Client) => {
    setSelectedClient(client)
    setIsFormOpen(true)
  }

  const handleDelete = (client: Client) => {
    setSelectedClient(client)
    setIsDeleteDialogOpen(true)
  }

  const handleSubmit = async (data: Partial<Client> & { addresses?: ClientAddressFormState[] }) => {
    if (selectedClient) {
      await updateMutation.mutateAsync({ ...data, id: selectedClient.id })
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  const columns = [
    { id: 'name', label: 'Nome', minWidth: 170 },
    { id: 'type', label: 'Tipo', minWidth: 100 },
    { id: 'cpf_cnpj', label: 'CPF/CNPJ', minWidth: 130 },
    { id: 'email', label: 'Email', minWidth: 170 },
    { id: 'phone', label: 'Telefone', minWidth: 130 },
    {
      id: 'actions',
      label: 'Ações',
      minWidth: 100,
      format: (value: unknown) => {
        const client = value as Client;
        if (!client || !client.id) return null;
        return (
          <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(client)}
                        sx={{ mr: 1 }}
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(client)}
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
        <Typography variant="h4">Clientes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
          Novo Cliente
        </Button>
      </Box>

      <BackupStatus />

      <Table
        title="Lista de Clientes"
        columns={columns}
        data={clients?.data || []}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={clients?.count || 0}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        isLoading={isLoading}
      />

      <Modal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <ClientForm
          initialData={selectedClient || undefined}
          onSubmit={handleSubmit}
          onCancel={() => setIsFormOpen(false)}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => selectedClient && deleteMutation.mutateAsync(selectedClient.id)}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${selectedClient?.name}"?`}
        confirmLabel="Excluir"
        isLoading={deleteMutation.isPending}
      />
    </Box>
  )
} 