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
      alerts: {
        Row: {
          created_at: string
          id: string
          message: string
          observed_value: number | null
          plant_id: string
          recommendation: string | null
          resolved: boolean
          severity: string
          user_id: string
          variable: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          observed_value?: number | null
          plant_id: string
          recommendation?: string | null
          resolved?: boolean
          severity?: string
          user_id: string
          variable: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          observed_value?: number | null
          plant_id?: string
          recommendation?: string | null
          resolved?: boolean
          severity?: string
          user_id?: string
          variable?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      color_readings: {
        Row: {
          b: number
          created_at: string
          g: number
          green_index: number | null
          health_label: string | null
          hex: string
          hue: number
          id: string
          image_url: string | null
          measured_at: string
          notes: string | null
          plant_id: string
          r: number
          saturation: number
          user_id: string
          value: number
        }
        Insert: {
          b: number
          created_at?: string
          g: number
          green_index?: number | null
          health_label?: string | null
          hex: string
          hue: number
          id?: string
          image_url?: string | null
          measured_at?: string
          notes?: string | null
          plant_id: string
          r: number
          saturation: number
          user_id: string
          value: number
        }
        Update: {
          b?: number
          created_at?: string
          g?: number
          green_index?: number | null
          health_label?: string | null
          hex?: string
          hue?: number
          id?: string
          image_url?: string | null
          measured_at?: string
          notes?: string | null
          plant_id?: string
          r?: number
          saturation?: number
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "color_readings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_readings: {
        Row: {
          air_temperature: number | null
          created_at: string
          ec: number | null
          hours_since_irrigation: number | null
          humidity_percent: number | null
          id: string
          irrigation_frequency_days: number | null
          light_intensity: number | null
          measured_at: string
          notes: string | null
          plant_id: string
          soil_moisture: number | null
          soil_ph: number | null
          source: string
          user_id: string
        }
        Insert: {
          air_temperature?: number | null
          created_at?: string
          ec?: number | null
          hours_since_irrigation?: number | null
          humidity_percent?: number | null
          id?: string
          irrigation_frequency_days?: number | null
          light_intensity?: number | null
          measured_at?: string
          notes?: string | null
          plant_id: string
          soil_moisture?: number | null
          soil_ph?: number | null
          source?: string
          user_id: string
        }
        Update: {
          air_temperature?: number | null
          created_at?: string
          ec?: number | null
          hours_since_irrigation?: number | null
          humidity_percent?: number | null
          id?: string
          irrigation_frequency_days?: number | null
          light_intensity?: number | null
          measured_at?: string
          notes?: string | null
          plant_id?: string
          soil_moisture?: number | null
          soil_ph?: number | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "environmental_readings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_experiments: {
        Row: {
          cladode_change: number | null
          color_change: string | null
          condition_label: string | null
          created_at: string
          description: string | null
          duration_days: number | null
          end_date: string | null
          final_cladode_count: number | null
          final_height_cm: number | null
          final_sprouts: number | null
          health_status: string | null
          height_change_cm: number | null
          humidity_percent: number | null
          id: string
          initial_cladode_count: number | null
          initial_height_cm: number | null
          initial_sprouts: number | null
          irrigation_frequency_days: number | null
          is_control: boolean | null
          light_intensity_lux: number | null
          name: string
          new_sprouts: number | null
          notes: string | null
          plant_id: string
          soil_ph: number | null
          start_date: string
          temperature_c: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cladode_change?: number | null
          color_change?: string | null
          condition_label?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          final_cladode_count?: number | null
          final_height_cm?: number | null
          final_sprouts?: number | null
          health_status?: string | null
          height_change_cm?: number | null
          humidity_percent?: number | null
          id?: string
          initial_cladode_count?: number | null
          initial_height_cm?: number | null
          initial_sprouts?: number | null
          irrigation_frequency_days?: number | null
          is_control?: boolean | null
          light_intensity_lux?: number | null
          name: string
          new_sprouts?: number | null
          notes?: string | null
          plant_id: string
          soil_ph?: number | null
          start_date?: string
          temperature_c?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cladode_change?: number | null
          color_change?: string | null
          condition_label?: string | null
          created_at?: string
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          final_cladode_count?: number | null
          final_height_cm?: number | null
          final_sprouts?: number | null
          health_status?: string | null
          height_change_cm?: number | null
          humidity_percent?: number | null
          id?: string
          initial_cladode_count?: number | null
          initial_height_cm?: number | null
          initial_sprouts?: number | null
          irrigation_frequency_days?: number | null
          is_control?: boolean | null
          light_intensity_lux?: number | null
          name?: string
          new_sprouts?: number | null
          notes?: string | null
          plant_id?: string
          soil_ph?: number | null
          start_date?: string
          temperature_c?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_experiments_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_predictions: {
        Row: {
          algorithm: string | null
          based_on_readings: number | null
          confidence_percent: number | null
          created_at: string
          id: string
          notes: string | null
          plant_id: string
          predicted_at: string
          predicted_cladode_count: number | null
          predicted_height_cm: number | null
          predicted_sprouts: number | null
          target_date: string
          user_id: string
        }
        Insert: {
          algorithm?: string | null
          based_on_readings?: number | null
          confidence_percent?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id: string
          predicted_at?: string
          predicted_cladode_count?: number | null
          predicted_height_cm?: number | null
          predicted_sprouts?: number | null
          target_date: string
          user_id: string
        }
        Update: {
          algorithm?: string | null
          based_on_readings?: number | null
          confidence_percent?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          plant_id?: string
          predicted_at?: string
          predicted_cladode_count?: number | null
          predicted_height_cm?: number | null
          predicted_sprouts?: number | null
          target_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_predictions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          air_temp: number | null
          created_at: string
          ec: number | null
          humidity: number | null
          id: string
          irrigation_ml: number | null
          light_lux: number | null
          measured_at: string
          notes: string | null
          ph: number | null
          plant_id: string
          soil_moisture: number | null
          source: string
          user_id: string
        }
        Insert: {
          air_temp?: number | null
          created_at?: string
          ec?: number | null
          humidity?: number | null
          id?: string
          irrigation_ml?: number | null
          light_lux?: number | null
          measured_at?: string
          notes?: string | null
          ph?: number | null
          plant_id: string
          soil_moisture?: number | null
          source?: string
          user_id: string
        }
        Update: {
          air_temp?: number | null
          created_at?: string
          ec?: number | null
          humidity?: number | null
          id?: string
          irrigation_ml?: number | null
          light_lux?: number | null
          measured_at?: string
          notes?: string | null
          ph?: number | null
          plant_id?: string
          soil_moisture?: number | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      models_3d: {
        Row: {
          created_at: string
          file_path: string
          file_size_kb: number | null
          growth_stage: string | null
          id: string
          name: string
          notes: string | null
          species_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          file_size_kb?: number | null
          growth_stage?: string | null
          id?: string
          name: string
          notes?: string | null
          species_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          file_size_kb?: number | null
          growth_stage?: string | null
          id?: string
          name?: string
          notes?: string | null
          species_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "models_3d_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      phenotypic_readings: {
        Row: {
          cladode_count: number | null
          cladode_length_cm: number | null
          cladode_thickness_mm: number | null
          cladode_width_cm: number | null
          color_hex: string | null
          color_hue: number | null
          color_saturation: number | null
          color_value: number | null
          created_at: string
          general_state: string | null
          green_index: number | null
          height_cm: number | null
          id: string
          measured_at: string
          new_sprouts: number | null
          notes: string | null
          photo_url: string | null
          plant_id: string
          spots_coverage_percent: number | null
          spots_description: string | null
          spots_present: boolean | null
          user_id: string
          visual_state: string | null
        }
        Insert: {
          cladode_count?: number | null
          cladode_length_cm?: number | null
          cladode_thickness_mm?: number | null
          cladode_width_cm?: number | null
          color_hex?: string | null
          color_hue?: number | null
          color_saturation?: number | null
          color_value?: number | null
          created_at?: string
          general_state?: string | null
          green_index?: number | null
          height_cm?: number | null
          id?: string
          measured_at?: string
          new_sprouts?: number | null
          notes?: string | null
          photo_url?: string | null
          plant_id: string
          spots_coverage_percent?: number | null
          spots_description?: string | null
          spots_present?: boolean | null
          user_id: string
          visual_state?: string | null
        }
        Update: {
          cladode_count?: number | null
          cladode_length_cm?: number | null
          cladode_thickness_mm?: number | null
          cladode_width_cm?: number | null
          color_hex?: string | null
          color_hue?: number | null
          color_saturation?: number | null
          color_value?: number | null
          created_at?: string
          general_state?: string | null
          green_index?: number | null
          height_cm?: number | null
          id?: string
          measured_at?: string
          new_sprouts?: number | null
          notes?: string | null
          photo_url?: string | null
          plant_id?: string
          spots_coverage_percent?: number | null
          spots_description?: string | null
          spots_present?: boolean | null
          user_id?: string
          visual_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phenotypic_readings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          cladode_count: number | null
          code: string | null
          created_at: string
          height_cm: number | null
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          model_3d_id: string | null
          name: string
          notes: string | null
          photo_url: string | null
          planted_on: string | null
          project_id: string | null
          species_id: string | null
          status: string
          substrate: string | null
          updated_at: string
          user_id: string
          variety: string | null
        }
        Insert: {
          cladode_count?: number | null
          code?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          model_3d_id?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          planted_on?: string | null
          project_id?: string | null
          species_id?: string | null
          status?: string
          substrate?: string | null
          updated_at?: string
          user_id: string
          variety?: string | null
        }
        Update: {
          cladode_count?: number | null
          code?: string | null
          created_at?: string
          height_cm?: number | null
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          model_3d_id?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          planted_on?: string | null
          project_id?: string | null
          species_id?: string | null
          status?: string
          substrate?: string | null
          updated_at?: string
          user_id?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plants_model_3d_id_fkey"
            columns: ["model_3d_id"]
            isOneToOne: false
            referencedRelation: "models_3d"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plants_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      species: {
        Row: {
          created_at: string
          default_model_url: string | null
          description: string | null
          id: string
          name: string
          scientific_name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          default_model_url?: string | null
          description?: string | null
          id?: string
          name: string
          scientific_name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          default_model_url?: string | null
          description?: string | null
          id?: string
          name?: string
          scientific_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      thresholds: {
        Row: {
          ec_max: number
          ec_min: number
          hue_max: number
          hue_min: number
          humidity_max: number
          humidity_min: number
          light_max: number
          light_min: number
          moisture_max: number
          moisture_min: number
          ph_max: number
          ph_min: number
          temp_max: number
          temp_min: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ec_max?: number
          ec_min?: number
          hue_max?: number
          hue_min?: number
          humidity_max?: number
          humidity_min?: number
          light_max?: number
          light_min?: number
          moisture_max?: number
          moisture_min?: number
          ph_max?: number
          ph_min?: number
          temp_max?: number
          temp_min?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ec_max?: number
          ec_min?: number
          hue_max?: number
          hue_min?: number
          humidity_max?: number
          humidity_min?: number
          light_max?: number
          light_min?: number
          moisture_max?: number
          moisture_min?: number
          ph_max?: number
          ph_min?: number
          temp_max?: number
          temp_min?: number
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
