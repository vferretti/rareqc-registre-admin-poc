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
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page_index: number;
  page_size: number;
  total_pages: number;
}
