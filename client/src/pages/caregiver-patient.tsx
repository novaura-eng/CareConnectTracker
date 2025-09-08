import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCaregiverAuth } from "@/hooks/useCaregiverAuth";
import { ArrowLeft, FileText, Copy, Calendar, CheckCircle } from "lucide-react";

interface Patient {
  id: number;
  name: string;
  medicaidId: string;
  address?: string;
  phoneNumber?: string;
  medicalConditions?: string;
}

interface WeeklyCheckIn {
  id: number;
  weekStartDate: string;
  weekEndDate: string;
  isCompleted: boolean;
  completedAt?: string;
}

export default function CaregiverPatient() {
  const { patientId } = useParams<{ patientId: string }>();
  const [, setLocation] = useLocation();
  const { caregiver, isAuthenticated } = useCaregiverAuth();
  
  const { data: patients } = useQuery({
    queryKey: ["/api/caregiver/patients"],
    enabled: isAuthenticated,
  });

  const { data: previousResponse } = useQuery({
    queryKey: ["/api/caregiver/previous-response", patientId],
    enabled: isAuthenticated && !!patientId,
  });

  // Redirect if not authenticated
  if (!isAuthenticated) {
    setLocation("/caregiver");
    return null;
  }

  const patient = patients?.find((p: Patient) => p.id === parseInt(patientId!));

  if (!patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Patient not found or you don't have access to this patient.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    setLocation("/caregiver/dashboard");
  };

  const handleStartSurvey = () => {
    // For now, we'll create a simple survey interface
    // In a real app, you'd fetch available check-ins and create new ones
    setLocation(`/caregiver/survey/${patient.id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" onClick={handleBackToDashboard}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
              <p className="text-slate-600">Patient Check-in • {caregiver?.state}</p>
            </div>
          </div>

          {/* Patient Details Card */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 font-medium">Medicaid ID</p>
                <p className="text-lg">{patient.medicaidId}</p>
              </div>
              {patient.address && (
                <div>
                  <p className="text-sm text-slate-600 font-medium">Address</p>
                  <p className="text-lg">{patient.address}</p>
                </div>
              )}
              {patient.phoneNumber && (
                <div>
                  <p className="text-sm text-slate-600 font-medium">Phone Number</p>
                  <p className="text-lg">{patient.phoneNumber}</p>
                </div>
              )}
              {patient.medicalConditions && (
                <div>
                  <p className="text-sm text-slate-600 font-medium">Medical Conditions</p>
                  <p className="text-lg">{patient.medicalConditions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Previous Response Card */}
          {previousResponse && (
            <Card className="mb-8 bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Copy className="h-5 w-5" />
                  Previous Response Available
                </CardTitle>
                <CardDescription className="text-green-700">
                  You can copy responses from your last submission to save time filling out this week's check-in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><strong>Hospital Visits:</strong> {previousResponse.hospitalVisits ? "Yes" : "No"}</p>
                    <p><strong>Accidents/Falls:</strong> {previousResponse.accidentsFalls ? "Yes" : "No"}</p>
                    <p><strong>Mental Health Changes:</strong> {previousResponse.mentalHealth ? "Yes" : "No"}</p>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Physical Health Changes:</strong> {previousResponse.physicalHealth ? "Yes" : "No"}</p>
                    <p><strong>Contact Changes:</strong> {previousResponse.contactChanges ? "Yes" : "No"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Weekly Check-in
              </CardTitle>
              <CardDescription>
                Complete this week's health and safety check-in for {patient.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">This Week's Check-in</p>
                  <p className="text-sm text-slate-600">Health and safety survey</p>
                </div>
                <Badge variant="outline">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Ready
                </Badge>
              </div>

              <Button onClick={handleStartSurvey} className="w-full h-12 text-base">
                <FileText className="mr-2 h-4 w-4" />
                Start Weekly Check-in
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}