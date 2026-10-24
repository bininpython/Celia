// Arquivo gerado por scripts/gen-types.mjs — não edite manualmente.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: number;
          gym_id: string | null;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["app_role"] | null;
          action: string;
          table_name: string;
          record_id: string | null;
          old_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          gym_id?: string | null;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          action: string;
          table_name: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          gym_id?: string | null;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["app_role"] | null;
          action?: string;
          table_name?: string;
          record_id?: string | null;
          old_data?: Json | null;
          new_data?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      budgets: {
        Row: {
          id: string;
          gym_id: string;
          category_id: string;
          month: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          category_id: string;
          month: string;
          amount: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          category_id?: string;
          month?: string;
          amount?: number;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "budgets_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "financial_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "budgets_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      checkins: {
        Row: {
          id: string;
          gym_id: string;
          student_id: string;
          checked_in_at: string;
          method: Database["public"]["Enums"]["checkin_method"];
          registered_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          student_id: string;
          checked_in_at?: string;
          method: Database["public"]["Enums"]["checkin_method"];
          registered_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          gym_id?: string;
          student_id?: string;
          checked_in_at?: string;
          method?: Database["public"]["Enums"]["checkin_method"];
          registered_by?: string | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "checkins_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "checkins_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      event_attendees: {
        Row: {
          event_id: string;
          student_id: string;
          gym_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          student_id: string;
          gym_id?: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          student_id?: string;
          gym_id?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "event_attendees_event_id_fkey"; columns: ["event_id"]; isOneToOne: false; referencedRelation: "events"; referencedColumns: ["id"] },
          { foreignKeyName: "event_attendees_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "event_attendees_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      events: {
        Row: {
          id: string;
          gym_id: string;
          title: string;
          kind: Database["public"]["Enums"]["event_kind"];
          starts_at: string;
          ends_at: string;
          staff_id: string | null;
          student_id: string | null;
          location: string | null;
          capacity: number | null;
          description: string | null;
          status: Database["public"]["Enums"]["event_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          title: string;
          kind: Database["public"]["Enums"]["event_kind"];
          starts_at: string;
          ends_at: string;
          staff_id?: string | null;
          student_id?: string | null;
          location?: string | null;
          capacity?: number | null;
          description?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          title?: string;
          kind?: Database["public"]["Enums"]["event_kind"];
          starts_at?: string;
          ends_at?: string;
          staff_id?: string | null;
          student_id?: string | null;
          location?: string | null;
          capacity?: number | null;
          description?: string | null;
          status?: Database["public"]["Enums"]["event_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "events_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "events_staff_id_fkey"; columns: ["staff_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] },
          { foreignKeyName: "events_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      exercises: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          muscle_group: string;
          equipment: string;
          instructions: string | null;
          video_url: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          name: string;
          muscle_group: string;
          equipment: string;
          instructions?: string | null;
          video_url?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          muscle_group?: string;
          equipment?: string;
          instructions?: string | null;
          video_url?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "exercises_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      financial_categories: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          type: Database["public"]["Enums"]["tx_type"];
          nature: Database["public"]["Enums"]["cost_nature"];
          dre_group: string;
          color: string | null;
          is_system: boolean;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          name: string;
          type: Database["public"]["Enums"]["tx_type"];
          nature?: Database["public"]["Enums"]["cost_nature"];
          dre_group?: string;
          color?: string | null;
          is_system?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["tx_type"];
          nature?: Database["public"]["Enums"]["cost_nature"];
          dre_group?: string;
          color?: string | null;
          is_system?: boolean;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "financial_categories_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      gyms: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          cnpj: string | null;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          address: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          logo_path: string | null;
          primary_color: string;
          timezone: string;
          opening_hours: Json;
          default_due_day: number;
          late_fee_percent: number;
          monthly_interest_percent: number;
          due_alert_days: number;
          absence_alert_days: number;
          opening_balance: number;
          opening_balance_date: string;
          data_retention_months: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          cnpj?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          logo_path?: string | null;
          primary_color?: string;
          timezone?: string;
          opening_hours?: Json;
          default_due_day?: number;
          late_fee_percent?: number;
          monthly_interest_percent?: number;
          due_alert_days?: number;
          absence_alert_days?: number;
          opening_balance?: number;
          opening_balance_date?: string;
          data_retention_months?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          cnpj?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          address?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          logo_path?: string | null;
          primary_color?: string;
          timezone?: string;
          opening_hours?: Json;
          default_due_day?: number;
          late_fee_percent?: number;
          monthly_interest_percent?: number;
          due_alert_days?: number;
          absence_alert_days?: number;
          opening_balance?: number;
          opening_balance_date?: string;
          data_retention_months?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      investments: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          kind: Database["public"]["Enums"]["investment_kind"];
          amount: number;
          invested_at: string | null;
          expected_monthly_return: number;
          expected_monthly_cost: number;
          useful_life_months: number | null;
          status: Database["public"]["Enums"]["investment_status"];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          name: string;
          kind: Database["public"]["Enums"]["investment_kind"];
          amount: number;
          invested_at?: string | null;
          expected_monthly_return?: number;
          expected_monthly_cost?: number;
          useful_life_months?: number | null;
          status?: Database["public"]["Enums"]["investment_status"];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          kind?: Database["public"]["Enums"]["investment_kind"];
          amount?: number;
          invested_at?: string | null;
          expected_monthly_return?: number;
          expected_monthly_cost?: number;
          useful_life_months?: number | null;
          status?: Database["public"]["Enums"]["investment_status"];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "investments_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      invoices: {
        Row: {
          id: string;
          gym_id: string;
          student_id: string;
          membership_id: string | null;
          description: string;
          reference_month: string;
          due_date: string;
          amount: number;
          discount: number;
          fine: number;
          interest: number;
          status: Database["public"]["Enums"]["invoice_status"];
          paid_at: string | null;
          renegotiated_from: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          student_id: string;
          membership_id?: string | null;
          description: string;
          reference_month: string;
          due_date: string;
          amount: number;
          discount?: number;
          fine?: number;
          interest?: number;
          status?: Database["public"]["Enums"]["invoice_status"];
          paid_at?: string | null;
          renegotiated_from?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          student_id?: string;
          membership_id?: string | null;
          description?: string;
          reference_month?: string;
          due_date?: string;
          amount?: number;
          discount?: number;
          fine?: number;
          interest?: number;
          status?: Database["public"]["Enums"]["invoice_status"];
          paid_at?: string | null;
          renegotiated_from?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "invoices_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_membership_id_fkey"; columns: ["membership_id"]; isOneToOne: false; referencedRelation: "memberships"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_renegotiated_from_fkey"; columns: ["renegotiated_from"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      memberships: {
        Row: {
          id: string;
          gym_id: string;
          student_id: string;
          plan_id: string;
          start_date: string;
          end_date: string | null;
          price: number;
          discount: number;
          status: Database["public"]["Enums"]["membership_status"];
          auto_renew: boolean;
          canceled_at: string | null;
          cancel_reason: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          student_id: string;
          plan_id: string;
          start_date: string;
          end_date?: string | null;
          price: number;
          discount?: number;
          status?: Database["public"]["Enums"]["membership_status"];
          auto_renew?: boolean;
          canceled_at?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          student_id?: string;
          plan_id?: string;
          start_date?: string;
          end_date?: string | null;
          price?: number;
          discount?: number;
          status?: Database["public"]["Enums"]["membership_status"];
          auto_renew?: boolean;
          canceled_at?: string | null;
          cancel_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "memberships_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "memberships_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "plans"; referencedColumns: ["id"] },
          { foreignKeyName: "memberships_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      notifications: {
        Row: {
          id: string;
          gym_id: string;
          audience: string;
          student_id: string | null;
          kind: string;
          title: string;
          body: string | null;
          link: string | null;
          dedupe_key: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id: string;
          audience: string;
          student_id?: string | null;
          kind: string;
          title: string;
          body?: string | null;
          link?: string | null;
          dedupe_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          audience?: string;
          student_id?: string | null;
          kind?: string;
          title?: string;
          body?: string | null;
          link?: string | null;
          dedupe_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "notifications_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      payments: {
        Row: {
          id: string;
          gym_id: string;
          invoice_id: string | null;
          student_id: string | null;
          amount: number;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at: string;
          receipt_number: number;
          received_by: string | null;
          notes: string | null;
          gateway: string | null;
          gateway_reference: string | null;
          reversed_at: string | null;
          reversal_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          invoice_id?: string | null;
          student_id?: string | null;
          amount: number;
          method: Database["public"]["Enums"]["payment_method"];
          paid_at?: string;
          receipt_number?: number;
          received_by?: string | null;
          notes?: string | null;
          gateway?: string | null;
          gateway_reference?: string | null;
          reversed_at?: string | null;
          reversal_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          invoice_id?: string | null;
          student_id?: string | null;
          amount?: number;
          method?: Database["public"]["Enums"]["payment_method"];
          paid_at?: string;
          receipt_number?: number;
          received_by?: string | null;
          notes?: string | null;
          gateway?: string | null;
          gateway_reference?: string | null;
          reversed_at?: string | null;
          reversal_reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "payments_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      plans: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          periodicity: Database["public"]["Enums"]["plan_periodicity"];
          duration_months: number;
          price: number;
          description: string | null;
          weekly_frequency: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          name: string;
          periodicity: Database["public"]["Enums"]["plan_periodicity"];
          duration_months: number;
          price: number;
          description?: string | null;
          weekly_frequency?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          periodicity?: Database["public"]["Enums"]["plan_periodicity"];
          duration_months?: number;
          price?: number;
          description?: string | null;
          weekly_frequency?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "plans_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      profiles: {
        Row: {
          id: string;
          gym_id: string;
          full_name: string;
          email: string | null;
          role: Database["public"]["Enums"]["app_role"];
          active: boolean;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          gym_id: string;
          full_name?: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          active?: boolean;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          full_name?: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          active?: boolean;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "profiles_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      report_exports: {
        Row: {
          id: string;
          gym_id: string;
          report_type: string;
          format: string;
          params: Json;
          generated_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          report_type: string;
          format: string;
          params?: Json;
          generated_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          report_type?: string;
          format?: string;
          params?: Json;
          generated_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "report_exports_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      staff: {
        Row: {
          id: string;
          gym_id: string;
          profile_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          cpf: string | null;
          role: Database["public"]["Enums"]["app_role"];
          position: string | null;
          hire_date: string | null;
          salary: number | null;
          responsibilities: string | null;
          schedule: Json;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          profile_id?: string | null;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          cpf?: string | null;
          role: Database["public"]["Enums"]["app_role"];
          position?: string | null;
          hire_date?: string | null;
          salary?: number | null;
          responsibilities?: string | null;
          schedule?: Json;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          profile_id?: string | null;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          cpf?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          position?: string | null;
          hire_date?: string | null;
          salary?: number | null;
          responsibilities?: string | null;
          schedule?: Json;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "staff_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "staff_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ];
      };
      student_health: {
        Row: {
          student_id: string;
          gym_id: string;
          medical_conditions: string | null;
          medications: string | null;
          injuries: string | null;
          restrictions: string | null;
          physician_clearance: boolean;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          gym_id?: string;
          medical_conditions?: string | null;
          medications?: string | null;
          injuries?: string | null;
          restrictions?: string | null;
          physician_clearance?: boolean;
          updated_at?: string;
        };
        Update: {
          student_id?: string;
          gym_id?: string;
          medical_conditions?: string | null;
          medications?: string | null;
          injuries?: string | null;
          restrictions?: string | null;
          physician_clearance?: boolean;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "student_health_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "student_health_student_id_fkey"; columns: ["student_id"]; isOneToOne: true; referencedRelation: "students"; referencedColumns: ["id"] },
        ];
      };
      students: {
        Row: {
          id: string;
          gym_id: string;
          user_id: string | null;
          enrollment_code: string;
          full_name: string;
          cpf: string | null;
          email: string | null;
          phone: string | null;
          birth_date: string | null;
          gender: string | null;
          address: string | null;
          photo_path: string | null;
          objective: string | null;
          start_date: string;
          due_day: number;
          status: Database["public"]["Enums"]["student_status"];
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          lgpd_consent_at: string | null;
          health_consent_at: string | null;
          notifications_opt_in: boolean;
          notes: string | null;
          archived_at: string | null;
          anonymized_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          user_id?: string | null;
          enrollment_code?: string;
          full_name: string;
          cpf?: string | null;
          email?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          address?: string | null;
          photo_path?: string | null;
          objective?: string | null;
          start_date?: string;
          due_day?: number;
          status?: Database["public"]["Enums"]["student_status"];
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          lgpd_consent_at?: string | null;
          health_consent_at?: string | null;
          notifications_opt_in?: boolean;
          notes?: string | null;
          archived_at?: string | null;
          anonymized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          user_id?: string | null;
          enrollment_code?: string;
          full_name?: string;
          cpf?: string | null;
          email?: string | null;
          phone?: string | null;
          birth_date?: string | null;
          gender?: string | null;
          address?: string | null;
          photo_path?: string | null;
          objective?: string | null;
          start_date?: string;
          due_day?: number;
          status?: Database["public"]["Enums"]["student_status"];
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          lgpd_consent_at?: string | null;
          health_consent_at?: string | null;
          notifications_opt_in?: boolean;
          notes?: string | null;
          archived_at?: string | null;
          anonymized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "students_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      suppliers: {
        Row: {
          id: string;
          gym_id: string;
          name: string;
          document: string | null;
          email: string | null;
          phone: string | null;
          category: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          name: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          category?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          name?: string;
          document?: string | null;
          email?: string | null;
          phone?: string | null;
          category?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "suppliers_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      transactions: {
        Row: {
          id: string;
          gym_id: string;
          type: Database["public"]["Enums"]["tx_type"];
          category_id: string;
          supplier_id: string | null;
          student_id: string | null;
          payment_id: string | null;
          investment_id: string | null;
          description: string;
          amount: number;
          competence_date: string;
          due_date: string;
          paid_date: string | null;
          status: Database["public"]["Enums"]["tx_status"];
          nature: Database["public"]["Enums"]["cost_nature"] | null;
          payment_method: Database["public"]["Enums"]["payment_method"] | null;
          document_number: string | null;
          recurrence_group: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          type: Database["public"]["Enums"]["tx_type"];
          category_id: string;
          supplier_id?: string | null;
          student_id?: string | null;
          payment_id?: string | null;
          investment_id?: string | null;
          description: string;
          amount: number;
          competence_date: string;
          due_date: string;
          paid_date?: string | null;
          status?: Database["public"]["Enums"]["tx_status"];
          nature?: Database["public"]["Enums"]["cost_nature"] | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          document_number?: string | null;
          recurrence_group?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          type?: Database["public"]["Enums"]["tx_type"];
          category_id?: string;
          supplier_id?: string | null;
          student_id?: string | null;
          payment_id?: string | null;
          investment_id?: string | null;
          description?: string;
          amount?: number;
          competence_date?: string;
          due_date?: string;
          paid_date?: string | null;
          status?: Database["public"]["Enums"]["tx_status"];
          nature?: Database["public"]["Enums"]["cost_nature"] | null;
          payment_method?: Database["public"]["Enums"]["payment_method"] | null;
          document_number?: string | null;
          recurrence_group?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "transactions_category_id_fkey"; columns: ["category_id"]; isOneToOne: false; referencedRelation: "financial_categories"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_investment_id_fkey"; columns: ["investment_id"]; isOneToOne: false; referencedRelation: "investments"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_payment_id_fkey"; columns: ["payment_id"]; isOneToOne: true; referencedRelation: "payments"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "transactions_supplier_id_fkey"; columns: ["supplier_id"]; isOneToOne: false; referencedRelation: "suppliers"; referencedColumns: ["id"] },
        ];
      };
      workout_divisions: {
        Row: {
          id: string;
          gym_id: string;
          plan_id: string;
          label: string;
          name: string | null;
          position: number;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          plan_id: string;
          label: string;
          name?: string | null;
          position?: number;
        };
        Update: {
          id?: string;
          gym_id?: string;
          plan_id?: string;
          label?: string;
          name?: string | null;
          position?: number;
        };
        Relationships: [
          { foreignKeyName: "workout_divisions_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_divisions_plan_id_fkey"; columns: ["plan_id"]; isOneToOne: false; referencedRelation: "workout_plans"; referencedColumns: ["id"] },
        ];
      };
      workout_exercises: {
        Row: {
          id: string;
          gym_id: string;
          division_id: string;
          exercise_id: string;
          position: number;
          sets: number;
          reps: string;
          load_kg: number | null;
          rest_seconds: number | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          division_id: string;
          exercise_id: string;
          position?: number;
          sets: number;
          reps: string;
          load_kg?: number | null;
          rest_seconds?: number | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          gym_id?: string;
          division_id?: string;
          exercise_id?: string;
          position?: number;
          sets?: number;
          reps?: string;
          load_kg?: number | null;
          rest_seconds?: number | null;
          notes?: string | null;
        };
        Relationships: [
          { foreignKeyName: "workout_exercises_division_id_fkey"; columns: ["division_id"]; isOneToOne: false; referencedRelation: "workout_divisions"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_exercises_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_exercises_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
        ];
      };
      workout_logs: {
        Row: {
          id: string;
          gym_id: string;
          student_id: string;
          workout_exercise_id: string | null;
          exercise_id: string;
          performed_on: string;
          sets_done: number | null;
          reps_done: string | null;
          load_kg: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          student_id: string;
          workout_exercise_id?: string | null;
          exercise_id: string;
          performed_on?: string;
          sets_done?: number | null;
          reps_done?: string | null;
          load_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          student_id?: string;
          workout_exercise_id?: string | null;
          exercise_id?: string;
          performed_on?: string;
          sets_done?: number | null;
          reps_done?: string | null;
          load_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: "workout_logs_exercise_id_fkey"; columns: ["exercise_id"]; isOneToOne: false; referencedRelation: "exercises"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_logs_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_logs_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_logs_workout_exercise_id_fkey"; columns: ["workout_exercise_id"]; isOneToOne: false; referencedRelation: "workout_exercises"; referencedColumns: ["id"] },
        ];
      };
      workout_plans: {
        Row: {
          id: string;
          gym_id: string;
          student_id: string;
          teacher_id: string | null;
          title: string;
          goal: string | null;
          start_date: string;
          end_date: string | null;
          active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          gym_id?: string;
          student_id: string;
          teacher_id?: string | null;
          title: string;
          goal?: string | null;
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          gym_id?: string;
          student_id?: string;
          teacher_id?: string | null;
          title?: string;
          goal?: string | null;
          start_date?: string;
          end_date?: string | null;
          active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "workout_plans_gym_id_fkey"; columns: ["gym_id"]; isOneToOne: false; referencedRelation: "gyms"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_plans_student_id_fkey"; columns: ["student_id"]; isOneToOne: false; referencedRelation: "students"; referencedColumns: ["id"] },
          { foreignKeyName: "workout_plans_teacher_id_fkey"; columns: ["teacher_id"]; isOneToOne: false; referencedRelation: "staff"; referencedColumns: ["id"] },
        ];
      };
    };
    Views: {
      staff_directory: {
        Row: {
          id: string | null;
          gym_id: string | null;
          full_name: string | null;
          role: Database["public"]["Enums"]["app_role"] | null;
          position: string | null;
          phone: string | null;
          email: string | null;
          active: boolean | null;
          schedule: Json | null;
          responsibilities: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      active_members_at: { Args: { p_date: string }; Returns: number };
      anonymize_student: { Args: { p_student: string }; Returns: undefined };
      auth_role: { Args: Record<PropertyKey, never>; Returns: Database["public"]["Enums"]["app_role"] };
      budget_vs_actual: { Args: { p_month: string }; Returns: { category_id: string; category_name: string; type: Database["public"]["Enums"]["tx_type"]; budget: number; actual: number }[] };
      cash_balance: { Args: { p_at?: string }; Returns: number };
      checkins_daily: { Args: { p_from: string; p_to: string }; Returns: { day: string; total: number; unique_students: number }[] };
      checkins_heatmap: { Args: { p_from: string; p_to: string }; Returns: { dow: number; hour: number; total: number }[] };
      current_gym_id: { Args: Record<PropertyKey, never>; Returns: string };
      current_student_id: { Args: Record<PropertyKey, never>; Returns: string };
      enrollments_monthly: { Args: { p_from: string; p_to: string }; Returns: { month: string; new_students: number; cancellations: number }[] };
      fin_by_category: { Args: { p_from: string; p_to: string; p_basis?: string }; Returns: { category_id: string; category_name: string; type: Database["public"]["Enums"]["tx_type"]; nature: Database["public"]["Enums"]["cost_nature"]; dre_group: string; color: string; total: number }[] };
      fin_monthly: { Args: { p_from: string; p_to: string }; Returns: { month: string; income_paid: number; expense_paid: number; income_pending: number; expense_pending: number; income_competence: number; expense_competence: number }[] };
      fin_totals: { Args: { p_from: string; p_to: string }; Returns: { income_paid: number; expense_paid: number; income_pending: number; expense_pending: number; tuition_received: number; paying_students: number; billed_amount: number; overdue_in_period: number; overdue_total: number; overdue_invoices: number }[] };
      generate_invoices: { Args: { p_month: string }; Returns: number };
      generate_notifications: { Args: { p_gym?: string }; Returns: number };
      has_any_role: { Args: { roles: Database["public"]["Enums"]["app_role"][] }; Returns: boolean };
      is_front: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_mgmt: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_trainer: { Args: Record<PropertyKey, never>; Returns: boolean };
      plan_stats: { Args: { p_from: string; p_to: string }; Returns: { plan_id: string; plan_name: string; periodicity: Database["public"]["Enums"]["plan_periodicity"]; price: number; duration_months: number; active_memberships: number; monthly_recurring: number; received: number }[] };
      recompute_invoice_status: { Args: { p_invoice: string }; Returns: undefined };
      record_health_consent: { Args: { p_student: string }; Returns: undefined };
      renegotiate_invoices: { Args: { p_invoice_ids: string[]; p_installments: number; p_first_due: string; p_total: number; p_notes?: string }; Returns: Database["public"]["Tables"]["invoices"]["Row"][] };
      save_workout_plan: { Args: { p_id: string; p_data: Json }; Returns: string };
      student_attendance: { Args: { p_days?: number }; Returns: { student_id: string; full_name: string; status: Database["public"]["Enums"]["student_status"]; phone: string; last_checkin: string; checkins_period: number; days_since_last: number }[] };
      student_counts: { Args: Record<PropertyKey, never>; Returns: { ativos: number; suspensos: number; inativos: number; arquivados: number; inadimplentes: number }[] };
      update_my_contact: { Args: { p_phone: string; p_email: string; p_address: string; p_emergency_name: string; p_emergency_phone: string; p_notifications: boolean }; Returns: undefined };
    };
    Enums: {
      app_role: "admin" | "gerente" | "recepcionista" | "professor" | "aluno";
      checkin_method: "recepcao" | "matricula" | "qrcode";
      cost_nature: "fixa" | "variavel";
      event_kind: "aula" | "avaliacao" | "compromisso";
      event_status: "agendado" | "concluido" | "cancelado";
      investment_kind: "equipamento" | "reforma" | "publicidade" | "expansao" | "tecnologia" | "outro";
      investment_status: "planejado" | "executado" | "cancelado";
      invoice_status: "pendente" | "pago" | "cancelado" | "renegociado";
      membership_status: "ativa" | "suspensa" | "cancelada" | "encerrada";
      payment_method: "pix" | "cartao_credito" | "cartao_debito" | "dinheiro" | "transferencia";
      plan_periodicity: "mensal" | "trimestral" | "semestral" | "anual" | "personalizado";
      student_status: "ativo" | "suspenso" | "inativo" | "arquivado";
      tx_status: "pendente" | "pago" | "cancelado";
      tx_type: "receita" | "despesa";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Returns"];

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "recepcionista", "professor", "aluno"],
      checkin_method: ["recepcao", "matricula", "qrcode"],
      cost_nature: ["fixa", "variavel"],
      event_kind: ["aula", "avaliacao", "compromisso"],
      event_status: ["agendado", "concluido", "cancelado"],
      investment_kind: ["equipamento", "reforma", "publicidade", "expansao", "tecnologia", "outro"],
      investment_status: ["planejado", "executado", "cancelado"],
      invoice_status: ["pendente", "pago", "cancelado", "renegociado"],
      membership_status: ["ativa", "suspensa", "cancelada", "encerrada"],
      payment_method: ["pix", "cartao_credito", "cartao_debito", "dinheiro", "transferencia"],
      plan_periodicity: ["mensal", "trimestral", "semestral", "anual", "personalizado"],
      student_status: ["ativo", "suspenso", "inativo", "arquivado"],
      tx_status: ["pendente", "pago", "cancelado"],
      tx_type: ["receita", "despesa"],
    },
  },
} as const;
