/** A cart item with participant data joined by the backend. */
export interface CartItem {
  id: number;
  participant_id: number;
  first_name: string;
  last_name: string;
  ramq: string | null;
  date_of_birth: string;
  sex_at_birth_code: string;
  created_at: string;
}

export interface AddCartItemsRequest {
  participant_ids: number[];
}

export interface RemoveCartItemsRequest {
  participant_ids: number[];
}

export interface CartResponse {
  items: CartItem[];
  count: number;
}

export interface CartMutationResponse {
  success: boolean;
  count: number;
}
