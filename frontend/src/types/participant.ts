/** A contact person associated with a participant (including the "self" contact for own coordinates). */
export interface Contact {
  id: number;
  participant_id: number;
  first_name: string;
  last_name: string;
  relationship_code: string;
  is_primary: boolean;
  email: string;
  phone: string;
  street_address: string;
  city: string;
  province: string;
  code_postal: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

/** A patient in the rare disease registry. */
export interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  city_of_birth?: string | null;
  ramq?: string | null;
  sex_at_birth_code: string;
  vital_status_code: string;
  date_of_death?: string | null;
  contacts?: Contact[];
  created_at: string;
  updated_at: string;
}

/** Generic paginated API response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page_index: number;
  page_size: number;
  total_pages: number;
}
