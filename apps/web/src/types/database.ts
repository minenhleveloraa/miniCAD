export type IncidentPriority = "low" | "medium" | "high" | "critical";

export type IncidentStatus =
  | "new"
  | "dispatched"
  | "claimed"
  | "en_route"
  | "on_scene"
  | "resolved";

export type IncidentRow = {
  caller_name: string;
  caller_phone: string;
  claimed_at: string | null;
  claimed_by: string | null;
  created_at: string;
  created_by: string;
  description: string;
  dispatched_at: string | null;
  en_route_at: string | null;
  id: string;
  incident_number: number;
  incident_type: string;
  location: string;
  on_scene_at: string | null;
  priority: IncidentPriority;
  resolved_at: string | null;
  status: IncidentStatus;
  updated_at: string;
};

export type IncidentInsert = {
  caller_name: string;
  caller_phone: string;
  claimed_at?: string | null;
  claimed_by?: string | null;
  created_at?: string;
  created_by: string;
  description: string;
  dispatched_at?: string | null;
  en_route_at?: string | null;
  id?: string;
  incident_number?: never;
  incident_type: string;
  location: string;
  on_scene_at?: string | null;
  priority: IncidentPriority;
  resolved_at?: string | null;
  status?: IncidentStatus;
  updated_at?: string;
};

export type IncidentUpdate = Partial<Omit<IncidentInsert, "incident_number">>;

export type ProfileRole = "dispatcher" | "officer";

export type ProfileRow = {
  badge_number: string | null;
  created_at: string;
  display_name: string;
  id: string;
  role: ProfileRole;
  updated_at: string;
};

export type ProfileInsert = {
  badge_number?: string | null;
  created_at?: string;
  display_name: string;
  id: string;
  role: ProfileRole;
  updated_at?: string;
};

export type OfficerDutyRow = {
  changed_at: string;
  is_on_duty: boolean;
  officer_id: string;
};

export type IncidentReportRow = {
  actions_taken: string;
  created_at: string;
  id: string;
  incident_id: string;
  officer_id: string;
  outcome: string;
  resolved_at: string;
  updated_at: string;
};

/**
 * Minimal generated-style database definition for the schema used today.
 *
 * Keep this file aligned with `supabase/migrations`. Once a remote project is
 * linked, it can be replaced by `supabase gen types typescript` output.
 */
export type Database = {
  public: {
    CompositeTypes: Record<never, never>;
    Enums: Record<never, never>;
    Functions: {
      advance_incident_status: {
        Args: { p_incident_id: string; p_next_status: "en_route" | "on_scene" };
        Returns: IncidentRow;
      };
      claim_incident: {
        Args: { p_incident_id: string };
        Returns: IncidentRow;
      };
      dispatch_incident: {
        Args: { p_incident_id: string };
        Returns: IncidentRow;
      };
      register_officer_push_token: {
        Args: { p_expo_push_token: string; p_platform: "android" | "ios" };
        Returns: undefined;
      };
      set_officer_duty: {
        Args: { p_is_on_duty: boolean };
        Returns: OfficerDutyRow;
      };
      submit_incident_report: {
        Args: { p_actions_taken: string; p_incident_id: string; p_outcome: string };
        Returns: IncidentReportRow;
      };
    };
    Tables: {
      incident_reports: {
        Insert: Omit<IncidentReportRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incident_reports_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: true;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incident_reports_officer_id_fkey";
            columns: ["officer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Row: IncidentReportRow;
        Update: Partial<IncidentReportRow>;
      };
      incidents: {
        Insert: IncidentInsert;
        Relationships: [
          {
            foreignKeyName: "incidents_claimed_by_fkey";
            columns: ["claimed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
        Row: IncidentRow;
        Update: IncidentUpdate;
      };
      officer_duty: {
        Insert: {
          changed_at?: string;
          is_on_duty?: boolean;
          officer_id: string;
        };
        Relationships: [
          {
            foreignKeyName: "officer_duty_officer_id_fkey";
            columns: ["officer_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
        Row: OfficerDutyRow;
        Update: {
          changed_at?: string;
          is_on_duty?: boolean;
          officer_id?: string;
        };
      };
      profiles: {
        Insert: ProfileInsert;
        Relationships: [];
        Row: ProfileRow;
        Update: Partial<ProfileInsert>;
      };
    };
    Views: Record<never, never>;
  };
};
