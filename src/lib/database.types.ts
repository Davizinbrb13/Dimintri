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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      campuses: {
        Row: {
          created_at: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: never
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: never
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      equipment_assets: {
        Row: {
          created_at: string
          created_by: string | null
          current_campus_id: number | null
          current_requester_id: number | null
          current_sector_id: number | null
          id: number
          model_id: number
          notes: string | null
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_campus_id?: number | null
          current_requester_id?: number | null
          current_sector_id?: number | null
          id?: never
          model_id: number
          notes?: string | null
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_campus_id?: number | null
          current_requester_id?: number | null
          current_sector_id?: number | null
          id?: never
          model_id?: number
          notes?: string | null
          serial_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assets_current_campus_id_fkey"
            columns: ["current_campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assets_current_requester_id_fkey"
            columns: ["current_requester_id"]
            isOneToOne: false
            referencedRelation: "requesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assets_current_sector_id_fkey"
            columns: ["current_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assets_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "equipment_models"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_models: {
        Row: {
          category_id: number | null
          created_at: string
          created_by: string | null
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: number | null
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_models_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_models_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_movement_items: {
        Row: {
          asset_id: number
          created_at: string
          id: number
          movement_id: number
          origin_campus_id: number | null
          origin_requester_id: number | null
          origin_sector_id: number | null
          previous_status: string
        }
        Insert: {
          asset_id: number
          created_at?: string
          id?: never
          movement_id: number
          origin_campus_id?: number | null
          origin_requester_id?: number | null
          origin_sector_id?: number | null
          previous_status: string
        }
        Update: {
          asset_id?: number
          created_at?: string
          id?: never
          movement_id?: number
          origin_campus_id?: number | null
          origin_requester_id?: number | null
          origin_sector_id?: number | null
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_movement_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "equipment_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movement_items_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "equipment_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movement_items_origin_campus_id_fkey"
            columns: ["origin_campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movement_items_origin_requester_id_fkey"
            columns: ["origin_requester_id"]
            isOneToOne: false
            referencedRelation: "requesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movement_items_origin_sector_id_fkey"
            columns: ["origin_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_movements: {
        Row: {
          created_at: string
          destination_campus_id: number | null
          destination_sector_id: number | null
          id: number
          movement_type: string
          notes: string | null
          requester_id: number
          technician_id: string
        }
        Insert: {
          created_at?: string
          destination_campus_id?: number | null
          destination_sector_id?: number | null
          id?: never
          movement_type: string
          notes?: string | null
          requester_id: number
          technician_id?: string
        }
        Update: {
          created_at?: string
          destination_campus_id?: number | null
          destination_sector_id?: number | null
          id?: never
          movement_type?: string
          notes?: string | null
          requester_id?: number
          technician_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_movements_destination_campus_id_fkey"
            columns: ["destination_campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movements_destination_sector_id_fkey"
            columns: ["destination_sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movements_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "requesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_movements_technician_id_fkey"
            columns: ["technician_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_revoked_at: string | null
          access_revoked_by: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          access_revoked_at?: string | null
          access_revoked_by?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          access_revoked_at?: string | null
          access_revoked_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_access_revoked_by_fkey"
            columns: ["access_revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      requesters: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: number
          registration: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: never
          registration: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: never
          registration?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requesters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: number
          snapshot: Json
          ticket_id: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: never
          snapshot: Json
          ticket_id: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: never
          snapshot?: Json
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          campus_id: number
          created_at: string
          diagnosis: string | null
          id: number
          notes: string | null
          reported_error: string
          requester_id: number
          resolved: boolean
          resolved_at: string | null
          sector_id: number
          solution: string | null
          status: string
          technician_id: string
          updated_at: string
        }
        Insert: {
          campus_id: number
          created_at?: string
          diagnosis?: string | null
          id?: never
          notes?: string | null
          reported_error: string
          requester_id: number
          resolved?: boolean
          resolved_at?: string | null
          sector_id: number
          solution?: string | null
          status?: string
          technician_id?: string
          updated_at?: string
        }
        Update: {
          campus_id?: number
          created_at?: string
          diagnosis?: string | null
          id?: never
          notes?: string | null
          reported_error?: string
          requester_id?: number
          resolved?: boolean
          resolved_at?: string | null
          sector_id?: number
          solution?: string | null
          status?: string
          technician_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "requesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_technician_id_fkey"
            columns: ["technician_id"]
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
      create_equipment_movement: {
        Args: {
          p_asset_ids: number[]
          p_destination_campus_id?: number | null
          p_destination_sector_id?: number | null
          p_movement_type: string
          p_notes?: string | null
          p_requester_id: number
        }
        Returns: number
      }
      register_equipment_assets: {
        Args: {
          p_category_name?: string | null
          p_initial_campus_id?: number | null
          p_model_name: string
          p_notes?: string | null
          p_serial_numbers: string[]
        }
        Returns: Json
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
    Enums: {},
  },
} as const
