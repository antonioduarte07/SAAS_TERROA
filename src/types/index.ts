export type UserRole = 'admin' | 'user'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
export type ClientType = 'individual' | 'company'
export type ProductCategory = 'seeds' | 'fertilizers' | 'pesticides' | 'machinery' | 'other' | 'Nutrição' | 'Biologico'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

export interface ClientAddress {
  id: string
  client_id: string
  street: string
  number?: string | null
  complement?: string | null
  neighborhood?: string | null
  city: string
  state: string
  zip_code?: string | null
  latitude?: number | null
  longitude?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  type: 'individual' | 'company'
  cpf_cnpj?: string
  email: string
  phone: string
  created_at: string
  updated_at: string
  is_active: boolean
  seller_id?: string | null
  user_id?: string | null
  addresses?: ClientAddress[]
}

export interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  unit: string
  price: number
  stock_quantity: number
  created_at: string
  updated_at: string
  is_active: boolean
  segmento?: string
  fornecedor?: string
}

export interface Order {
  id: string
  client_id: string
  seller_id: string
  status: OrderStatus
  total_amount: number
  discount: number
  final_amount: number
  notes?: string | null
  receipt_date?: string | null
  payment_date?: string | null
  created_at: string
  updated_at: string
  client?: Client
  items?: OrderItem[]
  discount_type?: 'global' | 'item' | null
  client_address_id?: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string | null
  product?: Product
  hectares?: number | null
  dosagem?: number | null
  discount_percentage?: number | null
}

export interface Commission {
  id: string
  order_id: string
  seller_id: string
  amount: number
  percentage: number
  created_at: string
}

export interface CommissionRule {
  id: string
  seller_id: string
  product_category?: ProductCategory
  min_amount?: number
  max_amount?: number
  percentage: number
  created_at: string
  updated_at: string
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  billing_address: Json | null
  payment_method: Json | null
  role: 'admin' | 'vendedor' | 'cliente'
  created_at: string
  updated_at: string
} 