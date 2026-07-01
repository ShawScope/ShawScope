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
      accounts_category_mappings: {
        Row: {
          category: string
          created_at: string
          id: string
          keyword: string
          match_count: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          keyword: string
          match_count?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          keyword?: string
          match_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      accounts_employment_income: {
        Row: {
          created_at: string
          employer: string | null
          gross_pay: number
          id: string
          ni_paid: number
          notes: string | null
          pay_date: string
          pension: number
          period_label: string | null
          tax_paid: number
          tax_year_start: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employer?: string | null
          gross_pay?: number
          id?: string
          ni_paid?: number
          notes?: string | null
          pay_date?: string
          pension?: number
          period_label?: string | null
          tax_paid?: number
          tax_year_start?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employer?: string | null
          gross_pay?: number
          id?: string
          ni_paid?: number
          notes?: string | null
          pay_date?: string
          pension?: number
          period_label?: string | null
          tax_paid?: number
          tax_year_start?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      accounts_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          notes: string | null
          payment_method: string | null
          receipt_mime: string | null
          receipt_name: string | null
          receipt_path: string | null
          updated_at: string
          vat_amount: number | null
          vendor: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_mime?: string | null
          receipt_name?: string | null
          receipt_path?: string | null
          updated_at?: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_mime?: string | null
          receipt_name?: string | null
          receipt_path?: string | null
          updated_at?: string
          vat_amount?: number | null
          vendor?: string | null
        }
        Relationships: []
      }
      admin_authenticator_factors: {
        Row: {
          created_at: string
          enabled_at: string | null
          id: string
          is_enabled: boolean
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          secret: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean
          secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_todos: {
        Row: {
          appointment_id: string | null
          completed: boolean
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_recurring: boolean
          next_due_date: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          priority: number
          recurrence_end_date: string | null
          recurrence_interval: string | null
          title: string
          todo_category: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          next_due_date?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          priority?: number
          recurrence_end_date?: string | null
          recurrence_interval?: string | null
          title: string
          todo_category?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_recurring?: boolean
          next_due_date?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          priority?: number
          recurrence_end_date?: string | null
          recurrence_interval?: string | null
          title?: string
          todo_category?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_todos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_todos_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_diagnostic_assessments: {
        Row: {
          aftercare_advice: string | null
          created_at: string
          created_by: string
          differential_considerations: string[] | null
          equipment_suggested: string | null
          examination_findings: string | null
          id: string
          image_count: number
          input_notes: string | null
          patient_email: string | null
          patient_friendly_summary: string | null
          patient_id: string | null
          patient_name: string | null
          precautions: string | null
          presenting_complaint: string | null
          raw_ai_response: Json | null
          suggested_procedure: string | null
        }
        Insert: {
          aftercare_advice?: string | null
          created_at?: string
          created_by: string
          differential_considerations?: string[] | null
          equipment_suggested?: string | null
          examination_findings?: string | null
          id?: string
          image_count?: number
          input_notes?: string | null
          patient_email?: string | null
          patient_friendly_summary?: string | null
          patient_id?: string | null
          patient_name?: string | null
          precautions?: string | null
          presenting_complaint?: string | null
          raw_ai_response?: Json | null
          suggested_procedure?: string | null
        }
        Update: {
          aftercare_advice?: string | null
          created_at?: string
          created_by?: string
          differential_considerations?: string[] | null
          equipment_suggested?: string | null
          examination_findings?: string | null
          id?: string
          image_count?: number
          input_notes?: string | null
          patient_email?: string | null
          patient_friendly_summary?: string | null
          patient_id?: string | null
          patient_name?: string | null
          precautions?: string | null
          presenting_complaint?: string | null
          raw_ai_response?: Json | null
          suggested_procedure?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_diagnostic_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_payments: {
        Row: {
          amount: number
          appointment_id: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string
          payment_status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          appointment_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string
          payment_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_timings: {
        Row: {
          appointment_id: string
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          started_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_timings_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          access_token: string
          addon_selections: Json | null
          address: string | null
          admin_notes: string | null
          ai_consent_summary: string | null
          alternative_date: string | null
          alternative_time: string | null
          appointment_date: string
          appointment_time: string
          client_email: string
          client_name: string
          client_phone: string | null
          come_to_practitioner: boolean
          consent_form_template_id: string | null
          consent_sent_at: string | null
          created_at: string
          delay_eta_arrival: string | null
          delay_notified_at: string | null
          dictation_consent: boolean
          duration_minutes: number | null
          group_id: string | null
          id: string
          latitude: number | null
          locality: string | null
          longitude: number | null
          media_consent: boolean
          notes: string | null
          postcode: string | null
          price: number | null
          profile_id: string | null
          ready_from_time: string | null
          recurring_group_id: string | null
          recurring_interval_weeks: number | null
          rejected_at: string | null
          review_request_sent_at: string | null
          service_id: string | null
          status: string
          tracking_opened_at: string | null
          travel_distance_miles: number | null
          travel_fee: number | null
          updated_at: string
        }
        Insert: {
          access_token?: string
          addon_selections?: Json | null
          address?: string | null
          admin_notes?: string | null
          ai_consent_summary?: string | null
          alternative_date?: string | null
          alternative_time?: string | null
          appointment_date: string
          appointment_time: string
          client_email: string
          client_name: string
          client_phone?: string | null
          come_to_practitioner?: boolean
          consent_form_template_id?: string | null
          consent_sent_at?: string | null
          created_at?: string
          delay_eta_arrival?: string | null
          delay_notified_at?: string | null
          dictation_consent?: boolean
          duration_minutes?: number | null
          group_id?: string | null
          id?: string
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          media_consent?: boolean
          notes?: string | null
          postcode?: string | null
          price?: number | null
          profile_id?: string | null
          ready_from_time?: string | null
          recurring_group_id?: string | null
          recurring_interval_weeks?: number | null
          rejected_at?: string | null
          review_request_sent_at?: string | null
          service_id?: string | null
          status?: string
          tracking_opened_at?: string | null
          travel_distance_miles?: number | null
          travel_fee?: number | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          addon_selections?: Json | null
          address?: string | null
          admin_notes?: string | null
          ai_consent_summary?: string | null
          alternative_date?: string | null
          alternative_time?: string | null
          appointment_date?: string
          appointment_time?: string
          client_email?: string
          client_name?: string
          client_phone?: string | null
          come_to_practitioner?: boolean
          consent_form_template_id?: string | null
          consent_sent_at?: string | null
          created_at?: string
          delay_eta_arrival?: string | null
          delay_notified_at?: string | null
          dictation_consent?: boolean
          duration_minutes?: number | null
          group_id?: string | null
          id?: string
          latitude?: number | null
          locality?: string | null
          longitude?: number | null
          media_consent?: boolean
          notes?: string | null
          postcode?: string | null
          price?: number | null
          profile_id?: string | null
          ready_from_time?: string | null
          recurring_group_id?: string | null
          recurring_interval_weeks?: number | null
          rejected_at?: string | null
          review_request_sent_at?: string | null
          service_id?: string | null
          status?: string
          tracking_opened_at?: string | null
          travel_distance_miles?: number | null
          travel_fee?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_consent_form_template_id_fkey"
            columns: ["consent_form_template_id"]
            isOneToOne: false
            referencedRelation: "consent_form_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      available_dates: {
        Row: {
          available_date: string
          created_at: string
          end_hour: number | null
          id: string
          is_available: boolean
          start_hour: number | null
        }
        Insert: {
          available_date: string
          created_at?: string
          end_hour?: number | null
          id?: string
          is_available?: boolean
          start_hour?: number | null
        }
        Update: {
          available_date?: string
          created_at?: string
          end_hour?: number | null
          id?: string
          is_available?: boolean
          start_hour?: number | null
        }
        Relationships: []
      }
      blocked_times: {
        Row: {
          blocked_date: string
          created_at: string
          end_time: string
          id: string
          reason: string | null
          repeat_group_id: string | null
          repeat_type: string
          repeat_until: string | null
          start_time: string
        }
        Insert: {
          blocked_date: string
          created_at?: string
          end_time: string
          id?: string
          reason?: string | null
          repeat_group_id?: string | null
          repeat_type?: string
          repeat_until?: string | null
          start_time: string
        }
        Update: {
          blocked_date?: string
          created_at?: string
          end_time?: string
          id?: string
          reason?: string | null
          repeat_group_id?: string | null
          repeat_type?: string
          repeat_until?: string | null
          start_time?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          approval_token: string
          category: string
          content: Json
          created_at: string
          excerpt: string
          icon_name: string
          id: string
          image_url: string | null
          published_at: string | null
          read_time: string
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approval_token?: string
          category?: string
          content?: Json
          created_at?: string
          excerpt: string
          icon_name?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          read_time?: string
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approval_token?: string
          category?: string
          content?: Json
          created_at?: string
          excerpt?: string
          icon_name?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          read_time?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booking_holds: {
        Row: {
          appointment_date: string
          appointment_time: string
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          created_at: string
          duration_minutes: number
          expires_at: string
          help_email_sent: boolean
          id: string
          postcode: string | null
          released: boolean
          session_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          duration_minutes?: number
          expires_at?: string
          help_email_sent?: boolean
          id?: string
          postcode?: string | null
          released?: boolean
          session_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          created_at?: string
          duration_minutes?: number
          expires_at?: string
          help_email_sent?: boolean
          id?: string
          postcode?: string | null
          released?: boolean
          session_id?: string
        }
        Relationships: []
      }
      business_policies: {
        Row: {
          created_at: string
          description: string | null
          heading: string
          id: string
          last_reviewed_at: string | null
          policy_text: string | null
          review_notes: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          heading: string
          id?: string
          last_reviewed_at?: string | null
          policy_text?: string | null
          review_notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          heading?: string
          id?: string
          last_reviewed_at?: string | null
          policy_text?: string | null
          review_notes?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          appointment_duration_minutes: number
          booking_cutoff_hours: number
          buffer_minutes: number
          clinical_audits_migrated_at: string | null
          days_available: number[]
          dismissed_suggestions: Json
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          end_hour: number
          id: string
          start_hour: number
          travel_buffer_per_mile: number
          updated_at: string
        }
        Insert: {
          appointment_duration_minutes?: number
          booking_cutoff_hours?: number
          buffer_minutes?: number
          clinical_audits_migrated_at?: string | null
          days_available?: number[]
          dismissed_suggestions?: Json
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_hour?: number
          id?: string
          start_hour?: number
          travel_buffer_per_mile?: number
          updated_at?: string
        }
        Update: {
          appointment_duration_minutes?: number
          booking_cutoff_hours?: number
          buffer_minutes?: number
          clinical_audits_migrated_at?: string | null
          days_available?: number[]
          dismissed_suggestions?: Json
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          end_hour?: number
          id?: string
          start_hour?: number
          travel_buffer_per_mile?: number
          updated_at?: string
        }
        Relationships: []
      }
      chat_logs: {
        Row: {
          admin_read: boolean
          created_at: string
          escalated: boolean
          escalation_reason: string | null
          id: string
          matt_notified_at: string | null
          messages: Json
          patient_email: string | null
          patient_phone: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          admin_read?: boolean
          created_at?: string
          escalated?: boolean
          escalation_reason?: string | null
          id?: string
          matt_notified_at?: string | null
          messages?: Json
          patient_email?: string | null
          patient_phone?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          admin_read?: boolean
          created_at?: string
          escalated?: boolean
          escalation_reason?: string | null
          id?: string
          matt_notified_at?: string | null
          messages?: Json
          patient_email?: string | null
          patient_phone?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_visit_enquiries: {
        Row: {
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          notes: string | null
          number_of_people: number | null
          service_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          number_of_people?: number | null
          service_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          number_of_people?: number | null
          service_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_audit_actions: {
        Row: {
          action_text: string
          completed: boolean
          created_at: string
          deadline: string | null
          id: string
          review_id: string
          todo_id: string | null
        }
        Insert: {
          action_text: string
          completed?: boolean
          created_at?: string
          deadline?: string | null
          id?: string
          review_id: string
          todo_id?: string | null
        }
        Update: {
          action_text?: string
          completed?: boolean
          created_at?: string
          deadline?: string | null
          id?: string
          review_id?: string
          todo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_actions_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "clinical_audit_monthly_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_audit_actions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "admin_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_entries: {
        Row: {
          appointment_id: string | null
          category: string
          cpd_certificate_path: string | null
          cpd_hours: number | null
          cpd_provider: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          patient_id: string | null
          patient_name: string | null
          resolution: string | null
          resolved_at: string | null
          severity: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          category?: string
          cpd_certificate_path?: string | null
          cpd_hours?: number | null
          cpd_provider?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          patient_id?: string | null
          patient_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          category?: string
          cpd_certificate_path?: string | null
          cpd_hours?: number | null
          cpd_provider?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          patient_id?: string | null
          patient_name?: string | null
          resolution?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_entries_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_audit_entries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_files: {
        Row: {
          audit_entry_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
        }
        Insert: {
          audit_entry_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Update: {
          audit_entry_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_files_audit_entry_id_fkey"
            columns: ["audit_entry_id"]
            isOneToOne: false
            referencedRelation: "clinical_audit_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_monthly_reviews: {
        Row: {
          checklist: Json
          completed_at: string | null
          created_at: string
          created_by: string | null
          governance_score: number | null
          id: string
          manual_metrics: Json
          review_month: string
          review_text: string | null
          status: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          governance_score?: number | null
          id?: string
          manual_metrics?: Json
          review_month: string
          review_text?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          governance_score?: number | null
          id?: string
          manual_metrics?: Json
          review_month?: string
          review_text?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_audit_reflections: {
        Row: {
          action_plan: string | null
          analysis: string | null
          conclusion: string | null
          created_at: string
          description: string | null
          evaluation: string | null
          feelings: string | null
          id: string
          review_id: string
          updated_at: string
        }
        Insert: {
          action_plan?: string | null
          analysis?: string | null
          conclusion?: string | null
          created_at?: string
          description?: string | null
          evaluation?: string | null
          feelings?: string | null
          id?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          action_plan?: string | null
          analysis?: string | null
          conclusion?: string | null
          created_at?: string
          description?: string | null
          evaluation?: string | null
          feelings?: string | null
          id?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_reflections_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "clinical_audit_monthly_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      clinical_audit_updates: {
        Row: {
          audit_entry_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string
        }
        Insert: {
          audit_entry_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note: string
        }
        Update: {
          audit_entry_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_audit_updates_audit_entry_id_fkey"
            columns: ["audit_entry_id"]
            isOneToOne: false
            referencedRelation: "clinical_audit_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      communications_log: {
        Row: {
          appointment_id: string | null
          body_html: string | null
          body_preview: string | null
          channel: string
          created_at: string
          error_message: string | null
          id: string
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          subject: string | null
          trigger_type: string
        }
        Insert: {
          appointment_id?: string | null
          body_html?: string | null
          body_preview?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          subject?: string | null
          trigger_type: string
        }
        Update: {
          appointment_id?: string | null
          body_html?: string | null
          body_preview?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          subject?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_checks: {
        Row: {
          check_month: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          kit_id: string
          kit_name: string
          objectives: Json
          updated_at: string
        }
        Insert: {
          check_month: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          kit_id: string
          kit_name: string
          objectives?: Json
          updated_at?: string
        }
        Update: {
          check_month?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          kit_id?: string
          kit_name?: string
          objectives?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_checks_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_form_responses: {
        Row: {
          appointment_id: string
          consent_form_template_id: string
          created_at: string
          id: string
          responses: Json
          signature: string | null
          signed_at: string | null
          status: string
          submitter_name: string | null
          template_snapshot: Json | null
        }
        Insert: {
          appointment_id: string
          consent_form_template_id: string
          created_at?: string
          id?: string
          responses?: Json
          signature?: string | null
          signed_at?: string | null
          status?: string
          submitter_name?: string | null
          template_snapshot?: Json | null
        }
        Update: {
          appointment_id?: string
          consent_form_template_id?: string
          created_at?: string
          id?: string
          responses?: Json
          signature?: string | null
          signed_at?: string | null
          status?: string
          submitter_name?: string | null
          template_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_form_responses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_form_responses_consent_form_template_id_fkey"
            columns: ["consent_form_template_id"]
            isOneToOne: false
            referencedRelation: "consent_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_form_templates: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          form_type: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          form_type?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      consultation_notes: {
        Row: {
          aftercare_advice: string | null
          ai_prefill_summary: string | null
          allergies: string | null
          appointment_id: string
          completed_by: string | null
          complications: string | null
          created_at: string
          current_medications: string | null
          equipment_used: string | null
          examination_findings: string | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          medical_history: string | null
          news_observations: Json | null
          other_notes: string | null
          outcome: string | null
          patient_signature: string | null
          patient_understood: boolean | null
          practitioner_signature: string | null
          presenting_complaint: string | null
          procedure_notes: string | null
          procedure_performed: string | null
          risks_explained: boolean | null
          updated_at: string
          verbal_consent_gained: boolean | null
          verbal_consent_witness: string | null
          written_consent_gained: boolean | null
        }
        Insert: {
          aftercare_advice?: string | null
          ai_prefill_summary?: string | null
          allergies?: string | null
          appointment_id: string
          completed_by?: string | null
          complications?: string | null
          created_at?: string
          current_medications?: string | null
          equipment_used?: string | null
          examination_findings?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          medical_history?: string | null
          news_observations?: Json | null
          other_notes?: string | null
          outcome?: string | null
          patient_signature?: string | null
          patient_understood?: boolean | null
          practitioner_signature?: string | null
          presenting_complaint?: string | null
          procedure_notes?: string | null
          procedure_performed?: string | null
          risks_explained?: boolean | null
          updated_at?: string
          verbal_consent_gained?: boolean | null
          verbal_consent_witness?: string | null
          written_consent_gained?: boolean | null
        }
        Update: {
          aftercare_advice?: string | null
          ai_prefill_summary?: string | null
          allergies?: string | null
          appointment_id?: string
          completed_by?: string | null
          complications?: string | null
          created_at?: string
          current_medications?: string | null
          equipment_used?: string | null
          examination_findings?: string | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          medical_history?: string | null
          news_observations?: Json | null
          other_notes?: string | null
          outcome?: string | null
          patient_signature?: string | null
          patient_understood?: boolean | null
          practitioner_signature?: string | null
          presenting_complaint?: string | null
          procedure_notes?: string | null
          procedure_performed?: string | null
          risks_explained?: boolean | null
          updated_at?: string
          verbal_consent_gained?: boolean | null
          verbal_consent_witness?: string | null
          written_consent_gained?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "consultation_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      cryo_followup_templates: {
        Row: {
          created_at: string
          guidance_html: string
          heading: string
          id: string
          is_active: boolean
          subject: string
          updated_at: string
          week_number: number
        }
        Insert: {
          created_at?: string
          guidance_html: string
          heading: string
          id?: string
          is_active?: boolean
          subject: string
          updated_at?: string
          week_number: number
        }
        Update: {
          created_at?: string
          guidance_html?: string
          heading?: string
          id?: string
          is_active?: boolean
          subject?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      cryo_followups: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          patient_photo_path: string | null
          patient_response: string | null
          responded_at: string | null
          sent_at: string
          week_number: number
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          patient_photo_path?: string | null
          patient_response?: string | null
          responded_at?: string | null
          sent_at?: string
          week_number: number
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          patient_photo_path?: string | null
          patient_response?: string | null
          responded_at?: string | null
          sent_at?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cryo_followups_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          subject: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          body_html: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          subject: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          subject?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      foot_care_waitlist: {
        Row: {
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          notes: string | null
          poll_responses: Json
        }
        Insert: {
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          poll_responses?: Json
        }
        Update: {
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          poll_responses?: Json
        }
        Relationships: []
      }
      gmail_poll_state: {
        Row: {
          id: number
          last_error: string | null
          last_history_id: string | null
          last_polled_at: string | null
          last_status: string | null
        }
        Insert: {
          id?: number
          last_error?: string | null
          last_history_id?: string | null
          last_polled_at?: string | null
          last_status?: string | null
        }
        Update: {
          id?: number
          last_error?: string | null
          last_history_id?: string | null
          last_polled_at?: string | null
          last_status?: string | null
        }
        Relationships: []
      }
      google_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          id: string
          refresh_token: string
          scopes: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          refresh_token: string
          scopes?: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          refresh_token?: string
          scopes?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gov_access_log: {
        Row: {
          action: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          ip: string | null
          occurred_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          occurred_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          occurred_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      gov_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          id: string
          mime_type: string | null
          record_id: string
          record_type: string
          size_bytes: number | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          mime_type?: string | null
          record_id: string
          record_type: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string | null
          record_id?: string
          record_type?: string
          size_bytes?: number | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      gov_audits: {
        Row: {
          actions: string | null
          audit_date: string
          audit_type: string
          created_at: string
          file_paths: Json
          findings: string | null
          id: string
          next_due: string | null
          sample_size: number | null
          score: number | null
          updated_at: string
        }
        Insert: {
          actions?: string | null
          audit_date: string
          audit_type: string
          created_at?: string
          file_paths?: Json
          findings?: string | null
          id?: string
          next_due?: string | null
          sample_size?: number | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          actions?: string | null
          audit_date?: string
          audit_type?: string
          created_at?: string
          file_paths?: Json
          findings?: string | null
          id?: string
          next_due?: string | null
          sample_size?: number | null
          score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      gov_calibration_checks: {
        Row: {
          certificate_path: string | null
          check_date: string
          created_at: string
          equipment_id: string | null
          equipment_name: string | null
          id: string
          next_due: string | null
          notes: string | null
          result: string
        }
        Insert: {
          certificate_path?: string | null
          check_date: string
          created_at?: string
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          next_due?: string | null
          notes?: string | null
          result?: string
        }
        Update: {
          certificate_path?: string | null
          check_date?: string
          created_at?: string
          equipment_id?: string | null
          equipment_name?: string | null
          id?: string
          next_due?: string | null
          notes?: string | null
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_calibration_checks_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "gov_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_clinical_waste: {
        Row: {
          carrier: string | null
          collection_date: string
          consignment_note: string | null
          consignment_path: string | null
          created_at: string
          id: string
          notes: string | null
          weight_kg: number | null
        }
        Insert: {
          carrier?: string | null
          collection_date: string
          consignment_note?: string | null
          consignment_path?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          weight_kg?: number | null
        }
        Update: {
          carrier?: string | null
          collection_date?: string
          consignment_note?: string | null
          consignment_path?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      gov_complaints: {
        Row: {
          channel: string | null
          complainant: string | null
          created_at: string
          file_paths: Json
          id: string
          investigation: string | null
          outcome: string | null
          received_date: string
          resolved_date: string | null
          response: string | null
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          complainant?: string | null
          created_at?: string
          file_paths?: Json
          id?: string
          investigation?: string | null
          outcome?: string | null
          received_date: string
          resolved_date?: string | null
          response?: string | null
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          complainant?: string | null
          created_at?: string
          file_paths?: Json
          id?: string
          investigation?: string | null
          outcome?: string | null
          received_date?: string
          resolved_date?: string | null
          response?: string | null
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_compliments: {
        Row: {
          created_at: string
          id: string
          patient_ref: string | null
          received_date: string
          source: string | null
          summary: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_ref?: string | null
          received_date: string
          source?: string | null
          summary: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_ref?: string | null
          received_date?: string
          source?: string | null
          summary?: string
        }
        Relationships: []
      }
      gov_continuity_plans: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          last_tested: string | null
          next_test_due: string | null
          scenario: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          last_tested?: string | null
          next_test_due?: string | null
          scenario?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          last_tested?: string | null
          next_test_due?: string | null
          scenario?: string | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      gov_credentials: {
        Row: {
          created_at: string
          document_path: string | null
          expiry_date: string | null
          holder: string
          id: string
          issue_date: string | null
          issuer: string | null
          notes: string | null
          reference: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          expiry_date?: string | null
          holder: string
          id?: string
          issue_date?: string | null
          issuer?: string | null
          notes?: string | null
          reference?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_path?: string | null
          expiry_date?: string | null
          holder?: string
          id?: string
          issue_date?: string | null
          issuer?: string | null
          notes?: string | null
          reference?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_documents: {
        Row: {
          cqc_domain: string
          created_at: string
          description: string | null
          file_path: string
          file_size_bytes: number | null
          id: string
          label: string
          mime_type: string | null
          tags: string[]
          uploaded_by: string | null
        }
        Insert: {
          cqc_domain: string
          created_at?: string
          description?: string | null
          file_path: string
          file_size_bytes?: number | null
          id?: string
          label: string
          mime_type?: string | null
          tags?: string[]
          uploaded_by?: string | null
        }
        Update: {
          cqc_domain?: string
          created_at?: string
          description?: string | null
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          label?: string
          mime_type?: string | null
          tags?: string[]
          uploaded_by?: string | null
        }
        Relationships: []
      }
      gov_equipment: {
        Row: {
          category: string | null
          created_at: string
          filter_replacement_due: string | null
          id: string
          last_service_date: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          purchase_date: string | null
          serial_number: string | null
          service_interval_days: number | null
          status: string
          supplier: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          filter_replacement_due?: string | null
          id?: string
          last_service_date?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          service_interval_days?: number | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          filter_replacement_due?: string | null
          id?: string
          last_service_date?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          purchase_date?: string | null
          serial_number?: string | null
          service_interval_days?: number | null
          status?: string
          supplier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gov_equipment_service_log: {
        Row: {
          certificate_path: string | null
          created_at: string
          equipment_id: string
          id: string
          next_due: string | null
          notes: string | null
          performed_by: string | null
          service_date: string
          service_type: string
        }
        Insert: {
          certificate_path?: string | null
          created_at?: string
          equipment_id: string
          id?: string
          next_due?: string | null
          notes?: string | null
          performed_by?: string | null
          service_date: string
          service_type?: string
        }
        Update: {
          certificate_path?: string | null
          created_at?: string
          equipment_id?: string
          id?: string
          next_due?: string | null
          notes?: string | null
          performed_by?: string | null
          service_date?: string
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_equipment_service_log_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "gov_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_files: {
        Row: {
          created_at: string
          description: string | null
          file_path: string
          file_size_bytes: number | null
          folder_id: string | null
          id: string
          label: string
          mime_type: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path: string
          file_size_bytes?: number | null
          folder_id?: string | null
          id?: string
          label: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string
          file_size_bytes?: number | null
          folder_id?: string | null
          id?: string
          label?: string
          mime_type?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "gov_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_folders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "gov_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_gdpr_breaches: {
        Row: {
          breach_date: string
          breach_type: string
          created_at: string
          data_subjects_affected: number | null
          file_paths: Json
          ico_reportable: boolean
          ico_reported_at: string | null
          id: string
          mitigation: string | null
          scope: string | null
          status: string
          updated_at: string
        }
        Insert: {
          breach_date: string
          breach_type: string
          created_at?: string
          data_subjects_affected?: number | null
          file_paths?: Json
          ico_reportable?: boolean
          ico_reported_at?: string | null
          id?: string
          mitigation?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          breach_date?: string
          breach_type?: string
          created_at?: string
          data_subjects_affected?: number | null
          file_paths?: Json
          ico_reportable?: boolean
          ico_reported_at?: string | null
          id?: string
          mitigation?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_incidents: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          file_paths: Json
          id: string
          immediate_actions: string | null
          incident_date: string
          incident_time: string | null
          lessons_learned: string | null
          location: string | null
          patient_ref: string | null
          reported_to: string | null
          severity: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          file_paths?: Json
          id?: string
          immediate_actions?: string | null
          incident_date: string
          incident_time?: string | null
          lessons_learned?: string | null
          location?: string | null
          patient_ref?: string | null
          reported_to?: string | null
          severity?: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          file_paths?: Json
          id?: string
          immediate_actions?: string | null
          incident_date?: string
          incident_time?: string | null
          lessons_learned?: string | null
          location?: string | null
          patient_ref?: string | null
          reported_to?: string | null
          severity?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_ipc_audits: {
        Row: {
          actions: string | null
          audit_date: string
          checklist: Json | null
          created_at: string
          created_by: string | null
          file_paths: Json
          findings: string | null
          id: string
          next_due: string | null
          score: number | null
          updated_at: string
        }
        Insert: {
          actions?: string | null
          audit_date: string
          checklist?: Json | null
          created_at?: string
          created_by?: string | null
          file_paths?: Json
          findings?: string | null
          id?: string
          next_due?: string | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          actions?: string | null
          audit_date?: string
          checklist?: Json | null
          created_at?: string
          created_by?: string | null
          file_paths?: Json
          findings?: string | null
          id?: string
          next_due?: string | null
          score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      gov_lone_worker_checkins: {
        Row: {
          appointment_id: string | null
          created_at: string
          emergency_contact: string | null
          end_time: string | null
          escalated: boolean
          expected_end: string | null
          id: string
          location: string | null
          notes: string | null
          start_time: string
          status: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          end_time?: string | null
          escalated?: boolean
          expected_end?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          status?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          emergency_contact?: string | null
          end_time?: string | null
          escalated?: boolean
          expected_end?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_lone_worker_checkins_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_patient_feedback: {
        Row: {
          appointment_id: string | null
          comment: string | null
          created_at: string
          feedback_date: string
          id: string
          patient_name: string | null
          score: number | null
          source: string | null
        }
        Insert: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          feedback_date?: string
          id?: string
          patient_name?: string | null
          score?: number | null
          source?: string | null
        }
        Update: {
          appointment_id?: string | null
          comment?: string | null
          created_at?: string
          feedback_date?: string
          id?: string
          patient_name?: string | null
          score?: number | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_patient_feedback_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_risk_assessments: {
        Row: {
          category: string | null
          controls: string | null
          created_at: string
          file_path: string | null
          hazards: string | null
          id: string
          last_reviewed: string | null
          next_review: string | null
          risk_rating: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          controls?: string | null
          created_at?: string
          file_path?: string | null
          hazards?: string | null
          id?: string
          last_reviewed?: string | null
          next_review?: string | null
          risk_rating?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          controls?: string | null
          created_at?: string
          file_path?: string | null
          hazards?: string | null
          id?: string
          last_reviewed?: string | null
          next_review?: string | null
          risk_rating?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_safeguarding: {
        Row: {
          concern_date: string
          created_at: string
          created_by: string | null
          description: string
          file_paths: Json
          id: string
          outcome: string | null
          reported_to: string | null
          status: string
          subject_ref: string | null
          subject_type: string
          updated_at: string
        }
        Insert: {
          concern_date: string
          created_at?: string
          created_by?: string | null
          description: string
          file_paths?: Json
          id?: string
          outcome?: string | null
          reported_to?: string | null
          status?: string
          subject_ref?: string | null
          subject_type: string
          updated_at?: string
        }
        Update: {
          concern_date?: string
          created_at?: string
          created_by?: string | null
          description?: string
          file_paths?: Json
          id?: string
          outcome?: string | null
          reported_to?: string | null
          status?: string
          subject_ref?: string | null
          subject_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_significant_events: {
        Row: {
          actions: string | null
          created_at: string
          created_by: string | null
          event_date: string
          id: string
          learning: string | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          actions?: string | null
          created_at?: string
          created_by?: string | null
          event_date: string
          id?: string
          learning?: string | null
          status?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          actions?: string | null
          created_at?: string
          created_by?: string | null
          event_date?: string
          id?: string
          learning?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gov_training_cpd: {
        Row: {
          certificate_path: string | null
          created_at: string
          evidence: string | null
          hours: number | null
          id: string
          next_due: string | null
          provider: string | null
          staff_member: string | null
          topic: string
          training_date: string
        }
        Insert: {
          certificate_path?: string | null
          created_at?: string
          evidence?: string | null
          hours?: number | null
          id?: string
          next_due?: string | null
          provider?: string | null
          staff_member?: string | null
          topic: string
          training_date: string
        }
        Update: {
          certificate_path?: string | null
          created_at?: string
          evidence?: string | null
          hours?: number | null
          id?: string
          next_due?: string | null
          provider?: string | null
          staff_member?: string | null
          topic?: string
          training_date?: string
        }
        Relationships: []
      }
      hearing_quick_tiles: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      hearing_screening_points: {
        Row: {
          attempts: number
          catch_trials: number
          ear: Database["public"]["Enums"]["hearing_ear"]
          estimated_dbhl: number
          false_positives: number
          frequency_hz: number
          heard: boolean
          id: string
          presentations: number
          raw_log: Json | null
          screening_id: string
          step_level: number
          stimulus_db_step: number | null
        }
        Insert: {
          attempts?: number
          catch_trials?: number
          ear: Database["public"]["Enums"]["hearing_ear"]
          estimated_dbhl: number
          false_positives?: number
          frequency_hz: number
          heard: boolean
          id?: string
          presentations?: number
          raw_log?: Json | null
          screening_id: string
          step_level: number
          stimulus_db_step?: number | null
        }
        Update: {
          attempts?: number
          catch_trials?: number
          ear?: Database["public"]["Enums"]["hearing_ear"]
          estimated_dbhl?: number
          false_positives?: number
          frequency_hz?: number
          heard?: boolean
          id?: string
          presentations?: number
          raw_log?: Json | null
          screening_id?: string
          step_level?: number
          stimulus_db_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hearing_screening_points_screening_id_fkey"
            columns: ["screening_id"]
            isOneToOne: false
            referencedRelation: "hearing_screenings"
            referencedColumns: ["id"]
          },
        ]
      }
      hearing_screenings: {
        Row: {
          age_context_text: string | null
          anc_enabled: boolean | null
          clinical_summary: string | null
          clinician_id: string
          consultation_id: string | null
          created_at: string
          disclaimer_ack: boolean
          dnd_confirmed: boolean
          frequency_set: string | null
          headphones_model: string
          id: string
          left_classification:
            | Database["public"]["Enums"]["hearing_classification"]
            | null
          left_thresholds: Json | null
          notes: string | null
          overall_recommendation:
            | Database["public"]["Enums"]["hearing_recommendation"]
            | null
          patient_friendly_summary: string | null
          patient_id: string | null
          pdf_storage_path: string | null
          right_classification:
            | Database["public"]["Enums"]["hearing_classification"]
            | null
          right_thresholds: Json | null
          room_noise_metric: number | null
          room_noise_status: Database["public"]["Enums"]["hearing_room_noise"]
          screening_method: Database["public"]["Enums"]["hearing_screening_method"]
          service_context: Database["public"]["Enums"]["hearing_service_context"]
          source_pdf_path: string | null
          volume_confirmed: boolean
          volume_protocol: string
          volume_target_percent: number
        }
        Insert: {
          age_context_text?: string | null
          anc_enabled?: boolean | null
          clinical_summary?: string | null
          clinician_id: string
          consultation_id?: string | null
          created_at?: string
          disclaimer_ack?: boolean
          dnd_confirmed?: boolean
          frequency_set?: string | null
          headphones_model?: string
          id?: string
          left_classification?:
            | Database["public"]["Enums"]["hearing_classification"]
            | null
          left_thresholds?: Json | null
          notes?: string | null
          overall_recommendation?:
            | Database["public"]["Enums"]["hearing_recommendation"]
            | null
          patient_friendly_summary?: string | null
          patient_id?: string | null
          pdf_storage_path?: string | null
          right_classification?:
            | Database["public"]["Enums"]["hearing_classification"]
            | null
          right_thresholds?: Json | null
          room_noise_metric?: number | null
          room_noise_status?: Database["public"]["Enums"]["hearing_room_noise"]
          screening_method?: Database["public"]["Enums"]["hearing_screening_method"]
          service_context?: Database["public"]["Enums"]["hearing_service_context"]
          source_pdf_path?: string | null
          volume_confirmed?: boolean
          volume_protocol?: string
          volume_target_percent?: number
        }
        Update: {
          age_context_text?: string | null
          anc_enabled?: boolean | null
          clinical_summary?: string | null
          clinician_id?: string
          consultation_id?: string | null
          created_at?: string
          disclaimer_ack?: boolean
          dnd_confirmed?: boolean
          frequency_set?: string | null
          headphones_model?: string
          id?: string
          left_classification?:
            | Database["public"]["Enums"]["hearing_classification"]
            | null
          left_thresholds?: Json | null
          notes?: string | null
          overall_recommendation?:
            | Database["public"]["Enums"]["hearing_recommendation"]
            | null
          patient_friendly_summary?: string | null
          patient_id?: string | null
          pdf_storage_path?: string | null
          right_classification?:
            | Database["public"]["Enums"]["hearing_classification"]
            | null
          right_thresholds?: Json | null
          room_noise_metric?: number | null
          room_noise_status?: Database["public"]["Enums"]["hearing_room_noise"]
          screening_method?: Database["public"]["Enums"]["hearing_screening_method"]
          service_context?: Database["public"]["Enums"]["hearing_service_context"]
          source_pdf_path?: string | null
          volume_confirmed?: boolean
          volume_protocol?: string
          volume_target_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "hearing_screenings_consultation_id_fkey"
            columns: ["consultation_id"]
            isOneToOne: false
            referencedRelation: "consultation_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearing_screenings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      heidi_imports: {
        Row: {
          appointment_id: string | null
          body_text: string | null
          created_at: string
          from_address: string | null
          gmail_message_id: string
          gmail_thread_id: string | null
          id: string
          match_notes: string | null
          matched_patient_name: string | null
          received_at: string
          snippet: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body_text?: string | null
          created_at?: string
          from_address?: string | null
          gmail_message_id: string
          gmail_thread_id?: string | null
          id?: string
          match_notes?: string | null
          matched_patient_name?: string | null
          received_at?: string
          snippet?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body_text?: string | null
          created_at?: string
          from_address?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string | null
          id?: string
          match_notes?: string | null
          matched_patient_name?: string | null
          received_at?: string
          snippet?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "heidi_imports_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_inventory: {
        Row: {
          available_kits: number
          created_at: string
          id: string
          is_washable: boolean
          kit_name: string
          low_stock_threshold: number
          service_type: string
          service_types: string[]
          total_kits: number
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          available_kits?: number
          created_at?: string
          id?: string
          is_washable?: boolean
          kit_name: string
          low_stock_threshold?: number
          service_type: string
          service_types?: string[]
          total_kits?: number
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          available_kits?: number
          created_at?: string
          id?: string
          is_washable?: boolean
          kit_name?: string
          low_stock_threshold?: number
          service_type?: string
          service_types?: string[]
          total_kits?: number
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      kit_usage_log: {
        Row: {
          appointment_id: string | null
          created_at: string
          event_type: string
          id: string
          kit_id: string
          notes: string | null
          quantity: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          kit_id: string
          notes?: string | null
          quantity?: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          kit_id?: string
          notes?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_usage_log_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_usage_log_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kit_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      login_otp_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
          verify_attempts: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
          verify_attempts?: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
          verify_attempts?: number
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          body_html: string | null
          body_preview: string | null
          campaign_name: string
          channel: string
          created_at: string
          failed_count: number
          failed_recipients: Json | null
          id: string
          recipient_count: number
          sent_count: number
          subject: string | null
        }
        Insert: {
          body_html?: string | null
          body_preview?: string | null
          campaign_name: string
          channel: string
          created_at?: string
          failed_count?: number
          failed_recipients?: Json | null
          id?: string
          recipient_count?: number
          sent_count?: number
          subject?: string | null
        }
        Update: {
          body_html?: string | null
          body_preview?: string | null
          campaign_name?: string
          channel?: string
          created_at?: string
          failed_count?: number
          failed_recipients?: Json | null
          id?: string
          recipient_count?: number
          sent_count?: number
          subject?: string | null
        }
        Relationships: []
      }
      marketing_poll_responses: {
        Row: {
          answers: Json | null
          comment: string | null
          created_at: string
          id: string
          poll_id: string
          respondent_email: string | null
          respondent_name: string | null
          selected_option: string | null
        }
        Insert: {
          answers?: Json | null
          comment?: string | null
          created_at?: string
          id?: string
          poll_id: string
          respondent_email?: string | null
          respondent_name?: string | null
          selected_option?: string | null
        }
        Update: {
          answers?: Json | null
          comment?: string | null
          created_at?: string
          id?: string
          poll_id?: string
          respondent_email?: string | null
          respondent_name?: string | null
          selected_option?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_poll_responses_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "marketing_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_polls: {
        Row: {
          campaign_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          notify_email: string | null
          options: Json
          question: string
          questions: Json | null
          title: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          notify_email?: string | null
          options?: Json
          question: string
          questions?: Json | null
          title?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          notify_email?: string | null
          options?: Json
          question?: string
          questions?: Json | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_polls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_unsubscribes: {
        Row: {
          client_email: string | null
          client_phone: string | null
          created_at: string
          id: string
          reason: string
        }
        Insert: {
          client_email?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          reason: string
        }
        Update: {
          client_email?: string | null
          client_phone?: string | null
          created_at?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      mileage_day_submissions: {
        Row: {
          journey_date: string
          notes: string | null
          submitted_at: string
          submitted_by: string | null
          total_miles: number
        }
        Insert: {
          journey_date: string
          notes?: string | null
          submitted_at?: string
          submitted_by?: string | null
          total_miles?: number
        }
        Update: {
          journey_date?: string
          notes?: string | null
          submitted_at?: string
          submitted_by?: string | null
          total_miles?: number
        }
        Relationships: []
      }
      mileage_journeys: {
        Row: {
          appointment_id: string | null
          created_at: string
          from_label: string | null
          from_postcode: string | null
          hidden: boolean
          id: string
          is_return_to_base: boolean
          journey_date: string
          journey_time: string | null
          miles: number
          notes: string | null
          purpose: string | null
          source: string
          to_label: string | null
          to_postcode: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          from_label?: string | null
          from_postcode?: string | null
          hidden?: boolean
          id?: string
          is_return_to_base?: boolean
          journey_date: string
          journey_time?: string | null
          miles?: number
          notes?: string | null
          purpose?: string | null
          source?: string
          to_label?: string | null
          to_postcode?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          from_label?: string | null
          from_postcode?: string | null
          hidden?: boolean
          id?: string
          is_return_to_base?: boolean
          journey_date?: string
          journey_time?: string | null
          miles?: number
          notes?: string | null
          purpose?: string | null
          source?: string
          to_label?: string | null
          to_postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_journeys_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_places: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_base: boolean
          name: string
          postcode: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_base?: boolean
          name: string
          postcode: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_base?: boolean
          name?: string
          postcode?: string
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          closed_from: string | null
          closed_until: string | null
          created_at: string
          id: string
          is_active: boolean
          message: string
          notice_type: string
          title: string
          updated_at: string
        }
        Insert: {
          closed_from?: string | null
          closed_until?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          notice_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          closed_from?: string | null
          closed_until?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          notice_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_activity_log: {
        Row: {
          client_email: string
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          message: string
        }
        Insert: {
          client_email: string
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          message: string
        }
        Update: {
          client_email?: string
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      patient_birthday_cards: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          patient_id: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          sent_at?: string
        }
        Relationships: []
      }
      patient_files: {
        Row: {
          appointment_id: string | null
          client_email: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          uploaded_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          client_email: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          client_email?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_recalls: {
        Row: {
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          recall_date: string
          recall_months: number
          sent_at: string | null
          service_name: string | null
          status: string
        }
        Insert: {
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          recall_date: string
          recall_months: number
          sent_at?: string | null
          service_name?: string | null
          status?: string
        }
        Update: {
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          recall_date?: string
          recall_months?: number
          sent_at?: string | null
          service_name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_recalls_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          alert_note: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          date_of_birth: string | null
          deceased: boolean
          deceased_at: string | null
          google_contact_synced_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          marketing_email: boolean
          marketing_opted_in_at: string | null
          marketing_sms: boolean
          notes: string | null
          relationship_label: string | null
          relationship_to_patient_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          alert_note?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased?: boolean
          deceased_at?: string | null
          google_contact_synced_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          marketing_email?: boolean
          marketing_opted_in_at?: string | null
          marketing_sms?: boolean
          notes?: string | null
          relationship_label?: string | null
          relationship_to_patient_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          alert_note?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased?: boolean
          deceased_at?: string | null
          google_contact_synced_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          marketing_email?: boolean
          marketing_opted_in_at?: string | null
          marketing_sms?: boolean
          notes?: string | null
          relationship_label?: string | null
          relationship_to_patient_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      phone_call_sessions: {
        Row: {
          call_sid: string
          caller_number: string | null
          collected_data: Json | null
          conversation: Json | null
          created_at: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          call_sid: string
          caller_number?: string | null
          collected_data?: Json | null
          conversation?: Json | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          call_sid?: string
          caller_number?: string | null
          collected_data?: Json | null
          conversation?: Json | null
          created_at?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          letter_content: string | null
          letter_pdf_path: string | null
          notes: string | null
          patient_email: string
          patient_id: string | null
          patient_name: string
          reason: string | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_organisation: string | null
          referral_type: string
          sent_at: string | null
          sent_via: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          letter_content?: string | null
          letter_pdf_path?: string | null
          notes?: string | null
          patient_email: string
          patient_id?: string | null
          patient_name: string
          reason?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_organisation?: string | null
          referral_type?: string
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          letter_content?: string | null
          letter_pdf_path?: string | null
          notes?: string | null
          patient_email?: string
          patient_id?: string | null
          patient_name?: string
          reason?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_organisation?: string | null
          referral_type?: string
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      route_cache: {
        Row: {
          cached_at: string
          destination_postcode: string
          distance_miles: number
          drive_time_minutes: number
          id: string
          origin_postcode: string
        }
        Insert: {
          cached_at?: string
          destination_postcode: string
          distance_miles: number
          drive_time_minutes: number
          id?: string
          origin_postcode: string
        }
        Update: {
          cached_at?: string
          destination_postcode?: string
          distance_miles?: number
          drive_time_minutes?: number
          id?: string
          origin_postcode?: string
        }
        Relationships: []
      }
      scheduled_campaign_batches: {
        Row: {
          batch_number: number
          body_html: string | null
          campaign_name: string
          channel: string
          created_at: string
          failed_count: number
          failed_recipients: Json | null
          id: string
          parent_group_id: string
          recipients: Json
          scheduled_date: string
          sent_count: number
          status: string
          subject: string | null
          total_batches: number
        }
        Insert: {
          batch_number?: number
          body_html?: string | null
          campaign_name: string
          channel: string
          created_at?: string
          failed_count?: number
          failed_recipients?: Json | null
          id?: string
          parent_group_id?: string
          recipients?: Json
          scheduled_date: string
          sent_count?: number
          status?: string
          subject?: string | null
          total_batches?: number
        }
        Update: {
          batch_number?: number
          body_html?: string | null
          campaign_name?: string
          channel?: string
          created_at?: string
          failed_count?: number
          failed_recipients?: Json | null
          id?: string
          parent_group_id?: string
          recipients?: Json
          scheduled_date?: string
          sent_count?: number
          status?: string
          subject?: string | null
          total_batches?: number
        }
        Relationships: []
      }
      scheduled_communications: {
        Row: {
          appointment_id: string | null
          cancelled_at: string | null
          channel: string
          created_at: string
          id: string
          metadata: Json | null
          recipient_email: string | null
          recipient_name: string | null
          recipient_phone: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
          trigger_type: string
        }
        Insert: {
          appointment_id?: string | null
          cancelled_at?: string | null
          channel: string
          created_at?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          trigger_type: string
        }
        Update: {
          appointment_id?: string | null
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_communications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      service_addons: {
        Row: {
          additional_duration_minutes: number | null
          additional_price: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          service_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          additional_duration_minutes?: number | null
          additional_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          service_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          additional_duration_minutes?: number | null
          additional_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          service_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_addons_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_offers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          offer_name: string
          price_note: string | null
          price_text: string
          service_id: string
          sort_order: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          offer_name: string
          price_note?: string | null
          price_text: string
          service_id: string
          sort_order?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          offer_name?: string
          price_note?: string | null
          price_text?: string
          service_id?: string
          sort_order?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_offers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_waitlist: {
        Row: {
          client_email: string
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          notified_at: string | null
          service_id: string
        }
        Insert: {
          client_email: string
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          service_id: string
        }
        Update: {
          client_email?: string
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          notified_at?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_waitlist_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          consent_form_template_id: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          consent_form_template_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          consent_form_template_id?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_consent_form_template_id_fkey"
            columns: ["consent_form_template_id"]
            isOneToOne: false
            referencedRelation: "consent_form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body_text: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          trigger_type: string
          updated_at: string
        }
        Insert: {
          body_text: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          trigger_type: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_analytics_cache: {
        Row: {
          id: string
          last_month_visitors: number
          last_week_visitors: number
          this_month_visitors: number
          this_week_visitors: number
          updated_at: string
        }
        Insert: {
          id?: string
          last_month_visitors?: number
          last_week_visitors?: number
          this_month_visitors?: number
          this_week_visitors?: number
          updated_at?: string
        }
        Update: {
          id?: string
          last_month_visitors?: number
          last_week_visitors?: number
          this_month_visitors?: number
          this_week_visitors?: number
          updated_at?: string
        }
        Relationships: []
      }
      website_analytics_snapshots: {
        Row: {
          avg_pageviews_per_visit: number
          avg_session_duration_seconds: number
          bounce_rate: number
          country_breakdown: Json
          created_at: string
          daily_visitors: Json
          device_breakdown: Json
          id: string
          period_end: string
          period_start: string
          snapshot_date: string
          top_pages: Json
          top_sources: Json
          total_pageviews: number
          total_visitors: number
        }
        Insert: {
          avg_pageviews_per_visit?: number
          avg_session_duration_seconds?: number
          bounce_rate?: number
          country_breakdown?: Json
          created_at?: string
          daily_visitors?: Json
          device_breakdown?: Json
          id?: string
          period_end: string
          period_start: string
          snapshot_date?: string
          top_pages?: Json
          top_sources?: Json
          total_pageviews?: number
          total_visitors?: number
        }
        Update: {
          avg_pageviews_per_visit?: number
          avg_session_duration_seconds?: number
          bounce_rate?: number
          country_breakdown?: Json
          created_at?: string
          daily_visitors?: Json
          device_breakdown?: Json
          id?: string
          period_end?: string
          period_start?: string
          snapshot_date?: string
          top_pages?: Json
          top_sources?: Json
          total_pageviews?: number
          total_visitors?: number
        }
        Relationships: []
      }
    }
    Views: {
      gov_upcoming_renewals: {
        Row: {
          due_date: string | null
          id: string | null
          source: string | null
          status: string | null
          subtype: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_override_insert_appointment: {
        Args: { p_payload: Json }
        Returns: undefined
      }
      admin_override_update_appointment: {
        Args: { p_appointment_id: string; p_payload: Json }
        Returns: undefined
      }
      check_appointment_overlap:
        | {
            Args: {
              p_buffer_minutes?: number
              p_date: string
              p_duration_minutes: number
              p_exclude_appointment_id?: string
              p_time: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_buffer_minutes?: number
              p_date: string
              p_duration_minutes: number
              p_exclude_appointment_id?: string
              p_group_id?: string
              p_time: string
            }
            Returns: boolean
          }
      check_consent_completed: { Args: { p_token: string }; Returns: boolean }
      cleanup_old_phone_sessions: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_active_booking_holds_for_date: {
        Args: { target_date: string }
        Returns: {
          appointment_time: string
          duration_minutes: number
          session_id: string
        }[]
      }
      get_active_booking_holds_summary: {
        Args: never
        Returns: {
          appointment_date: string
          duration_minutes: number
        }[]
      }
      get_appointment_by_token: {
        Args: { p_token: string }
        Returns: {
          access_token: string
          appointment_date: string
          appointment_time: string
          client_email: string
          client_name: string
          consent_form_template_id: string
          id: string
          service_id: string
        }[]
      }
      get_booked_slots: {
        Args: { target_date: string }
        Returns: {
          appointment_time: string
        }[]
      }
      get_booked_slots_with_duration: {
        Args: { target_date: string }
        Returns: {
          appointment_time: string
          duration_minutes: number
        }[]
      }
      get_poll_result_counts: {
        Args: { p_poll_id: string }
        Returns: {
          selected_option: string
          vote_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      process_marketing_unsubscribe: {
        Args: { p_email?: string; p_phone?: string; p_reason?: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      release_booking_hold: {
        Args: { p_hold_id: string; p_session_id: string }
        Returns: undefined
      }
      resolve_appointment_access_token: {
        Args: { p_token: string }
        Returns: string
      }
      set_ready_from_time: {
        Args: { p_ready_time: string; p_token: string }
        Returns: undefined
      }
      submit_consent_response:
        | {
            Args: {
              p_responses: Json
              p_signature?: string
              p_template_id: string
              p_token: string
            }
            Returns: string
          }
        | {
            Args: {
              p_responses: Json
              p_signature?: string
              p_submitter_name?: string
              p_template_id: string
              p_token: string
            }
            Returns: string
          }
      update_booking_hold: {
        Args: {
          p_client_email?: string
          p_client_name?: string
          p_client_phone?: string
          p_help_email_sent?: boolean
          p_hold_id: string
          p_postcode?: string
          p_session_id: string
        }
        Returns: undefined
      }
      update_chat_log: {
        Args: {
          p_escalated?: boolean
          p_escalation_reason?: string
          p_messages?: Json
          p_patient_email?: string
          p_patient_phone?: string
          p_session_id: string
        }
        Returns: undefined
      }
      upsert_chat_log_messages: {
        Args: { p_messages: Json; p_session_id: string }
        Returns: undefined
      }
      upsert_patient_from_booking: {
        Args: {
          p_access_token: string
          p_address?: string
          p_client_email: string
          p_client_name: string
          p_client_phone?: string
          p_date_of_birth?: string
          p_marketing_email?: boolean
          p_marketing_sms?: boolean
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      hearing_classification:
        | "normal"
        | "mild"
        | "moderate"
        | "moderately_severe"
        | "severe"
        | "profound"
        | "inconclusive"
      hearing_ear: "left" | "right"
      hearing_recommendation:
        | "reassure"
        | "retest"
        | "refer_audiology"
        | "urgent_gp_ent"
      hearing_room_noise: "pass" | "fail" | "not_checked"
      hearing_screening_method: "shawscope" | "apple"
      hearing_service_context: "earwax_removal" | "ear_wellness" | "standalone"
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
      app_role: ["admin", "user"],
      hearing_classification: [
        "normal",
        "mild",
        "moderate",
        "moderately_severe",
        "severe",
        "profound",
        "inconclusive",
      ],
      hearing_ear: ["left", "right"],
      hearing_recommendation: [
        "reassure",
        "retest",
        "refer_audiology",
        "urgent_gp_ent",
      ],
      hearing_room_noise: ["pass", "fail", "not_checked"],
      hearing_screening_method: ["shawscope", "apple"],
      hearing_service_context: ["earwax_removal", "ear_wellness", "standalone"],
    },
  },
} as const
