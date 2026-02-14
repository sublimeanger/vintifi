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
      listings: {
        Row: {
          brand: string | null
          category: string | null
          condition: string | null
          created_at: string
          current_price: number | null
          days_listed: number | null
          description: string | null
          favourites_count: number | null
          health_score: number | null
          id: string
          image_url: string | null
          purchase_price: number | null
          recommended_price: number | null
          sale_price: number | null
          size: string | null
          sold_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          views_count: number | null
          vinted_url: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          current_price?: number | null
          days_listed?: number | null
          description?: string | null
          favourites_count?: number | null
          health_score?: number | null
          id?: string
          image_url?: string | null
          purchase_price?: number | null
          recommended_price?: number | null
          sale_price?: number | null
          size?: string | null
          sold_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          views_count?: number | null
          vinted_url?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          condition?: string | null
          created_at?: string
          current_price?: number | null
          days_listed?: number | null
          description?: string | null
          favourites_count?: number | null
          health_score?: number | null
          id?: string
          image_url?: string | null
          purchase_price?: number | null
          recommended_price?: number | null
          sale_price?: number | null
          size?: string | null
          sold_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          views_count?: number | null
          vinted_url?: string | null
        }
        Relationships: []
      }
      price_reports: {
        Row: {
          ai_insights: string | null
          comparable_items: Json | null
          confidence_score: number | null
          created_at: string
          current_price: number | null
          id: string
          item_brand: string | null
          item_category: string | null
          item_condition: string | null
          item_title: string | null
          listing_id: string | null
          price_distribution: Json | null
          price_range_high: number | null
          price_range_low: number | null
          recommended_price: number | null
          search_query: string | null
          user_id: string
          vinted_url: string | null
        }
        Insert: {
          ai_insights?: string | null
          comparable_items?: Json | null
          confidence_score?: number | null
          created_at?: string
          current_price?: number | null
          id?: string
          item_brand?: string | null
          item_category?: string | null
          item_condition?: string | null
          item_title?: string | null
          listing_id?: string | null
          price_distribution?: Json | null
          price_range_high?: number | null
          price_range_low?: number | null
          recommended_price?: number | null
          search_query?: string | null
          user_id: string
          vinted_url?: string | null
        }
        Update: {
          ai_insights?: string | null
          comparable_items?: Json | null
          confidence_score?: number | null
          created_at?: string
          current_price?: number | null
          id?: string
          item_brand?: string | null
          item_category?: string | null
          item_condition?: string | null
          item_title?: string | null
          listing_id?: string | null
          price_distribution?: Json | null
          price_range_high?: number | null
          price_range_low?: number | null
          recommended_price?: number | null
          search_query?: string | null
          user_id?: string
          vinted_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_listing_count: string | null
          created_at: string
          display_name: string | null
          experience_level: string | null
          id: string
          onboarding_completed: boolean
          primary_goal: string | null
          selling_categories: string[] | null
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_listing_count?: string | null
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id?: string
          onboarding_completed?: boolean
          primary_goal?: string | null
          selling_categories?: string[] | null
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_listing_count?: string | null
          created_at?: string
          display_name?: string | null
          experience_level?: string | null
          id?: string
          onboarding_completed?: boolean
          primary_goal?: string | null
          selling_categories?: string[] | null
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trends: {
        Row: {
          ai_summary: string | null
          avg_price: number | null
          brand_or_item: string
          category: string
          detected_at: string
          estimated_peak_date: string | null
          id: string
          opportunity_score: number | null
          price_change_30d: number | null
          search_volume_change_30d: number | null
          search_volume_change_7d: number | null
          supply_demand_ratio: number | null
          trend_direction: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          avg_price?: number | null
          brand_or_item: string
          category: string
          detected_at?: string
          estimated_peak_date?: string | null
          id?: string
          opportunity_score?: number | null
          price_change_30d?: number | null
          search_volume_change_30d?: number | null
          search_volume_change_7d?: number | null
          supply_demand_ratio?: number | null
          trend_direction?: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          avg_price?: number | null
          brand_or_item?: string
          category?: string
          detected_at?: string
          estimated_peak_date?: string | null
          id?: string
          opportunity_score?: number | null
          price_change_30d?: number | null
          search_volume_change_30d?: number | null
          search_volume_change_7d?: number | null
          supply_demand_ratio?: number | null
          trend_direction?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_credits: {
        Row: {
          created_at: string
          credits_limit: number
          id: string
          optimizations_used: number
          period_end: string
          period_start: string
          price_checks_used: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_limit?: number
          id?: string
          optimizations_used?: number
          period_end?: string
          period_start?: string
          price_checks_used?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_limit?: number
          id?: string
          optimizations_used?: number
          period_end?: string
          period_start?: string
          price_checks_used?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
