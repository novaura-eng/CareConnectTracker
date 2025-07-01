import { useQuery } from "@tanstack/react-query";
import StatsCards from "./stats-cards";
import ResponseTable from "./response-table";
import { Button } from "@/components/ui/button";
import { Download, Send } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: responses, isLoading: responsesLoading } = useQuery({
    queryKey: ["/api/admin/responses"],
  });

  return (
    <div className="flex-1 bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Weekly Check-ins Dashboard</h1>
              <p className="mt-1 text-sm text-slate-600">Monitor caregiver responses and track compliance</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button size="sm">
                <Send className="mr-2 h-4 w-4" />
                Send Reminders
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <StatsCards stats={stats} isLoading={statsLoading} />
        <ResponseTable responses={responses} isLoading={responsesLoading} />
      </main>
    </div>
  );
}
