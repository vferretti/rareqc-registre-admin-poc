import useSWR from "swr";
import api from "@/lib/api";
import type { CartItem, CartResponse, CartMutationResponse } from "@/types/cart";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Hook for managing the participant cart. */
export function useCart() {
  const { data, isLoading, mutate } = useSWR<CartResponse>("/cart/items", fetcher);

  const items: CartItem[] = data?.items ?? [];
  const count = data?.count ?? 0;

  const addItems = async (participantIds: number[]) => {
    await api.post<CartMutationResponse>("/cart/items", { participant_ids: participantIds });
    mutate();
  };

  const removeItems = async (participantIds: number[]) => {
    await api.delete<CartMutationResponse>("/cart/items", {
      data: { participant_ids: participantIds },
    });
    mutate();
  };

  const clearCart = async () => {
    await api.delete<CartMutationResponse>("/cart");
    mutate();
  };

  return { items, count, isLoading, addItems, removeItems, clearCart };
}
