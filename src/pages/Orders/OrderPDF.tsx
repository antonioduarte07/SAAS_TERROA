import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type { Order } from '@/types'

// Registra a fonte
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
})

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottom: 1,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 'auto',
    padding: 5,
    fontSize: 10,
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  total: {
    marginTop: 20,
    textAlign: 'right',
    fontSize: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
  },
})

interface OrderPDFProps {
  order: Order
}

export default function OrderPDF({ order }: OrderPDFProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Pedido #{order.id.slice(0, 8)}</Text>
          <Text style={styles.subtitle}>
            Data: {formatDate(order.created_at)}
          </Text>
          <Text style={styles.subtitle}>
            Cliente: {order.client?.name}
          </Text>
          <Text style={styles.subtitle}>
            Status: {order.status}
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Produto</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Quantidade</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Preço Unit.</Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>Total</Text>
              </View>
            </View>

            {order.items?.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.product?.name}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>{item.quantity}</Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {formatCurrency(item.unit_price)}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {formatCurrency(item.total_price)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.total}>
          <Text>Subtotal: {formatCurrency(order.total_amount)}</Text>
          <Text>Desconto: {formatCurrency(order.discount)}</Text>
          <Text>Total: {formatCurrency(order.final_amount)}</Text>
        </View>

        <View style={styles.footer}>
          <Text>
            Terroa Vendas - Sistema de Gestão de Vendas
          </Text>
          <Text>
            Este documento foi gerado automaticamente pelo sistema
          </Text>
        </View>
      </Page>
    </Document>
  )
} 