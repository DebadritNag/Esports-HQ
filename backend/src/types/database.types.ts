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
      achievement_evidence: {
        Row: {
          achievement_id: string
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          achievement_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          achievement_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievement_evidence_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          awarded_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          placement: number | null
          scope: Database["public"]["Enums"]["achievement_scope"]
          team_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          awarded_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          placement?: number | null
          scope: Database["public"]["Enums"]["achievement_scope"]
          team_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          awarded_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          placement?: number | null
          scope?: Database["public"]["Enums"]["achievement_scope"]
          team_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "achievements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      event_changes: {
        Row: {
          actor_id: string | null
          actor_label: string | null
          change_source: Database["public"]["Enums"]["source_type"] | null
          changed_at: string
          changed_field: string
          event_id: string
          id: string
          new_value: Json | null
          notifications_generated: boolean
          previous_value: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_label?: string | null
          change_source?: Database["public"]["Enums"]["source_type"] | null
          changed_at?: string
          changed_field: string
          event_id: string
          id?: string
          new_value?: Json | null
          notifications_generated?: boolean
          previous_value?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_label?: string | null
          change_source?: Database["public"]["Enums"]["source_type"] | null
          changed_at?: string
          changed_field?: string
          event_id?: string
          id?: string
          new_value?: Json | null
          notifications_generated?: boolean
          previous_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "event_changes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sources: {
        Row: {
          content_hash: string | null
          event_id: string
          external_message_id: string | null
          first_seen_at: string
          id: string
          last_seen_at: string
          original_url: string | null
          raw: Json
          source_connection_id: string | null
          source_published_at: string | null
        }
        Insert: {
          content_hash?: string | null
          event_id: string
          external_message_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          original_url?: string | null
          raw?: Json
          source_connection_id?: string | null
          source_published_at?: string | null
        }
        Update: {
          content_hash?: string | null
          event_id?: string
          external_message_id?: string | null
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          original_url?: string | null
          raw?: Json
          source_connection_id?: string | null
          source_published_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_sources_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sources_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          check_in_at: string | null
          confirmation_status: Database["public"]["Enums"]["confirmation_status"]
          created_at: string
          created_by: string | null
          description: string | null
          event_status: Database["public"]["Enums"]["event_status"]
          event_type: Database["public"]["Enums"]["event_type"]
          game: string
          id: string
          is_recurring_occurrence: boolean
          last_verified_at: string | null
          match_starts_at: string | null
          occurrence_date: string | null
          organizer_id: string
          recurrence_rule_id: string | null
          registration_closes_at: string | null
          registration_opens_at: string | null
          registration_url: string | null
          source_connection_id: string | null
          source_external_id: string | null
          source_message_url: string | null
          stream_starts_at: string | null
          stream_url: string | null
          timezone: string
          title: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string | null
          confirmation_status?: Database["public"]["Enums"]["confirmation_status"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_status?: Database["public"]["Enums"]["event_status"]
          event_type?: Database["public"]["Enums"]["event_type"]
          game?: string
          id?: string
          is_recurring_occurrence?: boolean
          last_verified_at?: string | null
          match_starts_at?: string | null
          occurrence_date?: string | null
          organizer_id: string
          recurrence_rule_id?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_url?: string | null
          source_connection_id?: string | null
          source_external_id?: string | null
          source_message_url?: string | null
          stream_starts_at?: string | null
          stream_url?: string | null
          timezone?: string
          title: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string | null
          confirmation_status?: Database["public"]["Enums"]["confirmation_status"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_status?: Database["public"]["Enums"]["event_status"]
          event_type?: Database["public"]["Enums"]["event_type"]
          game?: string
          id?: string
          is_recurring_occurrence?: boolean
          last_verified_at?: string | null
          match_starts_at?: string | null
          occurrence_date?: string | null
          organizer_id?: string
          recurrence_rule_id?: string | null
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_url?: string | null
          source_connection_id?: string | null
          source_external_id?: string | null
          source_message_url?: string | null
          stream_starts_at?: string | null
          stream_url?: string | null
          timezone?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recurrence_rule_id_fkey"
            columns: ["recurrence_rule_id"]
            isOneToOne: false
            referencedRelation: "recurrence_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_health: {
        Row: {
          checked_at: string
          component: string
          detail: string | null
          id: string
          latency_ms: number | null
          source_connection_id: string | null
          status: Database["public"]["Enums"]["connection_status"]
        }
        Insert: {
          checked_at?: string
          component: string
          detail?: string | null
          id?: string
          latency_ms?: number | null
          source_connection_id?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Update: {
          checked_at?: string
          component?: string
          detail?: string | null
          id?: string
          latency_ms?: number | null
          source_connection_id?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
        }
        Relationships: [
          {
            foreignKeyName: "integration_health_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          created_at: string
          id: string
          match_id: string
          placement: number | null
          slot_label: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          placement?: number | null
          slot_label?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          placement?: number | null
          slot_label?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_participants_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_statistics: {
        Row: {
          created_at: string
          damage: number
          extra: Json
          id: string
          kills: number
          knocks: number
          match_id: string
          participant_id: string | null
          placement_points: number
          survival_seconds: number
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          damage?: number
          extra?: Json
          id?: string
          kills?: number
          knocks?: number
          match_id: string
          participant_id?: string | null
          placement_points?: number
          survival_seconds?: number
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          damage?: number
          extra?: Json
          id?: string
          kills?: number
          knocks?: number
          match_id?: string
          participant_id?: string | null
          placement_points?: number
          survival_seconds?: number
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_statistics_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_statistics_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "match_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_statistics_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          ended_at: string | null
          event_id: string | null
          id: string
          map_name: string | null
          organizer_id: string | null
          round_label: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          event_id?: string | null
          id?: string
          map_name?: string | null
          organizer_id?: string | null
          round_label?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          event_id?: string | null
          id?: string
          map_name?: string | null
          organizer_id?: string | null
          round_label?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempted_at: string
          channel: Database["public"]["Enums"]["notification_channel"]
          error_category: string | null
          error_detail: string | null
          id: string
          provider_reference: string | null
          reminder_job_id: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          channel: Database["public"]["Enums"]["notification_channel"]
          error_category?: string | null
          error_detail?: string | null
          id?: string
          provider_reference?: string | null
          reminder_job_id?: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          error_category?: string | null
          error_detail?: string | null
          id?: string
          provider_reference?: string | null
          reminder_job_id?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_reminder_job_id_fkey"
            columns: ["reminder_job_id"]
            isOneToOne: false
            referencedRelation: "reminder_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "notification_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_subscriptions: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          keys: Json
          last_used_at: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          keys?: Json
          last_used_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          keys?: Json
          last_used_at?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organizer_follows: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organizer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organizer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organizer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_follows_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          created_at: string
          created_by: string | null
          default_registration_time: string | null
          default_stream_time: string | null
          description: string | null
          discord_invite_url: string | null
          game: string
          id: string
          is_verified: boolean
          name: string
          slug: string
          timezone: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_registration_time?: string | null
          default_stream_time?: string | null
          description?: string | null
          discord_invite_url?: string | null
          game?: string
          id?: string
          is_verified?: boolean
          name: string
          slug: string
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_registration_time?: string | null
          default_stream_time?: string | null
          description?: string | null
          discord_invite_url?: string | null
          game?: string
          id?: string
          is_verified?: boolean
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          display_name: string | null
          id: string
          timezone: string
          updated_at: string
          username: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string
          username: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recurrence_rules: {
        Row: {
          check_in_at: string | null
          created_at: string
          days_of_week: number[]
          effective_from: string
          effective_until: string | null
          id: string
          is_active: boolean
          match_starts_at: string | null
          name: string
          organizer_id: string
          registration_closes_at: string | null
          registration_opens_at: string | null
          source_connection_id: string | null
          stream_starts_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          check_in_at?: string | null
          created_at?: string
          days_of_week: number[]
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          match_starts_at?: string | null
          name: string
          organizer_id: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          source_connection_id?: string | null
          stream_starts_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          check_in_at?: string | null
          created_at?: string
          days_of_week?: number[]
          effective_from?: string
          effective_until?: string | null
          id?: string
          is_active?: boolean
          match_starts_at?: string | null
          name?: string
          organizer_id?: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          source_connection_id?: string | null
          stream_starts_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rules_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rules_source_connection_id_fkey"
            columns: ["source_connection_id"]
            isOneToOne: false
            referencedRelation: "source_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_jobs: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_id: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          status: Database["public"]["Enums"]["reminder_job_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_id: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          status?: Database["public"]["Enums"]["reminder_job_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_id?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string | null
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          scheduled_for?: string
          status?: Database["public"]["Enums"]["reminder_job_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_jobs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_preferences: {
        Row: {
          check_in_lead_minutes: number
          check_in_reminders_enabled: boolean
          created_at: string
          event_id: string | null
          id: string
          match_lead_minutes: number
          match_reminders_enabled: boolean
          organizer_id: string | null
          registration_lead_minutes: number
          registration_reminders_enabled: boolean
          stream_lead_minutes: number
          stream_reminders_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_lead_minutes?: number
          check_in_reminders_enabled?: boolean
          created_at?: string
          event_id?: string | null
          id?: string
          match_lead_minutes?: number
          match_reminders_enabled?: boolean
          organizer_id?: string | null
          registration_lead_minutes?: number
          registration_reminders_enabled?: boolean
          stream_lead_minutes?: number
          stream_reminders_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_lead_minutes?: number
          check_in_reminders_enabled?: boolean
          created_at?: string
          event_id?: string | null
          id?: string
          match_lead_minutes?: number
          match_reminders_enabled?: boolean
          organizer_id?: string | null
          registration_lead_minutes?: number
          registration_reminders_enabled?: boolean
          stream_lead_minutes?: number
          stream_reminders_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_preferences_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminder_preferences_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      source_connections: {
        Row: {
          config: Json
          connection_status: Database["public"]["Enums"]["connection_status"]
          created_at: string
          created_by: string | null
          external_source_id: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          last_success_at: string | null
          organizer_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          source_url: string | null
          updated_at: string
          vault_secret_id: string | null
        }
        Insert: {
          config?: Json
          connection_status?: Database["public"]["Enums"]["connection_status"]
          created_at?: string
          created_by?: string | null
          external_source_id?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          organizer_id: string
          source_type: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          updated_at?: string
          vault_secret_id?: string | null
        }
        Update: {
          config?: Json
          connection_status?: Database["public"]["Enums"]["connection_status"]
          created_at?: string
          created_by?: string | null
          external_source_id?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          organizer_id?: string
          source_type?: Database["public"]["Enums"]["source_type"]
          source_url?: string | null
          updated_at?: string
          vault_secret_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_connections_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_attachments: {
        Row: {
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
          strategy_room_id: string
          team_id: string
          uploaded_by: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
          strategy_room_id: string
          team_id: string
          uploaded_by?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
          strategy_room_id?: string
          team_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_attachments_strategy_room_id_fkey"
            columns: ["strategy_room_id"]
            isOneToOne: false
            referencedRelation: "strategy_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_attachments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_rooms: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_rooms_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_announcements: {
        Row: {
          author_id: string | null
          body: string | null
          created_at: string
          id: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_announcements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          invited_email: string | null
          invited_user_id: string | null
          responded_at: string | null
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_email?: string | null
          invited_user_id?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_email?: string | null
          invited_user_id?: string | null
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          jersey_number: number | null
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          jersey_number?: number | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          jersey_number?: number | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          bio: string | null
          created_at: string
          game: string
          id: string
          logo_path: string | null
          name: string
          owner_id: string
          slug: string
          tag: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          game?: string
          id?: string
          logo_path?: string | null
          name: string
          owner_id: string
          slug: string
          tag?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          game?: string
          id?: string
          logo_path?: string | null
          name?: string
          owner_id?: string
          slug?: string
          tag?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_event_tracking: {
        Row: {
          created_at: string
          event_id: string
          id: string
          personal_notes: string | null
          registration_status: Database["public"]["Enums"]["registration_status"]
          tracking_status: Database["public"]["Enums"]["tracking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          personal_notes?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
          tracking_status?: Database["public"]["Enums"]["tracking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          personal_notes?: string | null
          registration_status?: Database["public"]["Enums"]["registration_status"]
          tracking_status?: Database["public"]["Enums"]["tracking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_tracking_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_due_reminder_jobs: {
        Args: { p_limit?: number; p_worker: string }
        Returns: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_id: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          status: Database["public"]["Enums"]["reminder_job_status"]
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "reminder_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      expire_stale_reminder_jobs: { Args: never; Returns: number }
      generate_recurrence_occurrences: {
        Args: { p_horizon_days?: number }
        Returns: number
      }
      has_team_role: {
        Args: {
          p_roles: Database["public"]["Enums"]["team_role"][]
          p_team_id: string
        }
        Returns: boolean
      }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      regenerate_event_reminders: {
        Args: { p_event_id: string }
        Returns: number
      }
      regenerate_reminder_jobs: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: number
      }
      requeue_stuck_reminder_jobs: {
        Args: { p_stuck_minutes?: number }
        Returns: number
      }
      resolve_reminder_preference: {
        Args: { p_event_id: string; p_user_id: string }
        Returns: {
          check_in_lead_minutes: number
          check_in_reminders_enabled: boolean
          match_lead_minutes: number
          match_reminders_enabled: boolean
          registration_lead_minutes: number
          registration_reminders_enabled: boolean
          stream_lead_minutes: number
          stream_reminders_enabled: boolean
        }[]
      }
    }
    Enums: {
      achievement_scope: "personal" | "team"
      confirmation_status: "unconfirmed" | "confirmed" | "needs_review"
      connection_status:
        | "pending"
        | "active"
        | "degraded"
        | "error"
        | "disabled"
      delivery_status: "sent" | "failed" | "skipped"
      event_status:
        | "scheduled"
        | "registration_open"
        | "registration_closed"
        | "live"
        | "completed"
        | "cancelled"
        | "postponed"
      event_type:
        | "tournament"
        | "scrim"
        | "qualifier"
        | "showmatch"
        | "league"
        | "other"
      invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "revoked"
        | "expired"
      notification_channel: "web_push" | "email"
      registration_status:
        | "none"
        | "intending"
        | "registered"
        | "waitlisted"
        | "withdrawn"
        | "confirmed"
      reminder_job_status:
        | "pending"
        | "processing"
        | "delivered"
        | "failed"
        | "cancelled"
        | "expired"
      reminder_type:
        | "registration_open"
        | "registration_close"
        | "check_in"
        | "stream"
        | "match"
      source_type: "discord" | "website" | "api" | "rss" | "ical" | "manual"
      team_role: "owner" | "manager" | "captain" | "member" | "substitute"
      tracking_status:
        | "interested"
        | "registered"
        | "not_participating"
        | "completed"
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
    Enums: {
      achievement_scope: ["personal", "team"],
      confirmation_status: ["unconfirmed", "confirmed", "needs_review"],
      connection_status: ["pending", "active", "degraded", "error", "disabled"],
      delivery_status: ["sent", "failed", "skipped"],
      event_status: [
        "scheduled",
        "registration_open",
        "registration_closed",
        "live",
        "completed",
        "cancelled",
        "postponed",
      ],
      event_type: [
        "tournament",
        "scrim",
        "qualifier",
        "showmatch",
        "league",
        "other",
      ],
      invitation_status: [
        "pending",
        "accepted",
        "declined",
        "revoked",
        "expired",
      ],
      notification_channel: ["web_push", "email"],
      registration_status: [
        "none",
        "intending",
        "registered",
        "waitlisted",
        "withdrawn",
        "confirmed",
      ],
      reminder_job_status: [
        "pending",
        "processing",
        "delivered",
        "failed",
        "cancelled",
        "expired",
      ],
      reminder_type: [
        "registration_open",
        "registration_close",
        "check_in",
        "stream",
        "match",
      ],
      source_type: ["discord", "website", "api", "rss", "ical", "manual"],
      team_role: ["owner", "manager", "captain", "member", "substitute"],
      tracking_status: [
        "interested",
        "registered",
        "not_participating",
        "completed",
      ],
    },
  },
} as const
