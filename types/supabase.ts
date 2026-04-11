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
          // M14: Restaurant-Profilfelder
          description: string | null
          address: string | null
          phone: string | null
          cuisine_type: string | null
          cover_image_url: string | null
          opening_hours: Record<string, string> | null
          // M16: Willkommensrabatt
          welcome_discount_enabled: boolean
          welcome_discount_pct: number
          // M17: Discovery
          is_public: boolean
          city: string | null
          postal_code: string | null
          // M19: Liefergebühr
          delivery_enabled: boolean
          delivery_fee_cents: number
          min_order_cents: number
          free_delivery_above_cents: number
          // M23: Loyalty
          loyalty_enabled: boolean
          // M24: In-Store + Abholzeit-Slots
          in_store_enabled: boolean
          pickup_slots_enabled: boolean
          prep_time_minutes: number
          slot_interval_minutes: number
          max_orders_per_slot: number | null
          // M25: Online-Zahlung
          online_payment_enabled: boolean | null
          // M27: Drive-In
          drive_in_enabled: boolean
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
          // M14: Restaurant-Profilfelder
          description?: string | null
          address?: string | null
          phone?: string | null
          cuisine_type?: string | null
          cover_image_url?: string | null
          opening_hours?: Record<string, string> | null
          // M16: Willkommensrabatt
          welcome_discount_enabled?: boolean
          welcome_discount_pct?: number
          // M17: Discovery
          is_public?: boolean
          city?: string | null
          postal_code?: string | null
          // M19: Liefergebühr
          delivery_enabled?: boolean
          delivery_fee_cents?: number
          min_order_cents?: number
          free_delivery_above_cents?: number
          // M23: Loyalty
          loyalty_enabled?: boolean
          // M24: In-Store + Abholzeit-Slots
          in_store_enabled?: boolean
          pickup_slots_enabled?: boolean
          prep_time_minutes?: number
          slot_interval_minutes?: number
          max_orders_per_slot?: number | null
          // M25: Online-Zahlung
          online_payment_enabled?: boolean | null
          // M27: Drive-In
          drive_in_enabled?: boolean
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
          // M14: Restaurant-Profilfelder
          description?: string | null
          address?: string | null
          phone?: string | null
          cuisine_type?: string | null
          cover_image_url?: string | null
          opening_hours?: Record<string, string> | null
          // M16: Willkommensrabatt
          welcome_discount_enabled?: boolean
          welcome_discount_pct?: number
          // M17: Discovery
          is_public?: boolean
          city?: string | null
          postal_code?: string | null
          // M19: Liefergebühr
          delivery_enabled?: boolean
          delivery_fee_cents?: number
          min_order_cents?: number
          free_delivery_above_cents?: number
          // M23: Loyalty
          loyalty_enabled?: boolean
          // M24: In-Store + Abholzeit-Slots
          in_store_enabled?: boolean
          pickup_slots_enabled?: boolean
          prep_time_minutes?: number
          slot_interval_minutes?: number
          max_orders_per_slot?: number | null
          // M25: Online-Zahlung
          online_payment_enabled?: boolean | null
          // M27: Drive-In
          drive_in_enabled?: boolean
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'admin' | 'staff'
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'owner' | 'admin' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'staff'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      // M15: Kunden-Auth
      customer_profiles: {
        Row: {
          id: string
          name: string
          phone: string | null
          created_at: string
          // M26: No-Show-Schutz
          is_blacklisted: boolean
          blacklist_reason: string | null
          blacklisted_at: string | null
          cash_order_count: number
        }
        Insert: {
          id: string
          name: string
          phone?: string | null
          created_at?: string
          // M26: No-Show-Schutz
          is_blacklisted?: boolean
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          cash_order_count?: number
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          created_at?: string
          // M26: No-Show-Schutz
          is_blacklisted?: boolean
          blacklist_reason?: string | null
          blacklisted_at?: string | null
          cash_order_count?: number
        }
        Relationships: []
      }
      restaurant_customers: {
        Row: {
          id: string
          project_id: string
          user_id: string
          marketing_consent_push: boolean
          marketing_consent_email: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          marketing_consent_push?: boolean
          marketing_consent_email?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          marketing_consent_push?: boolean
          marketing_consent_email?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'restaurant_customers_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'restaurant_customers_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      // M18: Web Push
      push_subscriptions: {
        Row: {
          id: string
          project_id: string
          user_id: string | null
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id?: string | null
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
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
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string
          price: number
          is_active?: boolean
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          price?: number
          is_active?: boolean
          image_url?: string | null
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
          user_id: string | null
          customer_name: string
          customer_contact: string
          order_type: 'delivery' | 'takeaway' | 'in-store'
          table_number: string | null
          payout_status: 'pending' | 'paid'
          // M16: Rabatt
          discount_pct: number
          discount_amount_cents: number
          // M19: Lieferung
          delivery_address: string | null
          delivery_fee_cents: number
          // M23: Loyalty
          loyalty_spent_cents: number
          // M24: Abholzeit-Slot
          pickup_slot: string | null
          // M25: Online-Zahlung
          payment_status: string | null
          stripe_payment_intent_id: string | null
          // M26: No-Show-Schutz
          no_show: boolean
          // M27b: Drive-In
          drive_in_arrived_at: string | null
          drive_in_license_plate: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total_amount: number
          user_id?: string | null
          customer_name?: string
          customer_contact?: string
          order_type?: 'delivery' | 'takeaway' | 'in-store'
          table_number?: string | null
          payout_status?: 'pending' | 'paid'
          // M16: Rabatt
          discount_pct?: number
          discount_amount_cents?: number
          // M19: Lieferung
          delivery_address?: string | null
          delivery_fee_cents?: number
          // M23: Loyalty
          loyalty_spent_cents?: number
          // M24: Abholzeit-Slot
          pickup_slot?: string | null
          // M25: Online-Zahlung
          payment_status?: string | null
          stripe_payment_intent_id?: string | null
          // M26: No-Show-Schutz
          no_show?: boolean
          // M27b: Drive-In
          drive_in_arrived_at?: string | null
          drive_in_license_plate?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          status?: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
          total_amount?: number
          user_id?: string | null
          customer_name?: string
          customer_contact?: string
          order_type?: 'delivery' | 'takeaway' | 'in-store'
          table_number?: string | null
          payout_status?: 'pending' | 'paid'
          // M16: Rabatt
          discount_pct?: number
          discount_amount_cents?: number
          // M19: Lieferung
          delivery_address?: string | null
          delivery_fee_cents?: number
          // M23: Loyalty
          loyalty_spent_cents?: number
          // M24: Abholzeit-Slot
          pickup_slot?: string | null
          // M25: Online-Zahlung
          payment_status?: string | null
          stripe_payment_intent_id?: string | null
          // M26: No-Show-Schutz
          no_show?: boolean
          // M27b: Drive-In
          drive_in_arrived_at?: string | null
          drive_in_license_plate?: string | null
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
          item_name: string | null
          quantity: number
          price_at_time: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          menu_item_id?: string | null
          item_name?: string | null
          quantity: number
          price_at_time: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          menu_item_id?: string | null
          item_name?: string | null
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
      // M23: Local-Hero Bonuskarte
      loyalty_balances: {
        Row: {
          id: string
          user_id: string
          project_id: string
          balance_cents: number
          order_count: number
          last_order_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          balance_cents?: number
          order_count?: number
          last_order_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          balance_cents?: number
          order_count?: number
          last_order_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'loyalty_balances_project_id_fkey'
            columns: ['project_id']
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      // M27: Bizzn-Pass Subscriptions
      bizzn_pass_subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: string
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_customer_id: string
          stripe_subscription_id: string
          status: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          status?: string
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      // M27: Bizzn-Pass aktiv?
      has_active_bizzn_pass: {
        Args: { p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
