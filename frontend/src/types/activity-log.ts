/** An entry in the activity log tracking actions on participants and contacts. */
export interface ActivityLog {
  id: number;
  action_type_code: string;
  participant_id: number | null;
  participant_name?: string | null;
  author: string;
  details: string | null;
  created_at: string;
}
