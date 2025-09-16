import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User,
  FormInput,
  Timer,
  ArrowRight,
  Star,
  ChevronRight
} from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

interface UnifiedAssignment {
  id: number;
  type: 'weekly_checkin' | 'dynamic_survey';
  patientId: number;
  patientName: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'overdue' | 'completed';
  completedAt?: string;
  estimatedMinutes: number;
  surveyId?: number;
  assignmentId?: number;
  checkInId?: number;
  priority: number; // 3=overdue, 2=due today, 1=upcoming
}

export default function CaregiverSurveyDashboard() {
  const [, setLocation] = useLocation();

  // Fetch unified assignments from the new backend endpoint
  const { data: assignments, isLoading, error } = useQuery<UnifiedAssignment[]>({
    queryKey: ["/api/caregiver/assignments/unified"],
  });

  const handleStartAssignment = (assignment: UnifiedAssignment) => {
    if (assignment.type === 'weekly_checkin') {
      setLocation(`/caregiver/survey/${assignment.patientId}?checkInId=${assignment.checkInId}`);
    } else if (assignment.type === 'dynamic_survey') {
      setLocation(`/caregiver/dynamic-survey/${assignment.assignmentId}`);
    }
  };

  const getPriorityBadge = (priority: number, status: string) => {
    if (status === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }

    switch (priority) {
      case 3: // Overdue
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 shadow-sm">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      case 2: // Due Today  
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 shadow-sm">
            <Clock className="h-3 w-3 mr-1" />
            Due Today
          </Badge>
        );
      case 1: // Upcoming
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            <Calendar className="h-3 w-3 mr-1" />
            Upcoming
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-800">
            <ClipboardList className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'weekly_checkin' ? (
      <ClipboardList className="h-5 w-5 text-blue-600" />
    ) : (
      <FormInput className="h-5 w-5 text-purple-600" />
    );
  };

  const getTypeLabel = (type: string) => {
    return type === 'weekly_checkin' ? 'Weekly Check-in' : 'Custom Survey';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if it's today, tomorrow, or yesterday
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const getPriorityGroups = () => {
    if (!assignments) return { overdue: [], dueToday: [], upcoming: [] };

    return assignments.reduce((groups, assignment) => {
      switch (assignment.priority) {
        case 3:
          groups.overdue.push(assignment);
          break;
        case 2:
          groups.dueToday.push(assignment);
          break;
        case 1:
          groups.upcoming.push(assignment);
          break;
      }
      return groups;
    }, { overdue: [] as UnifiedAssignment[], dueToday: [] as UnifiedAssignment[], upcoming: [] as UnifiedAssignment[] });
  };

  if (isLoading) {
    return (
      <CaregiverLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  if (error) {
    return (
      <CaregiverLayout>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to load your assignments. Please try refreshing the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </CaregiverLayout>
    );
  }

  const priorityGroups = getPriorityGroups();
  const totalPending = assignments?.filter(a => a.status !== 'completed').length || 0;

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Assignments</h1>
          <p className="text-slate-600 mt-2">
            {totalPending === 0 
              ? "Great! All your assignments are complete." 
              : `${totalPending} assignment${totalPending === 1 ? '' : 's'} need${totalPending === 1 ? 's' : ''} your attention.`
            }
          </p>
        </div>

        {/* Priority Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`${priorityGroups.overdue.length > 0 ? 'border-red-200 bg-red-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">{priorityGroups.overdue.length}</div>
            </CardContent>
          </Card>

          <Card className={`${priorityGroups.dueToday.length > 0 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Due Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900">{priorityGroups.dueToday.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{priorityGroups.upcoming.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Assignment Groups */}
        <div className="space-y-6">
          {/* Overdue Assignments */}
          {priorityGroups.overdue.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Overdue ({priorityGroups.overdue.length})
              </h2>
              <div className="space-y-3">
                {priorityGroups.overdue.map((assignment) => (
                  <Card key={`${assignment.type}-${assignment.id}`} className="border-l-4 border-l-red-500 hover:shadow-md transition-all cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(assignment.type)}
                          <div>
                            <CardTitle className="text-lg font-semibold">{assignment.patientName}</CardTitle>
                            <CardDescription className="text-sm">
                              {assignment.title}
                            </CardDescription>
                          </div>
                        </div>
                        {getPriorityBadge(assignment.priority, assignment.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Due: {formatDate(assignment.dueDate)}</span>
                          </div>
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            <span>~{assignment.estimatedMinutes} min</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleStartAssignment(assignment)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                          data-testid={`button-start-${assignment.type}-${assignment.id}`}
                        >
                          Start Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Due Today Assignments */}
          {priorityGroups.dueToday.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-yellow-800 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Due Today ({priorityGroups.dueToday.length})
              </h2>
              <div className="space-y-3">
                {priorityGroups.dueToday.map((assignment) => (
                  <Card key={`${assignment.type}-${assignment.id}`} className="border-l-4 border-l-yellow-500 hover:shadow-md transition-all cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(assignment.type)}
                          <div>
                            <CardTitle className="text-lg font-semibold">{assignment.patientName}</CardTitle>
                            <CardDescription className="text-sm">
                              {assignment.title}
                            </CardDescription>
                          </div>
                        </div>
                        {getPriorityBadge(assignment.priority, assignment.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            <span>~{assignment.estimatedMinutes} min</span>
                          </div>
                          <div className="flex items-center text-yellow-700">
                            <Star className="h-4 w-4 mr-1" />
                            <span>Priority</span>
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleStartAssignment(assignment)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                          data-testid={`button-start-${assignment.type}-${assignment.id}`}
                        >
                          Complete Today
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Assignments */}
          {priorityGroups.upcoming.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Upcoming ({priorityGroups.upcoming.length})
              </h2>
              <div className="space-y-3">
                {priorityGroups.upcoming.map((assignment) => (
                  <Card key={`${assignment.type}-${assignment.id}`} className="hover:shadow-md transition-all cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getTypeIcon(assignment.type)}
                          <div>
                            <CardTitle className="text-lg font-semibold">{assignment.patientName}</CardTitle>
                            <CardDescription className="text-sm">
                              {assignment.title}
                            </CardDescription>
                          </div>
                        </div>
                        {getPriorityBadge(assignment.priority, assignment.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-slate-600">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            <span>Due: {formatDate(assignment.dueDate)}</span>
                          </div>
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            <span>~{assignment.estimatedMinutes} min</span>
                          </div>
                          <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                            {getTypeLabel(assignment.type)}
                          </div>
                        </div>
                        <Button 
                          onClick={() => handleStartAssignment(assignment)}
                          variant="outline"
                          data-testid={`button-start-${assignment.type}-${assignment.id}`}
                        >
                          Start Assignment
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalPending === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">All Caught Up!</h3>
                <p className="text-slate-600">
                  You've completed all your assignments. Great job taking care of your patients!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CaregiverLayout>
  );
}