import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/components/admin/dashboard";

export default function Admin() {
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Dashboard />
      </div>
    </div>
  );
}
