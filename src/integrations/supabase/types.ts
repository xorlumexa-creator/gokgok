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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          cloud_cost_monthly: number
          currency: string
          id: number
          updated_at: string
        }
        Insert: {
          cloud_cost_monthly?: number
          currency?: string
          id?: number
          updated_at?: string
        }
        Update: {
          cloud_cost_monthly?: number
          currency?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_usage: {
        Row: {
          count: number
          id: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          id?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          id?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_usage: {
        Row: {
          count: number
          id: string
          user_id: string
          year_month: string
        }
        Insert: {
          count?: number
          id?: string
          user_id: string
          year_month: string
        }
        Update: {
          count?: number
          id?: string
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          id: string
          resolved_at: string | null
          status: string
          temp_password: string | null
          user_id: string | null
          user_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          temp_password?: string | null
          user_id?: string | null
          user_phone: string
        }
        Update: {
          created_at?: string
          id?: string
          resolved_at?: string | null
          status?: string
          temp_password?: string | null
          user_id?: string | null
          user_phone?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          must_change_password: boolean
          phone: string | null
          plan: string | null
          plan_expiry: string | null
          role: string
          sales_credit_period: string | null
          sales_credit_used: number
          shop_name: string | null
          storage_level: number
          subscription_expires_at: string | null
          subscription_plan: string | null
          subscription_start_date: string | null
          subscription_started_at: string | null
          subscription_status: string
          temporary_access: boolean
          temporary_expiry: string | null
          trial_start_date: string
          updated_at: string
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          plan?: string | null
          plan_expiry?: string | null
          role?: string
          sales_credit_period?: string | null
          sales_credit_used?: number
          shop_name?: string | null
          storage_level?: number
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          temporary_access?: boolean
          temporary_expiry?: string | null
          trial_start_date?: string
          updated_at?: string
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          plan?: string | null
          plan_expiry?: string | null
          role?: string
          sales_credit_period?: string | null
          sales_credit_used?: number
          shop_name?: string | null
          storage_level?: number
          subscription_expires_at?: string | null
          subscription_plan?: string | null
          subscription_start_date?: string | null
          subscription_started_at?: string | null
          subscription_status?: string
          temporary_access?: boolean
          temporary_expiry?: string | null
          trial_start_date?: string
          updated_at?: string
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      subscription_requests: {
        Row: {
          created_at: string
          id: string
          payment_method: string
          plan_type: string
          resolved_at: string | null
          screenshot_url: string | null
          status: string
          transaction_id: string | null
          user_id: string
          user_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string
          plan_type: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
          user_phone: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string
          plan_type?: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
          user_phone?: string
        }
        Relationships: []
      }
      user_backups: {
        Row: {
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          data: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_app_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "manager"
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
      app_role: ["admin", "moderator", "user", "manager"],
    },
  },
} as const
