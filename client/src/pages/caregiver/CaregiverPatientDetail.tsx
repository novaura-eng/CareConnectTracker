import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, Phone, MapPin, Heart, Calendar, FileText, Activity } from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";
import type { PatientWithSurveyStatus } from "@shared/schema";

export default function CaregiverPatientDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const patientId = parseInt(id || "0");

  const { data: patients, isLoading, error } = useQuery<PatientWithSurveyStatus[]>({
    queryKey: ["/api/caregiver/patients/enhanced"],
  });

  // Find the specific patient from the enhanced patient list
  const patient = patients?.find(p => p.id === patientId);

  const handleBackToPatients = () => {
    setLocation("/caregiver/patients");
  };

  const handleStartSurvey = () => {
    setLocation("/caregiver/dashboard");
  };

  if (isLoading) {
    return (
      <CaregiverLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </CaregiverLayout>
    );
  }

  if (error || !patient) {
    return (
      <CaregiverLayout>
        <div className="space-y-6">
          <Button 
            variant="outline" 
            onClick={handleBackToPatients}
            className="flex items-center gap-2"
            data-testid="back-to-patients"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </Button>
          
          <Alert variant="destructive">
            <AlertDescription>
              {error ? "Error loading patient details." : "Patient not found."}
            </AlertDescription>
          </Alert>
        </div>
      </CaregiverLayout>
    );
  }

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleBackToPatients}
              className="flex items-center gap-2"
              data-testid="back-to-patients"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Patients
            </Button>
            
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {patient.name}
              </h1>
              <p className="text-slate-600 mt-1">
                Patient Profile and Survey History
              </p>
            </div>
          </div>

          <Button 
            onClick={handleStartSurvey}
            className="flex items-center gap-2"
            data-testid="start-survey"
          >
            <FileText className="h-4 w-4" />
            View Surveys
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Patient Information Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Patient Information
                </CardTitle>
                <CardDescription>
                  Personal details and medical information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Full Name</label>
                    <p className="text-lg font-medium">{patient.name}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-slate-600">Medicaid ID</label>
                    <p className="text-lg font-medium font-mono">{patient.medicaidId}</p>
                  </div>
                </div>

                {patient.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-600">Phone:</span>
                    <span>{patient.phoneNumber}</span>
                  </div>
                )}

                {patient.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-slate-600">Address:</span>
                      <p className="text-sm">{patient.address}</p>
                    </div>
                  </div>
                )}

                {patient.emergencyContact && (
                  <div>
                    <span className="text-sm font-medium text-slate-600">Emergency Contact:</span>
                    <p className="text-sm">{patient.emergencyContact}</p>
                  </div>
                )}

                {patient.medicalConditions && (
                  <div className="flex items-start gap-2">
                    <Heart className="h-4 w-4 text-red-500 mt-0.5" />
                    <div>
                      <span className="text-sm font-medium text-slate-600">Medical Conditions:</span>
                      <Badge variant="secondary" className="ml-2">
                        {patient.medicalConditions}
                      </Badge>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  <span>Patient since {new Date(patient.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Survey Status Card */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Survey Activity
                </CardTitle>
                <CardDescription>
                  Current survey status and statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-blue-900">Pending Surveys</p>
                      <p className="text-2xl font-bold text-blue-700">{patient.surveyStatus.pendingAssignments}</p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-500" />
                  </div>

                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-900">Completed Surveys</p>
                      <p className="text-2xl font-bold text-green-700">{patient.surveyStatus.completedSurveys}</p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>

                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Available Surveys</p>
                      <p className="text-2xl font-bold text-slate-700">{patient.surveyStatus.availableSurveys}</p>
                    </div>
                    <FileText className="h-8 w-8 text-slate-500" />
                  </div>
                </div>

                {patient.surveyStatus.lastSurveyDate && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-slate-600">Last Survey Completed</p>
                    <p className="text-sm text-slate-500">
                      {new Date(patient.surveyStatus.lastSurveyDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <Button 
                  className="w-full"
                  onClick={handleStartSurvey}
                  data-testid="view-surveys-button"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View All Surveys
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Survey History Section - Placeholder for now */}
        <Card>
          <CardHeader>
            <CardTitle>Survey History</CardTitle>
            <CardDescription>
              Recent survey responses and completion history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Survey history will be displayed here</p>
              <p className="text-sm">This feature will be implemented in the next phase</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </CaregiverLayout>
  );
}