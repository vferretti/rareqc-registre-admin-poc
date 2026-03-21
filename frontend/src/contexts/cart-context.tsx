import { createContext, useContext, useMemo } from "react";
import { useCart } from "@/hooks/useCart";
import type { CartItem } from "@/types/cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  isLoading: boolean;
  selectedParticipantIds: Set<number>;
  addParticipants: (participantIds: number[]) => Promise<void>;
  removeParticipants: (participantIds: number[]) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, count, isLoading, addItems, removeItems, clearCart } = useCart();

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

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}
