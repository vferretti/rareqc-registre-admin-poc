import { useMemo } from "react";
import { useCart } from "@/hooks/useCart";
import { CartContext } from "@/contexts/use-cart-context";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, count, isLoading, addItems, removeItems, clearCart } =
    useCart();

  const selectedParticipantIds = useMemo(
    () => new Set(items.map((item) => item.participant_id)),
    [items],
  );

  // Memoized so consumers only re-render when the cart actually changes.
  const value = useMemo(
    () => ({
      items,
      count,
      isLoading,
      selectedParticipantIds,
      addParticipants: addItems,
      removeParticipants: removeItems,
      clearCart,
    }),
    [
      items,
      count,
      isLoading,
      selectedParticipantIds,
      addItems,
      removeItems,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
