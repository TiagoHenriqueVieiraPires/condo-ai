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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          archived_at: string | null
          author_id: string
          body: string
          condominium_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          author_id?: string
          body: string
          condominium_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          author_id?: string
          body?: string
          condominium_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string | null
          condominium_id: string | null
          created_at: string | null
          entity: string | null
          entity_id: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          condominium_id?: string | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          condominium_id?: string | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          amount: number
          competence: string
          condominium_id: string
          created_at: string
          due_date: string
          id: string
          paid: boolean
          paid_at: string | null
          unit_id: string
        }
        Insert: {
          amount: number
          competence: string
          condominium_id: string
          created_at?: string
          due_date: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          unit_id: string
        }
        Update: {
          amount?: number
          competence?: string
          condominium_id?: string
          created_at?: string
          due_date?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          condominium_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          condominium_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          condominium_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      common_areas: {
        Row: {
          capacity: number | null
          condominium_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          capacity?: number | null
          condominium_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          capacity?: number | null
          condominium_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "common_areas_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      condominium_members: {
        Row: {
          condominium_id: string
          created_at: string | null
          id: string
          role: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          condominium_id: string
          created_at?: string | null
          id?: string
          role: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          condominium_id?: string
          created_at?: string | null
          id?: string
          role?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "condominium_members_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condominium_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      condominiums: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          category: string | null
          condominium_id: string
          created_at: string | null
          description: string
          id: string
          priority: string | null
          resident_id: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          condominium_id: string
          created_at?: string | null
          description: string
          id?: string
          priority?: string | null
          resident_id?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          condominium_id?: string
          created_at?: string | null
          description?: string
          id?: string
          priority?: string | null
          resident_id?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          carrier: string | null
          condominium_id: string
          delivered_at: string | null
          description: string
          id: string
          received_at: string | null
          status: string | null
          unit_id: string | null
        }
        Insert: {
          carrier?: string | null
          condominium_id: string
          delivered_at?: string | null
          description: string
          id?: string
          received_at?: string | null
          status?: string | null
          unit_id?: string | null
        }
        Update: {
          carrier?: string | null
          condominium_id?: string
          delivered_at?: string | null
          description?: string
          id?: string
          received_at?: string | null
          status?: string | null
          unit_id?: string | null
        }
        Relationships: []
      }
      reservations: {
        Row: {
          area_id: string
          condominium_id: string
          created_at: string
          ends_at: string
          id: string
          resident_id: string
          starts_at: string
          status: string
        }
        Insert: {
          area_id: string
          condominium_id: string
          created_at?: string
          ends_at: string
          id?: string
          resident_id: string
          starts_at: string
          status?: string
        }
        Update: {
          area_id?: string
          condominium_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          resident_id?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "common_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          condominium_id: string
          created_at: string | null
          document_number: string | null
          email: string | null
          full_name: string
          id: string
          is_owner: boolean | null
          phone: string | null
          status: string | null
          unit_id: string | null
        }
        Insert: {
          condominium_id: string
          created_at?: string | null
          document_number?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_owner?: boolean | null
          phone?: string | null
          status?: string | null
          unit_id?: string | null
        }
        Update: {
          condominium_id?: string
          created_at?: string | null
          document_number?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_owner?: boolean | null
          phone?: string | null
          status?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          building_id: string
          condominium_id: string
          created_at: string | null
          floor: number | null
          id: string
          status: string | null
          unit_number: string
        }
        Insert: {
          building_id: string
          condominium_id: string
          created_at?: string | null
          floor?: number | null
          id?: string
          status?: string | null
          unit_number: string
        }
        Update: {
          building_id?: string
          condominium_id?: string
          created_at?: string | null
          floor?: number | null
          id?: string
          status?: string | null
          unit_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      utility_charge_items: {
        Row: {
          amount: number
          condominium_id: string
          consumption: number | null
          created_at: string
          id: string
          paid: boolean
          paid_at: string | null
          unit_id: string
          utility_charge_id: string
        }
        Insert: {
          amount: number
          condominium_id: string
          consumption?: number | null
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          unit_id: string
          utility_charge_id: string
        }
        Update: {
          amount?: number
          condominium_id?: string
          consumption?: number | null
          created_at?: string
          id?: string
          paid?: boolean
          paid_at?: string | null
          unit_id?: string
          utility_charge_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_charge_items_charge_condominium_fkey"
            columns: ["utility_charge_id", "condominium_id"]
            isOneToOne: false
            referencedRelation: "utility_charges"
            referencedColumns: ["id", "condominium_id"]
          },
          {
            foreignKeyName: "utility_charge_items_unit_condominium_fkey"
            columns: ["unit_id", "condominium_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id", "condominium_id"]
          },
        ]
      }
      utility_charges: {
        Row: {
          allocation_method: string
          competence: string
          condominium_id: string
          created_at: string
          created_by: string
          id: string
          published_at: string | null
          status: string
          total_amount: number
          utility_type: string
        }
        Insert: {
          allocation_method: string
          competence: string
          condominium_id: string
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          status?: string
          total_amount: number
          utility_type: string
        }
        Update: {
          allocation_method?: string
          competence?: string
          condominium_id?: string
          created_at?: string
          created_by?: string
          id?: string
          published_at?: string | null
          status?: string
          total_amount?: number
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_charges_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          color: string | null
          condominium_id: string
          created_at: string
          id: string
          model: string | null
          plate: string
          resident_id: string
        }
        Insert: {
          color?: string | null
          condominium_id: string
          created_at?: string
          id?: string
          model?: string | null
          plate: string
          resident_id: string
        }
        Update: {
          color?: string | null
          condominium_id?: string
          created_at?: string
          id?: string
          model?: string | null
          plate?: string
          resident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          checked_in_at: string | null
          checked_out_at: string | null
          condominium_id: string
          created_at: string | null
          document_number: string | null
          full_name: string
          id: string
          status: string | null
          unit_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          condominium_id: string
          created_at?: string | null
          document_number?: string | null
          full_name: string
          id?: string
          status?: string | null
          unit_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          checked_in_at?: string | null
          checked_out_at?: string | null
          condominium_id?: string
          created_at?: string | null
          document_number?: string | null
          full_name?: string
          id?: string
          status?: string | null
          unit_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_condominium_member_by_email: {
        Args: {
          target_condominium_id: string
          target_email: string
          target_role: string
          target_unit_id?: string
        }
        Returns: string
      }
      create_condominium_with_admin: {
        Args: {
          target_admin_name: string
          target_building_name: string
          target_condominium_name: string
        }
        Returns: string
      }
      create_utility_charge_with_shares: {
        Args: {
          target_allocation_method: string
          target_competence: string
          target_condominium_id: string
          target_items: Json
          target_total_amount: number
          target_utility_type: string
        }
        Returns: string
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
