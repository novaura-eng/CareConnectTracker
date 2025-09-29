import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient, type Patient, type Caregiver } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import InputMask from "react-input-mask";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, User, MapPin, IdCard, Heart, Upload, Download, X, Search, ChevronLeft, ChevronRight, Check, ChevronsUpDown, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";

export default function Patients() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  // Bulk selection state
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter state
  const [searchText, setSearchText] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL_STATUS");
  const [caregiverFilter, setCaregiverFilter] = useState<string>("ALL_CAREGIVERS");
  const [caregiverComboOpen, setCaregiverComboOpen] = useState(false);

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: caregivers } = useQuery<Caregiver[]>({
    queryKey: ["/api/caregivers"],
  });

  // Filter patients based on search and filter criteria
  const filteredPatients = React.useMemo(() => {
    if (!patients) return [];
    
    return patients.filter(patient => {
      // Status filter
      if (statusFilter && statusFilter !== "ALL_STATUS") {
        if (statusFilter === "ACTIVE" && !patient.isActive) return false;
        if (statusFilter === "INACTIVE" && patient.isActive) return false;
      }
      
      // Caregiver filter
      if (caregiverFilter && caregiverFilter !== "ALL_CAREGIVERS") {
        if (caregiverFilter === "ASSIGNED" && !patient.caregiverId) return false;
        if (caregiverFilter === "UNASSIGNED" && patient.caregiverId) return false;
        if (caregiverFilter !== "ASSIGNED" && caregiverFilter !== "UNASSIGNED" && 
            patient.caregiverId?.toString() !== caregiverFilter) return false;
      }
      
      // Search text filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const caregiverName = patient.caregiverId ? getCaregiverName(patient.caregiverId).toLowerCase() : '';
        return (
          patient.name.toLowerCase().includes(searchLower) ||
          (patient.medicaidId && patient.medicaidId.toLowerCase().includes(searchLower)) ||
          (patient.phoneNumber && patient.phoneNumber.toLowerCase().includes(searchLower)) ||
          (patient.address && patient.address.toLowerCase().includes(searchLower)) ||
          (patient.emergencyContact && patient.emergencyContact.toLowerCase().includes(searchLower)) ||
          (patient.medicalConditions && patient.medicalConditions.toLowerCase().includes(searchLower)) ||
          caregiverName.includes(searchLower)
        );
      }
      
      return true;
    });
  }, [patients, searchText, statusFilter, caregiverFilter]);

  // Pagination calculations (matching caregivers table)
  const totalItems = filteredPatients?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPatients = filteredPatients?.slice(startIndex, endIndex) || [];

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchText, statusFilter, caregiverFilter]);

  // Helper function to get display text for caregiver filter
  const getCaregiverFilterDisplayText = () => {
    if (caregiverFilter === "ALL_CAREGIVERS") return "All Caregivers";
    if (caregiverFilter === "ASSIGNED") return "Assigned";
    if (caregiverFilter === "UNASSIGNED") return "Unassigned";
    const caregiver = caregivers?.find(c => c.id.toString() === caregiverFilter);
    return caregiver ? caregiver.name : "All Caregivers";
  };

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      medicaidId: "",
      caregiverId: undefined,
      address: undefined,
      phoneNumber: undefined,
      emergencyContact: undefined,
      medicalConditions: undefined,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPatient) => {
      if (selectedPatient) {
        // Update existing patient
        return apiRequest("PUT", `/api/patients/${selectedPatient.id}`, data);
      } else {
        // Create new patient
        const response = await fetch("/api/patients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const errorData = await response.text();
          console.error("API Error:", response.status, errorData);
          throw new Error(`Failed to create patient: ${response.status}`);
        }
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      form.reset();
      setIsDialogOpen(false);
      setSelectedPatient(null);
      toast({
        title: "Success",
        description: selectedPatient ? "Patient updated successfully" : "Patient created successfully",
      });
    },
    onError: (error) => {
      console.error("Patient mutation error:", error);
      toast({
        title: "Error",
        description: selectedPatient 
          ? `Failed to update patient: ${error.message}`
          : `Failed to create patient: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (patientId: number) => {
      return apiRequest("DELETE", `/api/patients/${patientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setDeleteConfirmOpen(false);
      setPatientToDelete(null);
      toast({
        title: "Patient Deleted",
        description: "Patient has been successfully removed from the system.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to delete patient. Please try again.";
      toast({
        title: "Cannot Delete Patient",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertPatient) => {
    createMutation.mutate(data);
  };

  // Helper functions
  const resetForm = () => {
    form.reset();
    setSelectedPatient(null);
  };

  const openEditDialog = (patient: Patient) => {
    setSelectedPatient(patient);
    form.reset({
      name: patient.name,
      medicaidId: patient.medicaidId || "",
      caregiverId: patient.caregiverId || undefined,
      address: patient.address || "",
      phoneNumber: patient.phoneNumber || "",
      emergencyContact: patient.emergencyContact || "",
      medicalConditions: patient.medicalConditions || "",
      isActive: patient.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Bulk selection functions
  const togglePatientSelection = (patientId: number) => {
    setSelectedPatients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(patientId)) {
        newSet.delete(patientId);
      } else {
        newSet.add(patientId);
      }
      return newSet;
    });
  };

  const toggleAllPatients = () => {
    if (!paginatedPatients) return;
    
    const currentPageIds = paginatedPatients.map(p => p.id);
    const allCurrentSelected = currentPageIds.every(id => selectedPatients.has(id));
    
    setSelectedPatients(prev => {
      const newSet = new Set(prev);
      if (allCurrentSelected) {
        // Unselect all on current page
        currentPageIds.forEach(id => newSet.delete(id));
      } else {
        // Select all on current page
        currentPageIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedPatients(new Set());
  };

  // CSV Import functions
  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await apiRequest("POST", "/api/patients/import", formData);
      const result = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      setCsvFile(null);
      setImportModalOpen(false);
      
      // Reset file inputs
      const fileInput1 = document.getElementById('csv-upload') as HTMLInputElement;
      const fileInput2 = document.getElementById('csv-upload-modal') as HTMLInputElement;
      if (fileInput1) fileInput1.value = '';
      if (fileInput2) fileInput2.value = '';

      toast({
        title: "Import Completed", 
        description: `Successfully imported ${result.imported} patients. ${result.skipped > 0 ? `Skipped ${result.skipped} duplicates.` : ''} ${result.errors && result.errors.length > 0 ? `${result.errors.length} errors encountered.` : ''}`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error?.message || "Failed to import CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'medicaidId', 'address', 'phoneNumber', 'emergencyContact', 'medicalConditions', 'caregiverPhone', 'caregiverState', 'isActive'];
    const sampleData = [
      'John Doe,MED12345,123 Main St,555-123-4567,Jane Doe 555-234-5678,Diabetes,202-555-0001,MD,true',
      'Mary Smith,,456 Oak Ave,,555-345-6789,Hypertension,202-555-0002,MD,true',
      'Bob Johnson,MED11111,789 Pine Rd,555-456-7890,Alice Johnson 555-567-8901,,,true'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'patient-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateAndSetFile = (file: File) => {
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setCsvFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const getCaregiverName = (caregiverId: number) => {
    const caregiver = caregivers?.find(c => c.id === caregiverId);
    return caregiver?.name || "Unassigned";
  };

  return (
    <>
    <main className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6">
          {/* Header - Hidden on mobile to avoid duplication with mobile nav */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Patient Management</h1>
                <p className="text-slate-600">Manage patient records and caregiver assignments</p>
              </div>
              {patients && (
                <span className="text-sm text-slate-500">
                  {filteredPatients?.length || 0} patient{(filteredPatients?.length || 0) !== 1 ? 's' : ''}
                </span>
              )}
              {selectedPatients.size > 0 && (
                <span className="text-sm text-blue-600 font-medium">
                  {selectedPatients.size} selected
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {/* Bulk Delete Button - Only show when patients are selected */}
              {selectedPatients.size > 0 && (
                <Button 
                  variant="destructive"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                  className="mr-2"
                  data-testid="button-bulk-delete-patients"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedPatients.size}
                </Button>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Patient
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{selectedPatient ? "Edit Patient" : "Add New Patient"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter patient name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicaidId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicaid ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Medicaid ID" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="caregiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Caregiver</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caregivers?.filter(c => c.isActive).map((caregiver) => (
                                <SelectItem key={caregiver.id} value={caregiver.id.toString()}>
                                  {caregiver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="999-999-9999"
                              maskChar=""
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              inputRef={field.ref}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  name={field.name}
                                  placeholder="203-555-1234"
                                  type="tel"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter emergency contact" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicalConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter medical conditions" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      className="w-full"
                    >
                      {createMutation.isPending 
                        ? (selectedPatient ? "Updating..." : "Creating...") 
                        : (selectedPatient ? "Update Patient" : "Create Patient")
                      }
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

              <Button
                variant="outline"
                onClick={() => setImportModalOpen(true)}
                data-testid="button-open-import-modal"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>

          {/* Mobile Add Patient Button - Only visible on mobile */}
          <div className="lg:hidden mb-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{selectedPatient ? "Edit Patient" : "Add New Patient"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Patient Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter patient name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicaidId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medicaid ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter Medicaid ID" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="caregiverId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Caregiver</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select caregiver" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {caregivers?.filter(c => c.isActive).map((caregiver) => (
                                <SelectItem key={caregiver.id} value={caregiver.id.toString()}>
                                  {caregiver.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter address" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <InputMask
                              mask="999-999-9999"
                              maskChar=""
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              inputRef={field.ref}
                            >
                              {(inputProps: any) => (
                                <Input
                                  {...inputProps}
                                  name={field.name}
                                  placeholder="203-555-1234"
                                  type="tel"
                                />
                              )}
                            </InputMask>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter emergency contact" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="medicalConditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Conditions</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter medical conditions" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      className="w-full"
                    >
                      {createMutation.isPending 
                        ? (selectedPatient ? "Updating..." : "Creating...") 
                        : (selectedPatient ? "Update Patient" : "Create Patient")
                      }
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Patients</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : (patients?.length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Heart className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Active Patients</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : (patients?.filter(p => p.isActive).length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <IdCard className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Assigned Patients</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? "..." : (patients?.filter(p => p.caregiverId).length || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter Controls */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder="Search patients by name, Medicaid ID, phone, address, caregiver..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-patients"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_STATUS">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* Caregiver Filter - Searchable Combobox */}
                <Popover open={caregiverComboOpen} onOpenChange={setCaregiverComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={caregiverComboOpen}
                      className="w-full md:w-48 justify-between"
                      data-testid="button-filter-caregiver"
                    >
                      {getCaregiverFilterDisplayText()}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full md:w-48 p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search caregivers..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No caregiver found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="ALL_CAREGIVERS"
                            onSelect={() => {
                              setCaregiverFilter("ALL_CAREGIVERS");
                              setCaregiverComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                caregiverFilter === "ALL_CAREGIVERS" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            All Caregivers
                          </CommandItem>
                          <CommandItem
                            value="ASSIGNED"
                            onSelect={() => {
                              setCaregiverFilter("ASSIGNED");
                              setCaregiverComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                caregiverFilter === "ASSIGNED" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Assigned
                          </CommandItem>
                          <CommandItem
                            value="UNASSIGNED"
                            onSelect={() => {
                              setCaregiverFilter("UNASSIGNED");
                              setCaregiverComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                caregiverFilter === "UNASSIGNED" ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            Unassigned
                          </CommandItem>
                        </CommandGroup>
                        {caregivers && caregivers.filter(c => c.isActive).length > 0 && (
                          <CommandGroup heading="Caregivers">
                            {caregivers.filter(c => c.isActive).map((caregiver) => (
                              <CommandItem
                                key={caregiver.id}
                                value={caregiver.name}
                                onSelect={() => {
                                  setCaregiverFilter(caregiver.id.toString());
                                  setCaregiverComboOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    caregiverFilter === caregiver.id.toString() ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {caregiver.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Results Summary */}
              <div className="mt-4 text-sm text-slate-600">
                Showing {paginatedPatients.length} of {filteredPatients.length} patient{filteredPatients.length === 1 ? '' : 's'}
                {searchText && ` matching "${searchText}"`}
              </div>
            </CardContent>
          </Card>

          {/* Patients Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Patients</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={paginatedPatients && paginatedPatients.length > 0 && paginatedPatients.every(p => selectedPatients.has(p.id))}
                          onCheckedChange={toggleAllPatients}
                          data-testid="checkbox-select-all-patients"
                        />
                      </TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Medicaid ID</TableHead>
                      <TableHead>Assigned Caregiver</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPatients && paginatedPatients.length > 0 ? (
                      paginatedPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPatients.has(patient.id)}
                              onCheckedChange={() => togglePatientSelection(patient.id)}
                              data-testid={`checkbox-select-patient-${patient.id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{patient.name}</TableCell>
                          <TableCell>{patient.medicaidId}</TableCell>
                          <TableCell>
                            {patient.caregiverId ? getCaregiverName(patient.caregiverId) : (
                              <Badge variant="outline">Unassigned</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.address ? (
                              <div className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                <span className="text-sm">{patient.address}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {patient.phoneNumber || (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={patient.isActive ? "secondary" : "outline"}>
                              {patient.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(patient)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                data-testid={`button-edit-patient-${patient.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setPatientToDelete(patient);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-patient-${patient.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <User className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                          <p className="text-lg font-medium text-slate-500">
                            {patients && patients.length > 0 ? "No patients match your filters" : "No patients found"}
                          </p>
                          <p className="text-sm text-slate-400">
                            {patients && patients.length > 0 ? "Try adjusting your search or filters" : "Add your first patient to get started"}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Pagination Controls (matching caregivers table) */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                  <div className="flex items-center text-sm text-slate-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} patients
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                          return false;
                        })
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-slate-400">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className="min-w-[40px]"
                              data-testid={`button-page-${page}`}
                            >
                              {page}
                            </Button>
                          </div>
                        ))
                      }
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{patientToDelete?.name}</strong>? 
              This action cannot be undone. All associated data including check-ins and survey responses may be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (patientToDelete) {
                  deleteMutation.mutate(patientToDelete.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import CSV Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Patients from CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* File Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="csv-upload-modal"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-csv-file-modal"
              />
              <label 
                htmlFor="csv-upload-modal" 
                className="cursor-pointer block"
                data-testid="label-csv-file-modal"
              >
                <Upload className={`h-12 w-12 mx-auto mb-4 ${
                  isDragOver ? 'text-blue-500' : 'text-slate-400'
                }`} />
                <p className={`text-lg font-medium mb-2 ${
                  isDragOver ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {isDragOver ? 'Drop CSV file here' : 'Select or drag CSV file'}
                </p>
                <p className={`text-sm mb-4 ${
                  isDragOver ? 'text-blue-600' : 'text-slate-500'
                }`}>
                  {isDragOver 
                    ? 'Release to upload patient data'
                    : 'Upload a CSV file with patient data to import multiple patients at once'
                  }
                </p>
                {!isDragOver && (
                  <Button type="button" variant="outline">
                    Choose File
                  </Button>
                )}
              </label>
              
              {csvFile && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <IdCard className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">{csvFile.name}</span>
                      <span className="text-sm text-green-600">
                        ({(csvFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCsvFile(null)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* CSV Format Instructions */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-medium text-slate-900 mb-3">CSV Format Requirements</h4>
              <div className="text-sm text-slate-600 space-y-2">
                <p><strong>Required columns:</strong> name</p>
                <p><strong>Optional columns:</strong> medicaidId, address, phoneNumber, emergencyContact, medicalConditions, caregiverPhone, caregiverState, isActive</p>
                <p><strong>Notes:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use caregiverPhone + caregiverState to assign patients to existing caregivers</li>
                  <li>Phone numbers should be 10 digits (formatting will be applied automatically)</li>
                  <li>isActive should be "true" or "false" (defaults to true if not provided)</li>
                  <li>Patients with duplicate Medicaid IDs will be skipped (if Medicaid ID is provided)</li>
                </ul>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  data-testid="button-download-template-modal"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setImportModalOpen(false);
                  setCsvFile(null);
                }}
                disabled={isImporting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCsvImport}
                disabled={!csvFile || isImporting}
                data-testid="button-import-patients"
              >
                {isImporting ? "Importing..." : "Import Patients"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}