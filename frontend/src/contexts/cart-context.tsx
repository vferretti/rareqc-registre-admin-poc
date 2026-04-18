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

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        isLoading,
        selectedParticipantIds,
        addParticipants: addItems,
        removeParticipants: removeItems,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
