export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          created_at: string
          name: string
          status: string
          user_id: string
          slug: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean | null
          stripe_payouts_enabled: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          status?: string
          user_id: string
          slug?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          status?: string
          user_id?: string
          slug?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean | null
          stripe_payouts_enabled?: boolean | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: string
          project_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'menu_categories_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      menu_items: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string
          price: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string
          price: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          price?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'menu_items_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'menu_categories'
            referencedColumns: ['id']
          }
        ]
      }
      orders: {
        Row: {
          id: string
          project_id: string
          status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total_amount: number
          customer_name: string
          customer_contact: string
          order_type: 'delivery' | 'takeaway' | 'in-store'
          table_number: string | null
          payout_status: 'pending' | 'paid'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total_amount: number
          customer_name?: string
          customer_contact?: string
          order_type?: 'delivery' | 'takeaway' | 'in-store'
          table_number?: string | null
          payout_status?: 'pending' | 'paid'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total_amount?: number
          customer_name?: string
          customer_contact?: string
          order_type?: 'delivery' | 'takeaway' | 'in-store'
          table_number?: string | null
          payout_status?: 'pending' | 'paid'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          menu_item_id: string | null
          quantity: number
          price_at_time: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          quantity: number
          price_at_time: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string | null
          quantity?: number
          price_at_time?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_menu_item_id_fkey'
            columns: ['menu_item_id']
            referencedRelation: 'menu_items'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
