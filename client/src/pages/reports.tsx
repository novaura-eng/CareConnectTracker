import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Download, FileText, TrendingUp, Calendar, Filter } from "lucide-react";

export default function Reports() {
  const [dateRange, setDateRange] = useState("this-week");
  const [reportType, setReportType] = useState("all");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: responses, isLoading: responsesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/responses"],
  });

  const getComplianceRate = () => {
    if (!stats || !stats.thisWeekTotal) return 0;
    return stats.thisWeekTotal > 0 
      ? Math.round((stats.thisWeekCompleted / stats.thisWeekTotal) * 100)
      : 0;
  };

  const getAlertRate = () => {
    if (!responses || !Array.isArray(responses) || !stats) return 0;
    const totalResponses = stats.thisWeekCompleted || 0;
    const alertResponses = responses.filter((r: any) => 
      r.response && (
        r.response.hospitalVisits === 'yes' ||
        r.response.accidentsFalls === 'yes' ||
        r.response.mentalHealth === 'yes' ||
        r.response.physicalHealth === 'yes'
      )
    ).length;
    return totalResponses > 0 ? Math.round((alertResponses / totalResponses) * 100) : 0;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header - Hidden on mobile to avoid duplication with mobile nav */}
      <header className="hidden lg:block bg-white shadow-sm border-b border-slate-200">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                <p className="mt-1 text-sm text-slate-600">Compliance reports and health trend analysis</p>
              </div>
              <div className="flex space-x-3">
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-week">This Week</SelectItem>
                    <SelectItem value="last-week">Last Week</SelectItem>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Compliance Rate</p>
                      <p className="text-3xl font-bold text-healthcare-600">
                        {statsLoading ? "..." : `${getComplianceRate()}%`}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-healthcare-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-healthcare-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="secondary" className="bg-healthcare-100 text-healthcare-800">
                      ↑ 5% from last week
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Response Rate</p>
                      <p className="text-3xl font-bold text-primary-600">
                        {statsLoading ? "..." : `${getComplianceRate()}%`}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="outline">
                      Target: 95%
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Health Alerts</p>
                      <p className="text-3xl font-bold text-red-600">
                        {statsLoading ? "..." : `${getAlertRate()}%`}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="destructive">
                      {stats?.healthIssues || 0} this week
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">Avg Response Time</p>
                      <p className="text-3xl font-bold text-yellow-600">2.3h</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Filter className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge variant="outline">
                      Target: {"<"}4h
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Compliance Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Compliance Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Total Check-ins Scheduled</p>
                          <p className="text-sm text-slate-600">This week</p>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                          {stats?.thisWeekTotal || 0}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Completed Responses</p>
                          <p className="text-sm text-slate-600">On time submissions</p>
                        </div>
                        <div className="text-2xl font-bold text-healthcare-600">
                          {stats?.thisWeekCompleted || 0}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Pending Responses</p>
                          <p className="text-sm text-slate-600">Require follow-up</p>
                        </div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {stats?.pendingResponses || 0}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Health Alerts Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Health Alert Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Hospital Visits</p>
                        <p className="text-sm text-slate-600">Emergency or scheduled</p>
                      </div>
                      <Badge variant="destructive">
                        {responses && Array.isArray(responses) ? responses.filter((r: any) => r.response?.hospitalVisits === 'yes').length : 0}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Accidents/Falls</p>
                        <p className="text-sm text-slate-600">Safety incidents</p>
                      </div>
                      <Badge variant="destructive">
                        {responses && Array.isArray(responses) ? responses.filter((r: any) => r.response?.accidentsFalls === 'yes').length : 0}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Mental Health Changes</p>
                        <p className="text-sm text-slate-600">Mood or cognitive changes</p>
                      </div>
                      <Badge variant="default">
                        {responses && Array.isArray(responses) ? responses.filter((r: any) => r.response?.mentalHealth === 'yes').length : 0}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Physical Health Changes</p>
                        <p className="text-sm text-slate-600">Physical condition changes</p>
                      </div>
                      <Badge variant="default">
                        {responses && Array.isArray(responses) ? responses.filter((r: any) => r.response?.physicalHealth === 'yes').length : 0}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Reports Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detailed Report Data</CardTitle>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reports</SelectItem>
                      <SelectItem value="compliance">Compliance Only</SelectItem>
                      <SelectItem value="alerts">Health Alerts Only</SelectItem>
                      <SelectItem value="overdue">Overdue Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {responsesLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week Period</TableHead>
                          <TableHead>Caregiver</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Response Time</TableHead>
                          <TableHead>Health Alerts</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!responses || responses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8">
                              <div className="text-slate-500">
                                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                                <p className="text-lg font-medium">No report data available</p>
                                <p className="text-sm">Reports will appear once caregivers start submitting check-ins</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          responses.slice(0, 10).map((item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell className="text-sm">
                                {new Date(item.checkIn.weekStartDate).toLocaleDateString()} - {new Date(item.checkIn.weekEndDate).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {item.caregiver?.name || "Unknown"}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.patient?.name || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={item.response ? "secondary" : "destructive"}
                                  className={item.response ? "bg-healthcare-100 text-healthcare-800" : ""}
                                >
                                  {item.response ? "Completed" : "Pending"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {item.response ? "2.1h" : "-"}
                              </TableCell>
                              <TableCell>
                                {item.response && (
                                  item.response.hospitalVisits === 'yes' ||
                                  item.response.accidentsFalls === 'yes' ||
                                  item.response.mentalHealth === 'yes' ||
                                  item.response.physicalHealth === 'yes'
                                ) ? (
                                  <Badge variant="destructive">Alert</Badge>
                                ) : item.response ? (
                                  <Badge variant="outline">Normal</Badge>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
    </div>
  );
}