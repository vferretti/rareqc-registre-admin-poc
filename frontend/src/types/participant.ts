/**
 * Re-exports from the generated API client.
 * Do not define types manually — update backend swagger annotations and run `make generate`.
 */
export type {
  Contact,
  CreateContactRequest,
  CreateParticipantRequest,
  EnumsData as EnumsResponse,
  Guid,
  Participant,
  ParticipantListItem,
  UpdateParticipantRequest,
} from "../../api/api";

/** A reference table entry (enum) — matches the shape of all generated enum types. */
export interface EnumValue {
  code?: string;
  name_en?: string;
  name_fr?: string;
}

/** Generic paginated API response wrapper (not in generated spec — swag produces concrete types). */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page_index: number;
  page_size: number;
  total_pages: number;
}
