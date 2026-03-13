import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/navbar";

export default function Root() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
