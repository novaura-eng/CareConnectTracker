import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Clock, AlertTriangle, Hospital, Eye, Phone } from "lucide-react";

interface ResponseTableProps {
  responses: any[];
  isLoading: boolean;
}

export default function ResponseTable({ responses, isLoading }: ResponseTableProps) {
  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${startStr}-${endStr}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (checkIn: any, response: any) => {
    if (response) {
      return (
        <Badge variant="secondary" className="bg-healthcare-100 text-healthcare-800">
          <Check className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    }
    
    const weekEnd = new Date(checkIn.weekEndDate);
    const now = new Date();
    
    if (now > weekEnd) {
      return (
        <Badge variant="destructive">
          <Clock className="mr-1 h-3 w-3" />
          Overdue
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline">
        <Clock className="mr-1 h-3 w-3" />
        Pending
      </Badge>
    );
  };

  const getAlertBadge = (response: any) => {
    if (!response) return <span className="text-sm text-slate-500">None</span>;

    const alerts = [];
    if (response.hospitalVisits === 'yes') alerts.push('Hospital Visit');
    if (response.accidentsFalls === 'yes') alerts.push('Accident/Fall');
    if (response.mentalHealth === 'yes') alerts.push('Mental Health');
    if (response.physicalHealth === 'yes') alerts.push('Physical Health');

    if (alerts.length === 0) {
      return <span className="text-sm text-slate-500">None</span>;
    }

    const isHospital = alerts.includes('Hospital Visit');
    const isHealth = alerts.some(a => a.includes('Health'));

    return (
      <Badge variant={isHospital ? "destructive" : isHealth ? "default" : "secondary"}>
        {isHospital && <Hospital className="mr-1 h-3 w-3" />}
        {!isHospital && isHealth && <AlertTriangle className="mr-1 h-3 w-3" />}
        {alerts[0]}
        {alerts.length > 1 && ` +${alerts.length - 1}`}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Check-in Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Check-in Responses</CardTitle>
          <div className="flex space-x-2">
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Caregivers</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="last-week">Last Week</SelectItem>
                <SelectItem value="needs-attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Caregiver</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Week</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Alerts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses?.map((item, index) => (
                <TableRow key={index} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xs font-medium text-slate-600">
                          {getInitials(item.caregiver?.name || '')}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {item.caregiver?.name}
                        </div>
                        <div className="text-sm text-slate-500">
                          {item.caregiver?.phone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-slate-900">
                      {item.patient?.name}
                    </div>
                    <div className="text-sm text-slate-500">
                      ID: #{item.patient?.medicaidId || item.patient?.id}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-900">
                    {formatWeekRange(item.checkIn.weekStartDate, item.checkIn.weekEndDate)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.checkIn, item.response)}
                  </TableCell>
                  <TableCell>
                    {getAlertBadge(item.response)}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {item.response ? (
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm">
                          <Clock className="h-4 w-4 mr-1" />
                          Remind
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Phone className="h-4 w-4 mr-1" />
                        Contact
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            Showing <span className="font-medium">1</span> to <span className="font-medium">
              {Math.min(10, responses?.length || 0)}
            </span> of <span className="font-medium">{responses?.length || 0}</span> results
          </div>
          <div className="flex space-x-1">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-primary-600 text-white border-primary-600">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
