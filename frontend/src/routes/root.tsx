import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/navbar";
import { CartProvider } from "@/contexts/cart-context";

export default function Root() {
  return (
    <CartProvider>
      <div className="min-h-screen bg-table-header">
        <Navbar />
        <main>
          <Outlet />
        </main>
      </div>
    </CartProvider>
  );
}
