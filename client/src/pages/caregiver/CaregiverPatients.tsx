import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Phone, MapPin, Heart, Calendar, Search, ArrowUpDown, Eye, FileText, CheckCircle, Clock, AlertCircle, Edit, Save, Mail, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CaregiverLayout from "@/components/caregiver/CaregiverLayout";
import type { PatientWithSurveyStatus } from "@shared/schema";

export default function CaregiverPatients() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof PatientWithSurveyStatus>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientWithSurveyStatus | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [restrictedFieldRequest, setRestrictedFieldRequest] = useState<{ field: string; value: string } | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    medicaidId: "",
    address: "",
    phoneNumber: "",
    emergencyContact: "",
    medicalConditions: "",
  });

  const [emailRequestData, setEmailRequestData] = useState({
    reason: "",
  });

  const { data: patients, isLoading } = useQuery<PatientWithSurveyStatus[]>({
    queryKey: ["/api/caregiver/patients/enhanced"],
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedPatient) throw new Error("No patient selected");
      const response = await apiRequest("PUT", `/api/caregiver/patient/${selectedPatient.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/caregiver/patients/enhanced"] });
      setIsEditModalOpen(false);
      setSelectedPatient(null);
      toast({
        title: "Patient Updated",
        description: "Patient information has been successfully updated.",
      });
    },
    onError: async (error: any) => {
      const errorData = await error.response?.json();
      if (errorData?.requiresEmail) {
        setRestrictedFieldRequest({
          field: errorData.field,
          value: formData[errorData.field as keyof typeof formData]
        });
        setIsEditModalOpen(false);
        setIsRequestModalOpen(true);
      } else {
        toast({
          title: "Update Failed",
          description: errorData?.message || "Failed to update patient information. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Email request mutation
  const submitRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!selectedPatient) throw new Error("No patient selected");
      const response = await apiRequest("POST", `/api/caregiver/patient/${selectedPatient.id}/request-change`, data);
      return response.json();
    },
    onSuccess: () => {
      setIsRequestModalOpen(false);
      setRestrictedFieldRequest(null);
      setEmailRequestData({ reason: "" });
      setSelectedPatient(null);
      toast({
        title: "Request Submitted",
        description: "Your change request has been submitted. A care coordinator will review it and contact you.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to submit change request. Please try again.",
        variant: "destructive",
      });
    },
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
    setLocation(`/caregiver/patient/${patientId}`);
  };

  const handleStartSurvey = (patientId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    // Navigate to the caregiver dashboard to show available surveys
    setLocation(`/caregiver/dashboard`);
  };

  const handleEditPatient = (patient: PatientWithSurveyStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPatient(patient);
    setFormData({
      name: patient.name || "",
      medicaidId: patient.medicaidId || "",
      address: patient.address || "",
      phoneNumber: patient.phoneNumber || "",
      emergencyContact: patient.emergencyContact || "",
      medicalConditions: patient.medicalConditions || "",
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedPatient(null);
  };

  const handleSavePatient = () => {
    updatePatientMutation.mutate(formData);
  };

  const handleSubmitRequest = () => {
    if (!restrictedFieldRequest || !emailRequestData.reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for this change request.",
        variant: "destructive",
      });
      return;
    }

    submitRequestMutation.mutate({
      field: restrictedFieldRequest.field,
      newValue: restrictedFieldRequest.value,
      reason: emailRequestData.reason,
    });
  };

  const hasValue = (value: string | null | undefined) => {
    return value !== null && value !== undefined && value.trim() !== "";
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleEditPatient(patient, e)}
                            data-testid={`edit-patient-${patient.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
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

      {/* Edit Patient Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Patient Information
            </DialogTitle>
            <DialogDescription>
              Update patient details. Some fields may require approval to change.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPatient && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={hasValue(selectedPatient.name)}
                    data-testid="input-edit-patient-name"
                  />
                  {hasValue(selectedPatient.name) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Name is locked. Submit email request to change.
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-medicaidId">Medicaid ID</Label>
                  <Input
                    id="edit-medicaidId"
                    value={formData.medicaidId}
                    onChange={(e) => setFormData({ ...formData, medicaidId: e.target.value })}
                    disabled={hasValue(selectedPatient.medicaidId)}
                    data-testid="input-edit-patient-medicaid"
                  />
                  {hasValue(selectedPatient.medicaidId) && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Medicaid ID is locked. Submit email request to change.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phoneNumber">Phone Number</Label>
                <Input
                  id="edit-phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="203-111-3333"
                  data-testid="input-edit-patient-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                  data-testid="input-edit-patient-address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-emergencyContact">Emergency Contact</Label>
                <Input
                  id="edit-emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Name and phone number"
                  data-testid="input-edit-patient-emergency"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-medicalConditions">Medical Conditions</Label>
                <Textarea
                  id="edit-medicalConditions"
                  value={formData.medicalConditions}
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                  placeholder="List any medical conditions"
                  rows={3}
                  data-testid="input-edit-patient-conditions"
                />
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  If name or Medicaid ID already have values, you'll need to submit an email request to change them.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCloseEditModal}
                  disabled={updatePatientMutation.isPending}
                  data-testid="cancel-edit-modal"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePatient}
                  disabled={updatePatientMutation.isPending}
                  data-testid="save-edit-modal"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updatePatientMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Request Modal for Restricted Fields */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Request Field Change
            </DialogTitle>
            <DialogDescription>
              This field requires approval to change. Submit your request with a reason.
            </DialogDescription>
          </DialogHeader>
          
          {restrictedFieldRequest && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are requesting to change <strong>{restrictedFieldRequest.field === 'name' ? 'Name' : 'Medicaid ID'}</strong> to: <strong>{restrictedFieldRequest.value}</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="change-reason">Reason for Change</Label>
                <Textarea
                  id="change-reason"
                  value={emailRequestData.reason}
                  onChange={(e) => setEmailRequestData({ reason: e.target.value })}
                  placeholder="Please explain why this change is needed..."
                  rows={4}
                  data-testid="textarea-change-reason"
                />
                <p className="text-xs text-slate-500">
                  A care coordinator will review your request and contact you.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsRequestModalOpen(false);
                    setRestrictedFieldRequest(null);
                    setEmailRequestData({ reason: "" });
                  }}
                  disabled={submitRequestMutation.isPending}
                  data-testid="cancel-request-button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitRequest}
                  disabled={submitRequestMutation.isPending || !emailRequestData.reason.trim()}
                  data-testid="submit-request-button"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </CaregiverLayout>
  );
}