import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import DynamicSurveyRenderer from "@/components/survey/dynamic-survey-renderer";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

export default function CaregiverDynamicSurvey() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useCaregiverAuth();

  // Use unified survey assignment API endpoint
  const apiEndpoint = `/api/caregiver/surveys/${assignmentId}`;
  const queryKey = [`/api/caregiver/surveys/${assignmentId}`];

  // Fetch survey assignment and survey details
  const { data: surveyData, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: () => fetch(apiEndpoint).then(res => res.json()),
    enabled: !!assignmentId && isAuthenticated,
  });

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Redirect if not authenticated (only after auth check is complete)
  if (!isAuthenticated) {
    setLocation("/caregiver");
    return null;
  }

  if (isLoading) {
    return (
      <CaregiverLayout>
        <div className="space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </CaregiverLayout>
    );
  }

  if (error || !surveyData) {
    return (
      <CaregiverLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="max-w-md mx-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Survey not found or access denied. Please contact your care coordinator for assistance.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  // Handle API errors or missing data
  if (!surveyData || !surveyData.assignment || !surveyData.survey) {
    return (
      <CaregiverLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="max-w-md mx-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Survey assignment not found or unable to load. Please try again or contact support.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  const { assignment, survey } = surveyData;

  // Find patient name from assignment
  const patientName = assignment.patientName || "Patient";

  const handleComplete = () => {
    setLocation("/caregiver/dashboard");
  };

  const handleBack = () => {
    setLocation("/caregiver/dashboard");
  };

  return (
    <CaregiverLayout>
      <DynamicSurveyRenderer 
        assignment={assignment}
        survey={survey}
        patientName={patientName}
        onComplete={handleComplete}
        onBack={handleBack}
      />
    </CaregiverLayout>
  );
}