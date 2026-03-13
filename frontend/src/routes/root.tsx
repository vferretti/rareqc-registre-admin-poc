import { Outlet } from "react-router";
import { Navbar } from "@/components/layout/navbar";

export default function Root() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
