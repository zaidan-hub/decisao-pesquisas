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
      clientes: {
        Row: {
          contatos: Json | null
          created_at: string
          data_inicio_contrato: string | null
          id: string
          nome: string
          situacao: string
        }
        Insert: {
          contatos?: Json | null
          created_at?: string
          data_inicio_contrato?: string | null
          id?: string
          nome: string
          situacao: string
        }
        Update: {
          contatos?: Json | null
          created_at?: string
          data_inicio_contrato?: string | null
          id?: string
          nome?: string
          situacao?: string
        }
        Relationships: []
      }
      grupos: {
        Row: {
          codigo: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      listas: {
        Row: {
          created_at: string
          id: string
          nome: string
          produtos: string[] | null
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          produtos?: string[] | null
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          produtos?: string[] | null
        }
        Relationships: []
      }
      pesquisadores: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          email: string
          id: string
          login: string
          nome: string
          senha: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          email: string
          id?: string
          login: string
          nome: string
          senha: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          email?: string
          id?: string
          login?: string
          nome?: string
          senha?: string
          telefone?: string | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          codigo: string
          created_at: string
          grupo_id: string
          id: string
          nome: string
          quantidade: string | null
          subgrupo_id: string
          unidade_medida: string
        }
        Insert: {
          codigo: string
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
          quantidade?: string | null
          subgrupo_id: string
          unidade_medida: string
        }
        Update: {
          codigo?: string
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
          quantidade?: string | null
          subgrupo_id?: string
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_subgrupo_id_fkey"
            columns: ["subgrupo_id"]
            isOneToOne: false
            referencedRelation: "subgrupos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      subgrupos: {
        Row: {
          codigo: string
          created_at: string
          grupo_id: string
          id: string
          nome: string
        }
        Insert: {
          codigo: string
          created_at?: string
          grupo_id: string
          id?: string
          nome: string
        }
        Update: {
          codigo?: string
          created_at?: string
          grupo_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "subgrupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos"
            referencedColumns: ["id"]
          },
        ]
      }
      supermercados: {
        Row: {
          created_at: string
          endereco: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          endereco: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          endereco?: string
          id?: string
          nome?: string
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
