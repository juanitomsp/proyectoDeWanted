export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      batches: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string
          delivery_note_item_id: string | null
          entry_date: string
          expiry_date: string | null
          id: string
          location_id: string
          notes: string | null
          product_id: string
          quantity: number
          remaining_quantity: number
          status: Database["public"]["Enums"]["batch_status"]
          storage_type: Database["public"]["Enums"]["storage_type"]
          unit: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by: string
          delivery_note_item_id?: string | null
          entry_date?: string
          expiry_date?: string | null
          id?: string
          location_id: string
          notes?: string | null
          product_id: string
          quantity: number
          remaining_quantity: number
          status?: Database["public"]["Enums"]["batch_status"]
          storage_type?: Database["public"]["Enums"]["storage_type"]
          unit?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string
          delivery_note_item_id?: string | null
          entry_date?: string
          expiry_date?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          remaining_quantity?: number
          status?: Database["public"]["Enums"]["batch_status"]
          storage_type?: Database["public"]["Enums"]["storage_type"]
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_delivery_note_item_id_fkey"
            columns: ["delivery_note_item_id"]
            isOneToOne: false
            referencedRelation: "delivery_note_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          created_at: string
          id: string
          legal_name: string | null
          name: string
          owner_id: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          legal_name?: string | null
          name: string
          owner_id: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          legal_name?: string | null
          name?: string
          owner_id?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_items: {
        Row: {
          created_at: string
          delivery_note_id: string
          id: string
          notes: string | null
          product_id: string
          quantity: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          delivery_note_id: string
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          delivery_note_id?: string
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_delivery_note_id_fkey"
            columns: ["delivery_note_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          created_at: string
          delivery_date: string
          id: string
          image_url: string | null
          location_id: string
          notes: string | null
          processed_by: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date: string
          id?: string
          image_url?: string | null
          location_id: string
          notes?: string | null
          processed_by: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string
          id?: string
          image_url?: string | null
          location_id?: string
          notes?: string | null
          processed_by?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      haccp_reports: {
        Row: {
          created_at: string
          generated_by: string
          id: string
          location_id: string
          pdf_url: string | null
          report_month: string
          signed_at: string | null
          signed_by: string | null
        }
        Insert: {
          created_at?: string
          generated_by: string
          id?: string
          location_id: string
          pdf_url?: string | null
          report_month: string
          signed_at?: string | null
          signed_by?: string | null
        }
        Update: {
          created_at?: string
          generated_by?: string
          id?: string
          location_id?: string
          pdf_url?: string | null
          report_month?: string
          signed_at?: string | null
          signed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haccp_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haccp_reports_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_transfers: {
        Row: {
          batch_id: string
          completed_at: string | null
          from_location_id: string
          id: string
          notes: string | null
          processed_at: string | null
          processed_by: string | null
          product_id: string
          quantity: number
          requested_at: string
          requested_by: string
          status: Database["public"]["Enums"]["transfer_status"]
          to_location_id: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          from_location_id: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          product_id: string
          quantity: number
          requested_at?: string
          requested_by: string
          status?: Database["public"]["Enums"]["transfer_status"]
          to_location_id: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          from_location_id?: string
          id?: string
          notes?: string | null
          processed_at?: string | null
          processed_by?: string | null
          product_id?: string
          quantity?: number
          requested_at?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["transfer_status"]
          to_location_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_transfers_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_transfers_from_location_id_fkey"
            columns: ["from_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_transfers_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_transfers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_transfers_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_transfers_to_location_id_fkey"
            columns: ["to_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          location_type: Database["public"]["Enums"]["location_type"]
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: Database["public"]["Enums"]["location_type"]
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location_type?: Database["public"]["Enums"]["location_type"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          business_id: string
          created_at: string
          default_storage_type:
            | Database["public"]["Enums"]["storage_type"]
            | null
          description: string | null
          gtin: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          default_storage_type?:
            | Database["public"]["Enums"]["storage_type"]
            | null
          description?: string | null
          gtin?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          default_storage_type?:
            | Database["public"]["Enums"]["storage_type"]
            | null
          description?: string | null
          gtin?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          active_locations_count: number
          billing_cycle_end: string
          billing_cycle_start: string
          business_id: string
          created_at: string
          id: string
          plan_name: string
          price_per_location: number
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          active_locations_count?: number
          billing_cycle_end?: string
          billing_cycle_start?: string
          business_id: string
          created_at?: string
          id?: string
          plan_name?: string
          price_per_location?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          active_locations_count?: number
          billing_cycle_end?: string
          billing_cycle_start?: string
          business_id?: string
          created_at?: string
          id?: string
          plan_name?: string
          price_per_location?: number
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          business_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          location_id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_id: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_location_access: { Args: { location_uuid: string }; Returns: boolean }
      is_business_owner: { Args: { business_uuid: string }; Returns: boolean }
    }
    Enums: {
      batch_status: "ok" | "warning" | "critical" | "expired"
      location_type:
        | "restaurant"
        | "bar"
        | "cafe"
        | "catering"
        | "store"
        | "other"
      storage_type: "refrigerated" | "frozen" | "dry" | "ambient"
      subscription_status: "active" | "inactive" | "trial" | "cancelled"
      transfer_status: "pending" | "accepted" | "rejected" | "completed"
      user_role: "admin" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      batch_status: ["ok", "warning", "critical", "expired"],
      location_type: [
        "restaurant",
        "bar",
        "cafe",
        "catering",
        "store",
        "other",
      ],
      storage_type: ["refrigerated", "frozen", "dry", "ambient"],
      subscription_status: ["active", "inactive", "trial", "cancelled"],
      transfer_status: ["pending", "accepted", "rejected", "completed"],
      user_role: ["admin", "employee"],
    },
  },
} as const
