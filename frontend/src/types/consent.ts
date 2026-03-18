/** A participant's consent to a specific clause. */
export interface ConsentResponse {
  id: number;
  clause_type_code: string;
  clause_fr: string;
  clause_en: string;
  status_code: string;
  date: string;
  signed_by_id?: number | null;
  signed_by_name?: string;
  signed_by_relationship?: string;
}
