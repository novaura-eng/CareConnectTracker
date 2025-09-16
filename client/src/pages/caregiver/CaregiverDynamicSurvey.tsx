import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import DynamicSurveyRenderer from "@/components/survey/dynamic-survey-renderer";

export default function CaregiverDynamicSurvey() {
  const { assignmentId, checkInId } = useParams<{ assignmentId?: string; checkInId?: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useCaregiverAuth();

  // Determine API endpoint based on route type
  const apiEndpoint = checkInId 
    ? `/api/caregiver/checkin-survey/${checkInId}`
    : `/api/caregiver/surveys/${assignmentId}`;
  
  const queryKey = checkInId 
    ? [`/api/caregiver/checkin-survey/${checkInId}`]
    : [`/api/caregiver/surveys/${assignmentId}`];

  // Fetch survey assignment and survey details
  const { data: surveyData, isLoading, error } = useQuery({
    queryKey: queryKey,
    queryFn: () => fetch(apiEndpoint).then(res => res.json()),
    enabled: !!(assignmentId || checkInId) && isAuthenticated,
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/caregiver");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !surveyData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Survey not found or access denied. Please contact your care coordinator for assistance.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const { assignment, survey } = surveyData;

  // Find patient name from assignment
  const patientName = assignment.patientName || "Patient";

  const handleComplete = () => {
    setLocation("/caregiver/checkins");
  };

  const handleBack = () => {
    setLocation("/caregiver/checkins");
  };

  return (
    <DynamicSurveyRenderer 
      assignment={assignment}
      survey={survey}
      patientName={patientName}
      onComplete={handleComplete}
      onBack={handleBack}
    />
  );
}