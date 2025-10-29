import { Resend } from 'resend'

const resend = new Resend(import.meta.env.VITE_RESEND_API_KEY)

interface EmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Sistema de Backup <backup@terroa.com.br>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Erro ao enviar email:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Erro ao enviar email:', error)
    throw error
  }
}

export function generateOrderEmail(order: any) {
  return `
    <h1>Novo Pedido #${order.id}</h1>
    <p>Um novo pedido foi criado no sistema.</p>
    <h2>Detalhes do Pedido:</h2>
    <ul>
      <li>Cliente: ${order.client?.name}</li>
      <li>Data: ${new Date(order.created_at).toLocaleDateString()}</li>
      <li>Total: R$ ${order.final_amount.toFixed(2)}</li>
    </ul>
    <h2>Itens do Pedido:</h2>
    <ul>
      ${order.items?.map((item: any) => `
        <li>${item.product?.name} - ${item.quantity} x R$ ${item.unit_price}</li>
      `).join('')}
    </ul>
  `
}

export function generateOrderStatusEmail(order: any) {
  return `
    <h1>Atualização do Pedido #${order.id}</h1>
    <p>O status do seu pedido foi atualizado.</p>
    <h2>Detalhes do Pedido:</h2>
    <ul>
      <li>Cliente: ${order.client?.name}</li>
      <li>Data: ${new Date(order.created_at).toLocaleDateString()}</li>
      <li>Status: ${order.status}</li>
      <li>Total: R$ ${order.final_amount.toFixed(2)}</li>
    </ul>
  `
}

export function generateLowStockEmail(product: any) {
  return `
    <h1>Alerta de Estoque Baixo</h1>
    <p>O produto abaixo está com estoque baixo:</p>
    <h2>Detalhes do Produto:</h2>
    <ul>
      <li>Nome: ${product.name}</li>
      <li>Categoria: ${product.category}</li>
      <li>Estoque Atual: ${product.stock_quantity}</li>
    </ul>
  `
}

export function generateCommissionEmail(commission: any) {
  return `
    <h1>Nova Comissão Disponível</h1>
    <p>Uma nova comissão está disponível para pagamento.</p>
    <h2>Detalhes da Comissão:</h2>
    <ul>
      <li>Vendedor: ${commission.seller?.full_name}</li>
      <li>Pedido: #${commission.order_id}</li>
      <li>Valor: R$ ${commission.amount.toFixed(2)}</li>
      <li>Data: ${new Date(commission.created_at).toLocaleDateString()}</li>
    </ul>
  `
} 