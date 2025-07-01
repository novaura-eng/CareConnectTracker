import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, AlertTriangle, Hospital, Users } from "lucide-react";

interface StatsCardsProps {
  stats: any;
  isLoading: boolean;
}

export default function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const responseRate = stats?.thisWeekTotal > 0 
    ? Math.round((stats.thisWeekCompleted / stats.thisWeekTotal) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-healthcare-100 rounded-lg flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-healthcare-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">This Week</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats?.thisWeekCompleted || 0}/{stats?.thisWeekTotal || 0}
              </p>
              <p className="text-xs text-healthcare-600">{responseRate}% response rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Pending</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.pendingResponses || 0}</p>
              <p className="text-xs text-yellow-600">Need follow-up</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <Hospital className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Health Issues</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.healthIssues || 0}</p>
              <p className="text-xs text-red-600">Require attention</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Caregivers</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalCaregivers || 0}</p>
              <p className="text-xs text-primary-600">Active this month</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
