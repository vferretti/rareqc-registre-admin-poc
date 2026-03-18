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
  apartment_number: string;
  street_address: string;
  city: string;
  province: string;
  code_postal: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

/** Computed identifiers for participant deduplication. */
export interface Guid {
  id: number;
  participant_id: number;
  guid_basic: string;
  guid_ramq?: string | null;
  guid_birthplace?: string | null;
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
  guid?: Guid | null;
  created_at: string;
  updated_at: string;
}

/** A reference table entry (enum). */
export interface EnumValue {
  code: string;
  name_en: string;
  name_fr: string;
}

/** All reference data returned by GET /api/enums. */
export interface EnumsResponse {
  sex_at_birth: EnumValue[];
  vital_status: EnumValue[];
  relationship: EnumValue[];
  action_type: EnumValue[];
}

/** Generic paginated API response wrapper. */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page_index: number;
  page_size: number;
  total_pages: number;
}
