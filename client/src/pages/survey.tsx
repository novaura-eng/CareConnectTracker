import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import SurveyForm from "@/components/survey/survey-form";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

export default function Survey() {
  const { checkInId } = useParams();

  const { data: checkInDetails, isLoading, error } = useQuery({
    queryKey: [`/api/survey/${checkInId}`],
    enabled: !!checkInId,
  });

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
                Survey not found or has expired. Please contact your care coordinator for assistance.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout>
      <SurveyForm checkInDetails={checkInDetails} />
    </CaregiverLayout>
  );
}
