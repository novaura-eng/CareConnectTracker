import { useQuery } from "@tanstack/react-query";

export function useCaregiverAuth() {
  const { data: caregiverData, isLoading } = useQuery({
    queryKey: ["/api/caregiver/session"],
    retry: false,
  });

  return {
    caregiver: caregiverData?.caregiver,
    isLoading,
    isAuthenticated: !!caregiverData?.caregiver,
  };
}