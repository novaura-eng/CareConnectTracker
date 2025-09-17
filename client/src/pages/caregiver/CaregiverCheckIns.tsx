import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ClipboardList, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Plus,
  FileText,
  FormInput
} from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

interface CheckIn {
  id: number;
  patientId: number;
  patientName: string;
  weekStartDate: string;
  weekEndDate: string;
  status: 'pending' | 'completed' | 'overdue';
  completedAt?: string;
  dueDate: string;
}

interface CompletedSurvey {
  id: number;
  patientId: number;
  patientName: string;
  completedAt: string;
  weekStartDate: string;
  weekEndDate: string;
  hasHealthConcerns: boolean;
  hasSafetyConcerns: boolean;
}


export default function CaregiverCheckIns() {
  const [, setLocation] = useLocation();

  const { data: pendingCheckIns, isLoading: pendingLoading } = useQuery<CheckIn[]>({
    queryKey: ["/api/caregiver/checkins/pending"],
  });

  const { data: completedSurveys, isLoading: completedLoading } = useQuery<CompletedSurvey[]>({
    queryKey: ["/api/caregiver/checkins/completed"],
  });


  const handleStartCheckIn = (checkInId: number, patientId: number) => {
    setLocation(`/caregiver/patient-survey/${patientId}?checkInId=${checkInId}`);
  };

  const handleViewSurvey = (surveyId: number) => {
    setLocation(`/survey/${surveyId}`);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Weekly Check-ins</h1>
          <p className="text-slate-600 mt-1">
            Complete weekly patient check-ins to track their well-being and safety.
          </p>
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <ClipboardList className="h-5 w-5" />
              Check-in Instructions
            </CardTitle>
            <CardDescription className="text-blue-700">
              Complete weekly check-ins for each of your patients. Survey responses help track patient well-being and identify any concerns that need attention.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Tabs for different views */}
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Check-ins
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed Check-Ins
            </TabsTrigger>
          </TabsList>

          {/* Pending Check-ins Tab */}
          <TabsContent value="pending" className="space-y-4">
            {pendingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <>
                {/* Regular Check-ins Section */}
                {pendingCheckIns && pendingCheckIns.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <ClipboardList className="h-4 w-4" />
                      Weekly Check-ins
                    </div>
                    {pendingCheckIns.map((checkIn) => (
                      <Card key={`checkin-${checkIn.id}`} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <User className="h-5 w-5 text-primary" />
                              {checkIn.patientName}
                            </CardTitle>
                            <Badge className={getStatusColor(checkIn.status)}>
                              {getStatusIcon(checkIn.status)}
                              <span className="ml-1 capitalize">{checkIn.status}</span>
                            </Badge>
                          </div>
                          <CardDescription>
                            Week of {formatWeekRange(checkIn.weekStartDate, checkIn.weekEndDate)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Due: {formatDate(checkIn.dueDate)}</span>
                              </div>
                            </div>
                            <Button 
                              size="sm"
                              onClick={() => handleStartCheckIn(checkIn.id, checkIn.patientId)}
                              className="flex items-center gap-2"
                              data-testid={`button-start-checkin-${checkIn.id}`}
                            >
                              <Plus className="h-4 w-4" />
                              Start Check-in
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}


                {/* Empty state when no pending check-ins */}
                {(!pendingCheckIns || pendingCheckIns.length === 0) && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Great! You have no pending check-ins at this time. All your weekly check-ins are up to date.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </TabsContent>

          {/* Completed Check-Ins Tab */}
          <TabsContent value="completed" className="space-y-4">
            {completedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : completedSurveys && completedSurveys.length > 0 ? (
              <div className="space-y-4">
                {completedSurveys.map((survey) => (
                  <Card key={survey.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <User className="h-5 w-5 text-primary" />
                          {survey.patientName}
                        </CardTitle>
                        <div className="flex gap-2">
                          {survey.hasHealthConcerns && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Health Concern
                            </Badge>
                          )}
                          {survey.hasSafetyConcerns && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Safety Concern
                            </Badge>
                          )}
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        Week of {formatWeekRange(survey.weekStartDate, survey.weekEndDate)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Completed: {formatDate(survey.completedAt)}</span>
                          </div>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewSurvey(survey.id)}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          View Survey
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <ClipboardList className="h-4 w-4" />
                <AlertDescription>
                  No completed surveys yet. Your completed check-ins will appear here for future reference.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CaregiverLayout>
  );
}