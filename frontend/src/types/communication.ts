/** A communication attempt with a participant (API response with flattened fields). */
export interface CommunicationResponse {
  id: number;
  participant_id: number;
  contact_id: number;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_value?: string | null;
  method_code: string;
  method_name_fr: string;
  method_name_en: string;
  subject_code: string;
  subject_name_fr: string;
  subject_name_en: string;
  outcome_code?: string | null;
  outcome_name_fr?: string;
  outcome_name_en?: string;
  communication_date: string;
  author: string;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload for creating a communication. */
export interface CreateCommunicationRequest {
  contact_id: number;
  contact_value?: string | null;
  method_code: string;
  subject_code: string;
  outcome_code?: string | null;
  communication_date: string;
  comment?: string | null;
}

/** Payload for updating a communication. */
export interface UpdateCommunicationRequest {
  contact_id: number;
  contact_value?: string | null;
  method_code: string;
  subject_code: string;
  outcome_code?: string | null;
  communication_date: string;
  comment?: string | null;
}
