import { createContext, useContext } from "react";
import type { CartItem } from "@/types/cart";

export interface CartContextValue {
  items: CartItem[];
  count: number;
  isLoading: boolean;
  selectedParticipantIds: Set<number>;
  addParticipants: (participantIds: number[]) => Promise<void>;
  removeParticipants: (participantIds: number[]) => Promise<void>;
  clearCart: () => Promise<void>;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}
