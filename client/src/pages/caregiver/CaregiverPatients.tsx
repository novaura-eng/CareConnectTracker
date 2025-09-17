import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Phone, MapPin, Heart, Calendar, Search, ArrowUpDown, Eye, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";
import type { PatientWithSurveyStatus } from "@shared/schema";

export default function CaregiverPatients() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof PatientWithSurveyStatus>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { data: patients, isLoading } = useQuery<PatientWithSurveyStatus[]>({
    queryKey: ["/api/caregiver/patients/enhanced"],
  });

  // Filter and sort patients
  const filteredAndSortedPatients = useMemo(() => {
    if (!patients) return [];

    let filtered = patients.filter(patient =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.medicaidId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [patients, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof PatientWithSurveyStatus) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handlePatientSelect = (patientId: number) => {
    setLocation(`/caregiver/patients/${patientId}`);
  };

  const handleStartSurvey = (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to the caregiver dashboard to show available surveys
    setLocation(`/caregiver/dashboard`);
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
              Patient Management
            </CardTitle>
            <CardDescription className="text-blue-700">
              View your assigned patients, access their profiles, and navigate to available surveys. Use the search bar to find specific patients quickly.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Search Bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search patients by name or Medicaid ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="patient-search"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-slate-600">
              Found {filteredAndSortedPatients.length} patient{filteredAndSortedPatients.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Patients Table */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredAndSortedPatients.length > 0 ? (
          <Card>
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-50 select-none"
                      onClick={() => handleSort("name")}
                      data-testid="sort-name"
                    >
                      <div className="flex items-center gap-2">
                        Patient Name
                        <ArrowUpDown className="h-4 w-4" />
                      </div>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Medicaid ID</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden xl:table-cell">Medical Conditions</TableHead>
                    <TableHead className="hidden 2xl:table-cell">Survey Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPatients.map((patient) => (
                    <TableRow key={patient.id} className="cursor-pointer hover:bg-slate-50">
                      <TableCell 
                        className="font-medium"
                        onClick={() => handlePatientSelect(patient.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary flex-shrink-0" />
                          <div>
                            <div className="font-medium">{patient.name}</div>
                            <div className="md:hidden text-sm text-slate-500">{patient.medicaidId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-slate-600">
                        {patient.medicaidId}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-1 text-sm text-slate-600">
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                          )}
                          {patient.address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-40">{patient.address}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {patient.medicalConditions && (
                          <Badge variant="secondary" className="text-xs">
                            {patient.medicalConditions.length > 30 
                              ? `${patient.medicalConditions.substring(0, 30)}...` 
                              : patient.medicalConditions
                            }
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {patient.availableSurveys > 0 ? (
                              <Badge variant="default" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {patient.availableSurveys} Available
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Up to date
                              </Badge>
                            )}
                          </div>
                          {patient.lastSurveyDate && (
                            <div className="text-xs text-slate-500">
                              Last: {new Date(patient.lastSurveyDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePatientSelect(patient.id)}
                            data-testid={`view-patient-${patient.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          {patient.availableSurveys > 0 ? (
                            <Button
                              size="sm"
                              onClick={(e) => handleStartSurvey(patient.id, e)}
                              data-testid={`survey-patient-${patient.id}`}
                              className="relative"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">
                                {patient.availableSurveys} Survey{patient.availableSurveys !== 1 ? 's' : ''}
                              </span>
                              <span className="sm:hidden">Surveys</span>
                              {patient.availableSurveys > 0 && (
                                <Badge 
                                  variant="secondary" 
                                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-white"
                                >
                                  {patient.availableSurveys}
                                </Badge>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleStartSurvey(patient.id, e)}
                              data-testid={`survey-patient-${patient.id}`}
                              disabled
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Up to date</span>
                              <span className="sm:hidden">Complete</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ) : patients && patients.length > 0 ? (
          <Alert>
            <Search className="h-4 w-4" />
            <AlertDescription>
              No patients match your search criteria. Try adjusting your search terms.
            </AlertDescription>
          </Alert>
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