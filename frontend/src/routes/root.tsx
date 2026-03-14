import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/navbar";

export default function Root() {
  return (
    <div className="min-h-screen bg-table-header">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
