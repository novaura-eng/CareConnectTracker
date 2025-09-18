import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import SurveyForm from "@/components/survey/survey-form";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

export default function CaregiverSurvey() {
  const { patientId } = useParams<{ patientId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useCaregiverAuth();

  // Extract checkInId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const checkInId = urlParams.get('checkInId');

  const { data: checkInDetails, isLoading, error } = useQuery({
    queryKey: [`/api/survey/${checkInId}`],
    enabled: !!patientId && !!checkInId && isAuthenticated,
    queryFn: async () => {
      if (!checkInId) throw new Error("No checkIn ID provided");
      
      // Fetch actual check-in details from the backend
      const response = await fetch(`/api/survey/${checkInId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch check-in details");
      }
      return response.json();
    },
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/caregiver");
    return null;
  }

  if (isLoading) {
    return (
      <CaregiverLayout>
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-96 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  if (error || !checkInDetails) {
    return (
      <CaregiverLayout>
        <div className="flex items-center justify-center py-12">
          <div className="max-w-md mx-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Unable to load survey. Please try again or contact your care coordinator.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout>
      <SurveyForm checkInDetails={checkInDetails} patientId={parseInt(patientId!)} />
    </CaregiverLayout>
  );
}