import { useQuery } from "@tanstack/react-query";

interface CaregiverSessionResponse {
  caregiver: {
    id: number;
    name: string;
    state: string;
  };
}

export function useCaregiverAuth() {
  const { data: caregiverData, isLoading } = useQuery<CaregiverSessionResponse>({
    queryKey: ["/api/caregiver/session"],
    retry: false,
  });

  return {
    caregiver: caregiverData?.caregiver,
    isLoading,
    isAuthenticated: !!caregiverData?.caregiver,
  };
}