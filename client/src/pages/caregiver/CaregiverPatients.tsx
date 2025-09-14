import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Phone, MapPin, Heart, Calendar } from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";

interface Patient {
  id: number;
  name: string;
  medicaidId: string;
  address?: string;
  phone?: string;
  medicalConditions?: string;
  dateOfBirth?: string;
}

export default function CaregiverPatients() {
  const [, setLocation] = useLocation();

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/caregiver/patients"],
  });

  const handlePatientSelect = (patientId: number) => {
    setLocation(`/caregiver/patient/${patientId}`);
  };

  const handleStartCheckIn = (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/caregiver/survey/${patientId}`);
  };

  return (
    <CaregiverLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Patients</h1>
          <p className="text-slate-600 mt-1">
            View and manage your assigned patients. Click on a patient to see their detailed profile.
          </p>
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Users className="h-5 w-5" />
              Patient Care Instructions
            </CardTitle>
            <CardDescription className="text-blue-700">
              You can view patient details by clicking on their card, or start a weekly check-in survey directly from the buttons below.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Patients Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : patients && patients.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient: Patient) => (
              <Card 
                key={patient.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-white"
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
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{patient.address}</span>
                    </div>
                  )}
                  
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  
                  {patient.dateOfBirth && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  {patient.medicalConditions && (
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <Heart className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded truncate">
                        {patient.medicalConditions}
                      </span>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-slate-100">
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => handleStartCheckIn(patient.id, e)}
                    >
                      Start Check-in
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              No patients assigned to you at this time. Please contact your care coordinator if you believe this is an error.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </CaregiverLayout>
  );
}