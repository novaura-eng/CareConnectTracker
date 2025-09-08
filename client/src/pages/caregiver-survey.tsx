import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import SurveyForm from "@/components/survey/survey-form";

export default function CaregiverSurvey() {
  const { patientId } = useParams<{ patientId: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useCaregiverAuth();

  // Mock check-in data for now - in real app, you'd create a new check-in or fetch existing one
  const { data: checkInDetails, isLoading, error } = useQuery({
    queryKey: [`/api/caregiver/mock-checkin/${patientId}`],
    enabled: !!patientId && isAuthenticated,
    queryFn: async () => {
      // For now, we'll create a mock check-in structure
      // In a real app, you'd have an endpoint to create/get current week's check-in
      const patients = await fetch("/api/caregiver/patients").then(r => r.json());
      const patient = patients.find((p: any) => p.id === parseInt(patientId!));
      
      if (!patient) throw new Error("Patient not found");
      
      // Mock check-in structure matching the expected format
      return {
        checkIn: {
          id: Date.now(), // Mock ID
          weekStartDate: new Date().toISOString(),
          weekEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          isCompleted: false,
        },
        patient: patient,
        caregiver: {
          name: "Current Caregiver", // This would come from session
        },
        response: null,
      };
    },
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

  if (error || !checkInDetails) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="max-w-md mx-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load survey. Please try again or contact your care coordinator.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <SurveyForm checkInDetails={checkInDetails} patientId={parseInt(patientId!)} />;
}