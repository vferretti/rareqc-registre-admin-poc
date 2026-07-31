import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import type {
  CartItem,
  CartResponse,
  CartMutationResponse,
} from "@/types/cart";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/** Hook for managing the participant cart. */
export function useCart() {
  const {
    data,
    error: fetchError,
    isLoading,
    mutate,
  } = useSWR<CartResponse>("/cart/items", fetcher);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const items: CartItem[] = useMemo(() => data?.items ?? [], [data]);
  const count = data?.count ?? 0;
  const error = fetchError ?? mutationError;

  const addItems = useCallback(
    async (participantIds: number[]) => {
      try {
        setMutationError(null);
        await api.post<CartMutationResponse>("/cart/items", {
          participant_ids: participantIds,
        });
        mutate();
      } catch {
        setMutationError("Failed to add items to cart");
      }
    },
    [mutate],
  );

  const removeItems = useCallback(
    async (participantIds: number[]) => {
      try {
        setMutationError(null);
        await api.delete<CartMutationResponse>("/cart/items", {
          data: { participant_ids: participantIds },
        });
        mutate();
      } catch {
        setMutationError("Failed to remove items from cart");
      }
    },
    [mutate],
  );

  const clearCart = useCallback(async () => {
    try {
      setMutationError(null);
      await api.delete<CartMutationResponse>("/cart");
      mutate();
    } catch {
      setMutationError("Failed to clear cart");
    }
  }, [mutate]);

  return { items, count, error, isLoading, addItems, removeItems, clearCart };
}
