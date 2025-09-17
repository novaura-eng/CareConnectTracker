import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  ChevronRight,
  TrendingUp,
  Target,
  Activity
} from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

interface UnifiedAssignment {
  id: number;
  type: 'weekly_checkin' | 'survey';
  patientId: number;
  patientName: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'overdue' | 'completed';
  completedAt?: string;
  estimatedMinutes: number;
  surveyId: number;
  assignmentId: number;
  priority: number; // 3=overdue, 2=due today, 1=upcoming, 0=completed
  progressCurrent: number;
  progressTotal: number;
}

interface CaregiverSurveyDashboardProps {
  filterType?: 'weekly_checkin' | 'survey';
}

export default function CaregiverSurveyDashboard({ filterType }: CaregiverSurveyDashboardProps = {}) {
  const [, setLocation] = useLocation();

  // Fetch both pending and completed assignments from the unified endpoint
  const queryParams = new URLSearchParams({ includeCompleted: 'true' });
  if (filterType) {
    queryParams.append('type', filterType);
  }

  const { data: allAssignments, isLoading, error } = useQuery<UnifiedAssignment[]>({
    queryKey: ["/api/caregiver/assignments/unified", { includeCompleted: true, type: filterType }],
    queryFn: () => fetch(`/api/caregiver/assignments/unified?${queryParams}`).then(res => res.json()),
  });

  // Separate pending and completed assignments
  // Handle case where API returns error object instead of array
  const assignmentsArray = Array.isArray(allAssignments) ? allAssignments : [];
  const assignments = assignmentsArray.filter(a => a.status !== 'completed') || [];
  const completedAssignments = assignmentsArray.filter(a => a.status === 'completed') || [];

  const handleStartAssignment = (assignment: UnifiedAssignment) => {
    // All assignments now route to the unified survey system
    setLocation(`/caregiver/survey/${assignment.assignmentId}`);
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
  const totalCompleted = completedAssignments?.length || 0;
  const totalAssignments = totalPending + totalCompleted;
  const completionRate = totalAssignments > 0 ? (totalCompleted / totalAssignments) * 100 : 0;

  // Get this week's statistics
  const thisWeekStart = new Date();
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const thisWeekCompleted = completedAssignments?.filter(a => 
    a.completedAt && new Date(a.completedAt) >= thisWeekStart
  ).length || 0;

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        {/* Header with Progress */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {filterType === 'weekly_checkin' ? 'Weekly Check-ins' : 
                 filterType === 'survey' ? 'Surveys' : 
                 'Surveys & Check-ins'}
              </h1>
              <p className="text-slate-600 mt-2">
                {totalPending === 0 
                  ? `Great! All your ${filterType === 'weekly_checkin' ? 'check-ins' : filterType === 'survey' ? 'surveys' : 'assignments'} are complete.` 
                  : `${totalPending} ${filterType === 'weekly_checkin' ? 'check-in' : filterType === 'survey' ? 'survey' : 'assignment'}${totalPending === 1 ? '' : 's'} ready to complete.`
                }
              </p>
              {totalPending > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>How it works:</strong> Click any survey card or "Start Survey" button below to answer the required questions. You can save progress and return later.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 md:mt-0 md:text-right">
              <div className="text-sm text-slate-600 mb-1">Overall Progress</div>
              <div className="text-2xl font-bold text-slate-900">
                {Math.round(completionRate)}%
              </div>
              <div className="text-xs text-slate-500">
                {totalCompleted} of {totalAssignments} completed
              </div>
            </div>
          </div>
          
          {/* Overall Progress Bar */}
          <div className="mb-4" data-testid="overall-progress-section">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>Completion Progress</span>
              <span data-testid="progress-ratio">{totalCompleted}/{totalAssignments} assignments</span>
            </div>
            <Progress value={completionRate} className="h-3" data-testid="overall-progress-bar" />
          </div>
        </div>

        {/* Enhanced Summary Cards with Progress Tracking */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`${priorityGroups.overdue.length > 0 ? 'border-red-200 bg-red-50' : ''}`} data-testid="card-overdue-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-800 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900" data-testid="count-overdue">{priorityGroups.overdue.length}</div>
              {priorityGroups.overdue.length > 0 && (
                <div className="text-xs text-red-700 mt-1">Need immediate attention</div>
              )}
            </CardContent>
          </Card>

          <Card className={`${priorityGroups.dueToday.length > 0 ? 'border-yellow-200 bg-yellow-50' : ''}`} data-testid="card-due-today-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Due Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-900" data-testid="count-due-today">{priorityGroups.dueToday.length}</div>
              {priorityGroups.dueToday.length > 0 && (
                <div className="text-xs text-yellow-700 mt-1">Complete today</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-upcoming-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900" data-testid="count-upcoming">{priorityGroups.upcoming.length}</div>
              {priorityGroups.upcoming.length > 0 && (
                <div className="text-xs text-blue-700 mt-1">Plan ahead</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50" data-testid="card-weekly-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-800 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900" data-testid="count-weekly-completed">{thisWeekCompleted}</div>
              <div className="text-xs text-green-700 mt-1">Completed</div>
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
                  <Card 
                    key={`${assignment.type}-${assignment.id}`} 
                    className="border-l-4 border-l-red-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleStartAssignment(assignment)}
                  >
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
                      
                      {/* Per-card progress indicator */}
                      <div className="mt-3" data-testid={`progress-${assignment.type}-${assignment.id}`}>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Progress</span>
                          <span>{assignment.progressCurrent}/{assignment.progressTotal}</span>
                        </div>
                        <Progress 
                          value={(assignment.progressCurrent / assignment.progressTotal) * 100} 
                          className="h-2"
                        />
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
                      
                      {/* Per-card progress indicator */}
                      <div className="mt-3" data-testid={`progress-${assignment.type}-${assignment.id}`}>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Progress</span>
                          <span>{assignment.progressCurrent}/{assignment.progressTotal}</span>
                        </div>
                        <Progress 
                          value={(assignment.progressCurrent / assignment.progressTotal) * 100} 
                          className="h-2"
                        />
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
                      
                      {/* Per-card progress indicator */}
                      <div className="mt-3" data-testid={`progress-${assignment.type}-${assignment.id}`}>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>Progress</span>
                          <span>{assignment.progressCurrent}/{assignment.progressTotal}</span>
                        </div>
                        <Progress 
                          value={(assignment.progressCurrent / assignment.progressTotal) * 100} 
                          className="h-2"
                        />
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
                          Start Survey
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Assignments Section */}
          {completedAssignments.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Recently Completed ({completedAssignments.slice(0, 5).length})
              </h2>
              <div className="space-y-3">
                {completedAssignments.slice(0, 5).map((assignment) => (
                  <Card key={`completed-${assignment.type}-${assignment.id}`} className="border-l-4 border-l-green-500 bg-green-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <div>
                            <CardTitle className="text-lg font-semibold text-slate-700">{assignment.patientName}</CardTitle>
                            <CardDescription className="text-sm text-slate-500">
                              {assignment.title}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                      
                      {/* Completed progress indicator */}
                      <div className="mt-3" data-testid={`progress-${assignment.type}-${assignment.id}`}>
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                          <span>Progress</span>
                          <span>{assignment.progressTotal}/{assignment.progressTotal}</span>
                        </div>
                        <Progress value={100} className="h-2" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-slate-500">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span>
                              Completed {assignment.completedAt ? formatDate(assignment.completedAt) : 'recently'}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Timer className="h-4 w-4 mr-1" />
                            <span>~{assignment.estimatedMinutes} min</span>
                          </div>
                        </div>
                        <Button 
                          disabled
                          variant="outline"
                          className="opacity-50 cursor-not-allowed"
                          data-testid={`button-completed-${assignment.type}-${assignment.id}`}
                        >
                          Completed
                          <CheckCircle className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {totalPending === 0 && completedAssignments.length === 0 && (
            <Card className="text-center py-12" data-testid="empty-state">
              <CardContent>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 mb-2">All Caught Up!</h3>
                <p className="text-slate-600">
                  You've completed all your assignments. Great job taking care of your patients!
                </p>
              </CardContent>
            </Card>
          )}

          {totalPending === 0 && completedAssignments.length > 0 && (
            <Card className="text-center py-8 bg-green-50 border-green-200" data-testid="all-complete-state">
              <CardContent>
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Great Work!</h3>
                <p className="text-slate-600">
                  All pending assignments are complete. Check back later for new tasks.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </CaregiverLayout>
  );
}