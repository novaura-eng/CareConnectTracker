import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import { apiRequest } from "@/lib/queryClient";
import { HeartHandshake, Users, LogOut, FileText, Clock } from "lucide-react";

interface Patient {
  id: number;
  name: string;
  medicaidId: string;
  address?: string;
  phoneNumber?: string;
  medicalConditions?: string;
}

export default function CaregiverDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { caregiver, isLoading: authLoading, isAuthenticated } = useCaregiverAuth();
  
  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["/api/caregiver/patients"],
    enabled: isAuthenticated,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/caregiver/logout", {}),
    onSuccess: () => {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      setLocation("/caregiver");
    },
    onError: () => {
      toast({
        title: "Logout Error",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    setLocation("/caregiver");
    return null;
  }

  // Redirect to new portal
  if (!authLoading && isAuthenticated) {
    setLocation("/caregiver/patients");
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handlePatientSelect = (patientId: number) => {
    setLocation(`/caregiver/patient/${patientId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <HeartHandshake className="h-10 w-10 text-primary mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome, {caregiver?.name}</h1>
              <p className="text-slate-600">{caregiver?.state} • Caregiver Dashboard</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} disabled={logoutMutation.isPending}>
            <LogOut className="mr-2 h-4 w-4" />
            {logoutMutation.isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Instructions */}
          <Card className="mb-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <FileText className="h-5 w-5" />
                Your Patients
              </CardTitle>
              <CardDescription className="text-blue-700">
                Select a patient below to fill out their weekly check-in survey.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Patients Grid */}
          {patientsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : patients && patients.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient: Patient) => (
                <Card 
                  key={patient.id} 
                  className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => handlePatientSelect(patient.id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5 text-primary" />
                      {patient.name}
                    </CardTitle>
                    <CardDescription>
                      Medicaid ID: {patient.medicaidId}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {patient.address && (
                      <p className="text-sm text-slate-600">
                        <strong>Address:</strong> {patient.address}
                      </p>
                    )}
                    {patient.phoneNumber && (
                      <p className="text-sm text-slate-600">
                        <strong>Phone:</strong> {patient.phoneNumber}
                      </p>
                    )}
                    {patient.medicalConditions && (
                      <p className="text-sm text-slate-600">
                        <strong>Conditions:</strong> {patient.medicalConditions}
                      </p>
                    )}
                    <Button className="w-full mt-4" size="sm">
                      <Clock className="mr-2 h-4 w-4" />
                      Start Check-in
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No patients assigned to you at this time. Please contact your care coordinator if you believe this is an error.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}